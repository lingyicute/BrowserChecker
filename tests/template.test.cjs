const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { generate, outputFile } = require('../scripts/compile-template.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('the checked-in render script is reproducible from its template', () => {
  assert.equal(fs.readFileSync(outputFile, 'utf8'), generate(), 'run node scripts/compile-template.cjs');
});

test('CDN runtime URL and its SRI match the exact locked Vue package', () => {
  const script = html.match(/id="vue-script"[^>]*src="([^"]+)"[^>]*integrity="([^"]+)"/);
  assert.ok(script);
  const { version } = require('vue/package.json');
  assert.equal(script[1], `https://cdn.jsdelivr.net/npm/vue@${version}/dist/vue.runtime.global.prod.js`);
  const bytes = fs.readFileSync(require.resolve('vue/dist/vue.runtime.global.prod.js'));
  assert.equal(script[2], 'sha384-' + createHash('sha384').update(bytes).digest('base64'));
});

test('the runtime favicon is local and the document suppresses external referrers', () => {
  assert.match(html, /<link rel="icon" href="favicon\.svg"/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
});

test('results container renders beneath the fading loading overlay instead of leaving an empty gap', () => {
  const vm = require('node:vm');
  const Vue = require('vue');
  const window = { Vue };
  vm.runInNewContext(generate(), { Vue, window });
  const vnode = window.browserCheckerRender({
    isLoading: true,
    isFadingOut: true,
    detectionError: false,
    scoreColorClass: 'score-green',
    scoreColorGradient: 'none',
    displayScore: 100,
    browserType: 'Chromium',
    isChromeEngine: true,
    chromeVersion: 158,
    recommendation: 'ok',
    userAgent: 'Chrome/158.0.0.0',
    getSupportedFeaturesCount: () => 1,
    getUnsupportedFeaturesCount: () => 0,
    getSupportRate: () => 100,
    getSkippedFeaturesCount: () => 0,
    isMobileDevice: false,
    isIOSDevice: false,
    isFileOrigin: false,
    isSecureContext: true,
    skipNotices: [],
    detectionResults: [],
    getStatusText: () => '支持'
  }, []);
  const [overlay, container] = vnode.children;
  assert.equal(overlay.props['aria-hidden'], 'true');
  assert.match(overlay.props.class, /fade-out/);
  assert.equal(container.props.class, 'container content-loaded');
});
