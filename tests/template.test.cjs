const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { generate, outputFile } = require('../scripts/compile-template.cjs');

test('the checked-in render script is reproducible from its template', () => {
  assert.equal(fs.readFileSync(outputFile, 'utf8'), generate(), 'run node scripts/compile-template.cjs');
});

test('CDN runtime URL and its SRI match the exact locked Vue package', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.match(/id="vue-script"[^>]*src="([^"]+)"[^>]*integrity="([^"]+)"/);
  assert.ok(script);
  const { version } = require('vue/package.json');
  assert.equal(script[1], `https://cdn.jsdelivr.net/npm/vue@${version}/dist/vue.runtime.global.prod.js`);
  const bytes = fs.readFileSync(require.resolve('vue/dist/vue.runtime.global.prod.js'));
  assert.equal(script[2], 'sha384-' + createHash('sha384').update(bytes).digest('base64'));
});
