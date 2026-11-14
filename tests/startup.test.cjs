const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('startup.js', 'utf8');

function startupHarness({ withDom = true } = {}) {
  const errorEl = { hidden: true };
  const classes = new Set();
  const winListeners = new Map();
  const docListeners = new Map();
  const timers = new Map();
  let nextTimer = 0;

  const add = (map) => (name, fn) => {
    if (!map.has(name)) map.set(name, new Set());
    map.get(name).add(fn);
  };
  const remove = (map) => (name, fn) => map.get(name)?.delete(fn);

  const window = {
    addEventListener: add(winListeners),
    removeEventListener: remove(winListeners)
  };
  const document = {
    body: withDom ? { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } } : null,
    getElementById: id => (withDom && id === 'startup-error' ? errorEl : null),
    addEventListener: add(docListeners),
    removeEventListener: remove(docListeners)
  };
  const context = {
    window,
    document,
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };

  vm.runInNewContext(source, context);
  return {
    errorEl,
    classes,
    timers,
    winListeners,
    docListeners,
    complete: () => window.browserCheckerStartup.complete(),
    emitWindowError: event => { for (const fn of winListeners.get('error') || []) fn(event); },
    emitCsp: event => { for (const fn of docListeners.get('securitypolicyviolation') || []) fn(event); }
  };
}

test('startup guard fails immediately on enforced script-src eval CSP violation', () => {
  const h = startupHarness();
  h.emitCsp({ disposition: 'report', effectiveDirective: 'script-src', blockedURI: 'eval' });
  h.emitCsp({ disposition: 'enforce', effectiveDirective: 'img-src', blockedURI: 'data' });
  assert.equal(h.errorEl.hidden, true);
  assert.equal(h.classes.has('startup-failed'), false);

  h.emitCsp({ disposition: 'enforce', effectiveDirective: 'script-src', blockedURI: 'eval' });
  assert.equal(h.errorEl.hidden, false);
  assert.equal(h.classes.has('startup-failed'), true);
  assert.equal(h.timers.size, 0);
});

test('startup guard matches script targets and relative or absolute filenames', () => {
  for (const event of [
    { target: { id: 'vue-script' } },
    { target: { id: 'app-script' } },
    { filename: 'app.js' },
    { filename: 'https://example.com/vue.global.prod.js?v=1' }
  ]) {
    const h = startupHarness();
    h.emitWindowError(event);
    assert.equal(h.errorEl.hidden, false);
    assert.equal(h.classes.has('startup-failed'), true);
  }
});

test('startup completion clears errors, timers, listeners and handles missing DOM nodes', () => {
  const h = startupHarness();
  for (const [, timer] of [...h.timers]) timer.fn();
  assert.equal(h.errorEl.hidden, false);
  h.complete();
  assert.equal(h.errorEl.hidden, true);
  assert.equal(h.classes.has('startup-failed'), false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.winListeners.get('error').size, 0);
  assert.equal(h.docListeners.get('securitypolicyviolation').size, 0);

  const missingDom = startupHarness({ withDom: false });
  assert.doesNotThrow(() => missingDom.emitWindowError({ target: { id: 'app-script' } }));
  assert.doesNotThrow(() => missingDom.complete());
});
