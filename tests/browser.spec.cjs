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
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { get() { throw new Error('test initialization error'); } });
  });
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


test('optional environment and animation failures preserve the completed result', async ({ page }) => {
  await page.addInitScript(() => {
    window.matchMedia = () => { throw new Error('blocked display mode query'); };
    window.requestAnimationFrame = () => { throw new Error('blocked animation'); };
    Object.defineProperty(navigator, 'userAgentData', { get() { throw new Error('blocked client hints'); } });
  });
  await ready(page);
  await expect(page.locator('.score-text')).toHaveText('浏览器得分');
  await expect(page.locator('.detail-item')).toHaveCount(60);
  await expect(page.locator('.score')).toHaveText(/^\d+$/);
});

test('explicitly disabled permissions are skipped on browsers exposing policy introspection', async ({ page }) => {
  await ready(page, '/?permissions=deny');
  const introspection = await page.evaluate(() => {
    const policy = document.permissionsPolicy || document.featurePolicy;
    return !!(policy && policy.features && policy.features().includes('geolocation'));
  });
  const status = feature(page, 'Geolocation API').locator('.detail-status');
  if (introspection) {
    await expect(status).toHaveText('已跳过');
    await expect(feature(page, 'Geolocation API').locator('.detail-reason')).toContainText('Permissions Policy');
  } else {
    // 无反射 API 的引擎继续检查 API 是否暴露，不能虚构策略状态。
    await expect(status).not.toHaveText('已跳过');
  }
});

test('real IndexedDB probe succeeds, removes its database and preserves existing data', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.container')).toHaveClass(/content-loaded/);
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('browserchecker-user-data');
    request.onupgradeneeded = () => request.result.createObjectStore('saved').put('keep', 'key');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { request.result.close(); resolve(); };
  }));
  await ready(page);
  await expect(feature(page, 'IndexedDB').locator('.detail-status')).toHaveText('支持');
  const saved = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('browserchecker-user-data');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('saved');
      const read = transaction.objectStore('saved').get('key');
      transaction.oncomplete = () => { database.close(); resolve(read.result); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  }));
  expect(saved).toBe('keep');
  // databases() 是辅助验证，不是生产检测的依赖。
  if (await page.evaluate(() => typeof indexedDB.databases === 'function')) {
    await expect.poll(() => page.evaluate(async () =>
      (await indexedDB.databases()).filter(db => db.name.startsWith('__browserchecker_probe__')).length
    )).toBe(0);
  }
});

for (const mode of ['getter', 'open', 'timeout']) {
  test(`IndexedDB ${mode} restrictions do not produce a false supported result`, async ({ page }) => {
    await page.addInitScript(mode => {
      Object.defineProperty(window, 'indexedDB', {
        get() {
          if (mode === 'getter') throw new DOMException('blocked', 'SecurityError');
          return { open() {
            if (mode === 'open') throw new DOMException('blocked', 'SecurityError');
            return {};
          } };
        }
      });
    }, mode);
    await ready(page);
    await expect(feature(page, 'IndexedDB').locator('.detail-status')).toHaveText('已跳过');
    await expect(page.locator('.score-text')).toHaveText('浏览器得分');
  });
}


test('details remain inside their panel on narrow screens and can be scrolled by keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 720 });
  await ready(page);
  const region = page.getByRole('region', { name: '详细检测结果' });
  await page.keyboard.press('Tab');
  await expect(region).toBeFocused();
  expect(await region.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.locator('.detail-name').evaluateAll(elements => elements.every(el =>
    el.scrollWidth <= el.clientWidth
  ))).toBe(true);
  await page.keyboard.press('End');
  await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});

test('temporary local storage keys are collision-safe and cleaned after a real browser probe', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.setItem('__browserchecker_probe__', 'keep');
    sessionStorage.setItem('__browserchecker_probe__', 'keep');
  });
  await ready(page);
  await expect(feature(page, 'Storage API').locator('.detail-status')).toHaveText('支持');
  expect(await page.evaluate(() => [localStorage, sessionStorage].map(storage => ({
    saved: storage.getItem('__browserchecker_probe__'),
    probes: Object.keys(storage).filter(key => key.startsWith('__browserchecker_probe__'))
  })))).toEqual([
    { saved: 'keep', probes: ['__browserchecker_probe__'] },
    { saved: 'keep', probes: ['__browserchecker_probe__'] }
  ]);
});

for (const property of ['mobile', 'maxTouchPoints', 'standalone']) {
  test(`blocked optional ${property} does not abort real-browser detection`, async ({ page }) => {
    await page.addInitScript(property => {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15' });
      const hints = {};
      Object.defineProperty(navigator, 'userAgentData', { value: hints });
      Object.defineProperty(property === 'mobile' ? hints : navigator, property, {
        get() { throw new Error('blocked optional property'); }
      });
    }, property);
    await ready(page);
    await expect(page.locator('.score-text')).toHaveText('浏览器得分');
    await expect(page.locator('.detail-item')).toHaveCount(60);
  });
}

test('score reaches its final value if animation frames silently stop mid-animation', async ({ page }) => {
  await page.addInitScript(() => {
    let frames = 0;
    window.requestAnimationFrame = callback => {
      if (++frames === 1) setTimeout(() => callback(performance.now()), 0);
      return frames;
    };
  });
  await ready(page);
  const unsupported = await page.locator('.detail-status:not(.supported):not(.skipped)').count();
  await expect(page.locator('.score')).toHaveText(String(Math.max(0, 100 - unsupported * 2)));
});

test('cleanup failures in image probes do not leave the page loading indefinitely', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLImageElement.prototype.removeAttribute = () => { throw new Error('blocked image cleanup'); };
  });
  await ready(page);
  await expect(feature(page, '支持图像格式 WebP').locator('.detail-status')).toHaveText('支持');
  await expect(feature(page, '支持图像格式 AVIF').locator('.detail-status')).toHaveText('支持');
  expect(errors).toEqual([]);
});

test('upgrade transaction quota failure is skipped even when open reports AbortError', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: {
      open() {
        const transaction = { error: new DOMException('full', 'QuotaExceededError') };
        const request = {
          transaction,
          result: { createObjectStore: () => ({ put() {} }) }
        };
        setTimeout(() => {
          request.onupgradeneeded({ oldVersion: 0 });
          if (transaction.onabort) transaction.onabort();
          request.error = new DOMException('aborted upgrade', 'AbortError');
          request.onerror();
        }, 0);
        return request;
      },
      deleteDatabase() {}
    } });
  });
  await ready(page);
  await expect(feature(page, 'IndexedDB').locator('.detail-status')).toHaveText('已跳过');
  await expect(page.locator('.score-text')).toHaveText('浏览器得分');
});

test('non-callable API placeholders are unsupported in real browser results', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0) Chrome/145.0.0.0' });
    for (const name of ['share', 'getGamepads', 'requestMIDIAccess', 'clipboard']) {
      Object.defineProperty(navigator, name, { value: null });
    }
    Object.defineProperty(window, 'showOpenFilePicker', { value: undefined });
    Object.defineProperty(document, 'startViewTransition', { value: false });
  });
  await ready(page);
  for (const name of ['Web Share API', 'Gamepad API', 'Web MIDI API', 'Clipboard API',
    'File System Access API', 'View Transitions API']) {
    await expect(feature(page, name).locator('.detail-status')).toHaveText('不支持');
  }
});

test('user-agent markup is displayed as text, never interpreted as HTML', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Chrome/145.0.0.0 <img src=x onerror="window.uaInjected=true">'
    });
  });
  await ready(page);
  await expect(page.locator('.user-agent')).toContainText('<img src=x');
  await expect(page.locator('.user-agent img')).toHaveCount(0);
  expect(await page.evaluate(() => window.uaInjected)).toBeUndefined();
});

for (const value of [null, {}]) {
  test(`remaining API placeholders (${JSON.stringify(value)}) are not reported as supported`, async ({ page }) => {
    const capabilities = require('./fixtures/capabilities.cjs');
    // 保留 Performance 对象：浏览器测试工具自身也依赖它；该项由 VM 覆盖。
    const items = capabilities.filter(item => item.property !== 'performance');
    await page.addInitScript(({ items, value }) => {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0) Chrome/145.0.0.0' });
      for (const item of items) {
        const object = item.scope === 'element' ? HTMLElement.prototype
          : item.scope === 'window' ? window : navigator;
        Object.defineProperty(object, item.property, { configurable: true, value });
        if (item.alternate) Object.defineProperty(object, item.alternate, { configurable: true, value });
      }
    }, { items, value });
    await ready(page);
    for (const item of items) {
      await expect(feature(page, item.name).locator('.detail-status')).toHaveText('不支持');
    }
  });
}

for (const errorName of ['SecurityError', 'NotAllowedError', 'TypeError']) {
  test(`API access ${errorName} uses the appropriate result state`, async ({ page }) => {
    await page.addInitScript(errorName => {
      for (const property of ['clipboard', 'serviceWorker']) {
        Object.defineProperty(navigator, property, { get() { throw new DOMException('blocked', errorName); } });
      }
    }, errorName);
    await ready(page);
    for (const name of ['Clipboard API', 'Service Worker']) {
      await expect(feature(page, name).locator('.detail-status')).toHaveText(errorName === 'TypeError' ? '不支持' : '已跳过');
    }
    const unsupported = await page.locator('.detail-status:not(.supported):not(.skipped)').count();
    await expect(page.locator('.score')).toHaveText(String(Math.max(0, 100 - unsupported * 2)));
  });
}

test('disabling CSS animations without reduced-motion leaves all completed content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; }' });
  await expect(page.locator('.loading-overlay')).toHaveCount(0);
  for (const selector of ['.block-score', '.block-engine', '.block-features', '.block-details', '.detail-item']) {
    const opacities = await page.locator(selector).evaluateAll(elements => elements.map(el => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(0);
    expect(opacities.every(value => value === '1')).toBe(true);
  }
});

for (const mode of ['getter', 'method']) {
  test(`customElements ${mode} restrictions cannot crash template compilation`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(mode => {
      if (mode === 'getter') {
        Object.defineProperty(window, 'customElements', { get() { throw new DOMException('blocked', 'SecurityError'); } });
      } else {
        customElements.get = () => { throw new DOMException('blocked', 'SecurityError'); };
      }
    }, mode);
    await ready(page);
    await expect(feature(page, 'Web Components').locator('.detail-status')).toHaveText(mode === 'getter' ? '已跳过' : '支持');
    await expect(page.locator('.detail-item')).toHaveCount(60);
    expect(errors).toEqual([]);
  });
}

for (const [marker, category, penalty, warning] of [
  ['Quark', '国产浏览器', 30, '你正在使用国产定制浏览器，它们基于主流浏览器二次开发，往往充斥着各类广告和骚扰内容，且存在较大的隐私和安全风险。有些国产浏览器甚至在网页画面中动态插入广告。梨建议你切换到原生 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更清爽、稳定和安全的体验。'],
  ['MicroMessenger', '套壳浏览器', 20, '你正在使用 App 内置浏览器，它们通常更新不及时、受到功能上的限制，且存在较大的隐私和安全风险。梨建议你使用原生 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更稳定和安全的体验。']
]) {
  test(`protected ${category} warning, version and penalties remain visible and unchanged`, async ({ page }) => {
    await page.addInitScript(marker => {
      Object.defineProperty(navigator, 'userAgent', { value: `Mozilla/5.0 (Windows NT 10.0) ${marker} Chrome/145.0.0.0 Safari/537.36` });
    }, marker);
    await ready(page);
    await expect(page.locator('.warning-content h3')).toHaveText(`检测到${category}`);
    await expect(page.locator('.warning-content p')).toHaveText(warning);
    await expect(page.locator('.block-warning')).toHaveCSS('opacity', '1');
    await expect(page.locator('.browser-info')).toContainText('疑似恶意伪装成 145 的 109');
    await expect(page.locator('.engine-recommendation')).toHaveText('你的浏览器疑似在恶意伪装更高版本，实际使用的可能是严重过时的 Chromium 内核（估测为 109 左右），存在重大安全风险。梨强烈建议你立即切换到原生 Chrome、Iridium、Brave 或 Firefox 浏览器。');
    const unsupported = await page.locator('.detail-status:not(.supported):not(.skipped)').count();
    await expect(page.locator('.score')).toHaveText(String(Math.max(0, 100 - penalty - 50 - unsupported * 2)));
  });
}
