const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const vueURL = 'https://cdn.jsdelivr.net/npm/vue@3.5.44/dist/vue.global.prod.js';
const feature = (page, name) => page.locator('.detail-item').filter({ has: page.locator('.detail-name', { hasText: name }) });

// 使用锁定版本的同一份 npm 发布文件，测试不依赖外网，但仍由浏览器验证 SRI。
test.beforeEach(async ({ page }) => {
  await page.route(vueURL, route => route.fulfill({
    path: require.resolve('vue/dist/vue.global.prod.js'),
    contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' }
  }));
});

async function ready(page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.container')).toHaveClass(/content-loaded/);
  await expect(page.locator('.loading-overlay')).toHaveCount(0);
}

test('complete detection, decode real image samples, and show consistent statistics', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page.locator('.detail-item')).toHaveCount(60);
  await expect(feature(page, '支持图像格式 WebP').locator('.detail-status')).toHaveText('支持');
  await expect(feature(page, '支持图像格式 AVIF').locator('.detail-status')).toHaveText('支持');
  await expect(page.locator('.score')).toHaveText(/^\d+$/);
  const states = await page.locator('.detail-status').allTextContents();
  const supported = states.filter(s => s === '支持').length;
  const unsupported = states.filter(s => s === '不支持').length;
  const skipped = states.filter(s => s === '已跳过').length;
  const stats = await page.locator('.stat-value').allTextContents();
  expect(stats.slice(0, 3)).toEqual([String(supported), String(unsupported), `${Math.round(supported / (supported + unsupported) * 100)}%`]);
  if (skipped) expect(stats[3]).toBe(String(skipped));
  expect(errors).toEqual([]);
});

test('missing animation API preserves detection and applies only the feature deduction', async ({ page }) => {
  await page.addInitScript(() => { delete window.requestAnimationFrame; });
  await ready(page);
  await expect(feature(page, 'requestAnimationFrame').locator('.detail-status')).toHaveText('不支持');
  await expect(page.locator('.score-text')).toHaveText('浏览器得分');
  const unsupported = await page.locator('.detail-status:not(.supported):not(.skipped)').count();
  await expect(page.locator('.score')).toHaveText(String(Math.max(0, 100 - unsupported * 2)));
});

test('initialization exceptions end loading without fabricated scores', async ({ page }) => {
  await page.addInitScript(() => { window.matchMedia = () => { throw new Error('test initialization error'); }; });
  await ready(page);
  await expect(page.locator('.score')).toHaveText('—');
  await expect(page.locator('.score-text')).toHaveText('检测失败');
  await expect(page.locator('.engine-recommendation')).toContainText('刷新页面重试');
  await expect(page.locator('.block-features')).toHaveCount(0);
});

for (const target of ['vue', 'app']) {
  test(`${target} resource failure shows an actionable startup error`, async ({ page }) => {
    await page.route(target === 'vue' ? vueURL : '**/app.js', route => route.abort());
    await page.goto('/');
    await expect(page.locator('#startup-error')).toBeVisible();
    await expect(page.locator('#startup-error a')).toHaveText('刷新重试');
    await expect(page.locator('.container')).not.toBeVisible();
  });
}

test('SRI rejects tampered Vue instead of executing it', async ({ page }) => {
  await page.route(vueURL, route => route.fulfill({
    body: 'window.tampered = true;', contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' }
  }));
  await page.goto('/');
  await expect(page.locator('#startup-error')).toBeVisible();
  expect(await page.evaluate(() => window.tampered)).toBeUndefined();
});

test('CSP-blocked image probes are skipped, not penalized as unsupported codecs', async ({ page }) => {
  await ready(page, '/?csp=images');
  for (const name of ['支持图像格式 WebP', '支持图像格式 AVIF']) {
    await expect(feature(page, name).locator('.detail-status')).toHaveText('已跳过');
    await expect(feature(page, name).locator('.detail-reason')).toContainText('CSP');
  }
});

test('timed-out image probes are skipped and do not hang loading', async ({ page }) => {
  await page.addInitScript(() => {
    window.Image = class { removeAttribute() {} };
  });
  await ready(page);
  await expect(feature(page, '支持图像格式 WebP').locator('.detail-reason')).toContainText('超时');
  await expect(feature(page, '支持图像格式 AVIF').locator('.detail-status')).toHaveText('已跳过');
});

test('blocked storage getter is not reported as supported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await ready(page);
  await expect(feature(page, 'Storage API').locator('.detail-status')).toHaveText('已跳过');
});

test('legacy orientation is not mistaken for the modern API', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(screen, 'orientation', { value: undefined });
    Object.defineProperty(window, 'orientation', { value: 0 });
  });
  await ready(page);
  await expect(feature(page, 'Screen Orientation API').locator('.detail-status')).toHaveText('不支持');
});

test('reduced motion shows results without hiding content or leaving animated loaders', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 720 });
  await ready(page);
  await expect(page.locator('.block-engine')).toHaveCSS('opacity', '1');
  await expect(page.locator('.circle-loader')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.score')).toHaveText(/^\d+$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('direct file access still works and skips origin-dependent APIs', async ({ page }) => {
  await ready(page, `file://${path.resolve('index.html')}`);
  await expect(page.locator('.notice-local-file')).toBeVisible();
  await expect(feature(page, 'Service Worker').locator('.detail-status')).toHaveText('已跳过');
});

test('disabled JavaScript gets an explicit message, not raw template content', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await expect(page.locator('noscript .startup-error')).toBeVisible();
  await expect(page.locator('.container')).not.toBeVisible();
  await context.close();
});

test('strict CSP unsupported by the runtime compiler produces a startup message', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?csp=strict');
  await page.clock.fastForward(16000);
  await expect(page.locator('#startup-error')).toBeVisible();
});

test('an empty application script is caught by the startup timeout', async ({ page }) => {
  await page.clock.install();
  await page.route('**/app.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
  await page.goto('/');
  await page.clock.fastForward(16000);
  await expect(page.locator('#startup-error')).toBeVisible();
});

test('a late successful startup clears a previous timeout message', async ({ page }) => {
  await page.clock.install();
  const appSource = fs.readFileSync('app.js', 'utf8');
  await page.route('**/app.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
  await page.goto('/');
  await page.clock.fastForward(16000);
  await expect(page.locator('#startup-error')).toBeVisible();
  await page.addScriptTag({ content: appSource });
  await page.clock.runFor(3000);
  await expect(page.locator('#startup-error')).toBeHidden();
  await expect(page.locator('.container')).toBeVisible();
  await expect(page.locator('.detail-item')).toHaveCount(60);
});

test('real insecure HTTP origin skips APIs requiring a secure context', async ({ page }) => {
  const files = { '/': 'index.html', '/style.css': 'style.css', '/startup.js': 'startup.js', '/app.js': 'app.js' };
  await page.route('http://browserchecker.test/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    const file = files[pathname];
    if (!file) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: path.resolve(file), contentType: file.endsWith('.js') ? 'application/javascript' : (file.endsWith('.css') ? 'text/css' : 'text/html') });
  });
  await ready(page, 'http://browserchecker.test/');
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await expect(page.locator('.notice-insecure')).toBeVisible();
  for (const name of ['Geolocation API', 'Gamepad API', 'Service Worker']) {
    await expect(feature(page, name).locator('.detail-status')).toHaveText('已跳过');
  }
});

test('iOS Firefox UA renders Firefox without claiming a Chromium engine', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/143.0 Mobile/15E148 Safari/605.1.15' });
  });
  await ready(page);
  await expect(page.locator('.browser-info')).toContainText('浏览器类型：Firefox');
  await expect(page.locator('.browser-info')).not.toContainText('Chromium 内核版本：');
  await expect(page.locator('.mobile-notice').first()).toContainText('iOS');
});
