const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'startup.js'), 'utf8');

function startupHarness({ withDom = true } = {}) {
  const fallback = { hidden: false };
  const loader = { hidden: true };
  const app = { hidden: true };
  const scripts = {
    'vue-script': { src: 'https://cdn.example/vue.runtime.global.prod.js' },
    'render-script': { src: 'file:///offline/render-renamed.js' },
    'app-script': { src: 'file:///offline/checker-main.js' }
  };
  const elements = { 'startup-error': fallback, 'startup-loading': loader, app, ...scripts };
  const timers = new Map();
  const listeners = new Set();
  let nextTimer = 0;
  const window = {
    addEventListener(name, fn, capture) {
      assert.equal(name, 'error');
      assert.equal(capture, true);
      listeners.add(fn);
    },
    removeEventListener(name, fn, capture) {
      assert.equal(name, 'error');
      assert.equal(capture, true);
      listeners.delete(fn);
    }
  };
  vm.runInNewContext(source, {
    window,
    document: { getElementById: id => withDom ? elements[id] || null : null },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  });
  return {
    fallback, loader, app, scripts, timers, listeners,
    mounted: () => window.browserCheckerStartup.mounted(),
    fail: () => window.browserCheckerStartup.fail(),
    complete: () => window.browserCheckerStartup.complete(),
    timeout: () => [...timers.values()].forEach(timer => timer.fn()),
    emitError: event => { for (const fn of listeners) fn(event); }
  };
}

test('startup loader yields to the app on mount and completion releases the watchdog', () => {
  const h = startupHarness();
  assert.equal(h.fallback.hidden, true);
  assert.equal(h.loader.hidden, false);
  assert.equal(h.app.hidden, true);
  assert.equal([...h.timers.values()][0].delay, 15000);
  h.mounted();
  assert.equal(h.loader.hidden, true);
  assert.equal(h.app.hidden, false);
  assert.equal(h.timers.size, 1);
  h.complete();
  assert.equal(h.fallback.hidden, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
});

test('startup errors match actual script targets and URLs, including renamed offline files', () => {
  for (const id of ['vue-script', 'render-script', 'app-script']) {
    for (const byTarget of [false, true]) {
      const h = startupHarness();
      const script = h.scripts[id];
      h.emitError(byTarget ? { target: script } : { filename: script.src });
      assert.equal(h.fallback.hidden, false);
      assert.equal(h.loader.hidden, true);
      assert.equal(h.app.hidden, true);
      assert.equal(h.timers.size, 0);
      assert.equal(h.listeners.size, 0);
    }
  }
});

test('same-named extension scripts and malformed error events do not hide the checker', () => {
  const h = startupHarness();
  for (const event of [undefined, {}, { filename: '' }, { filename: 'chrome-extension://abc/app.js' },
    { filename: 'https://other.example/vue.runtime.global.prod.js' }, { target: { id: 'app-script' } }]) {
    assert.doesNotThrow(() => h.emitError(event));
  }
  assert.equal(h.fallback.hidden, true);
  assert.equal(h.loader.hidden, false);
  assert.equal(h.timers.size, 1);
});

test('late completion restores results after timeout; missing DOM nodes are harmless', () => {
  const h = startupHarness();
  h.mounted();
  h.timeout();
  assert.equal(h.fallback.hidden, false);
  assert.equal(h.app.hidden, true);
  h.mounted();
  assert.equal(h.app.hidden, true);
  h.complete();
  assert.equal(h.fallback.hidden, true);
  assert.equal(h.loader.hidden, true);
  assert.equal(h.app.hidden, false);
  const postMountFail = startupHarness();
  postMountFail.mounted();
  assert.equal(postMountFail.app.hidden, false);
  postMountFail.fail();
  assert.equal(postMountFail.fallback.hidden, false);
  assert.equal(postMountFail.loader.hidden, true);
  assert.equal(postMountFail.app.hidden, true);
  const noDom = startupHarness({ withDom: false });
  assert.doesNotThrow(() => noDom.timeout());
  assert.doesNotThrow(() => noDom.complete());
});
