const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const source = fs.readFileSync('app.js', 'utf8');

function storage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values
  };
}

function harness() {
  let state, mounted;
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const images = [];
  const context = {
    console: { log() {}, error() {} },
    navigator: { userAgent: 'Chrome/145.0.0.0', maxTouchPoints: 0 },
    location: { protocol: 'https:' },
    screen: { orientation: { type: 'landscape-primary', angle: 0 } },
    HTMLElement: { prototype: {} }, HTMLScriptElement: {},
    CSS: { supports: () => true }, URL: {},
    Image: class {
      constructor() { images.push(this); }
      removeAttribute() {}
    },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    document: {
      addEventListener: (name, fn) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(fn);
      },
      removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
      querySelector: () => ({ classList: { add() {} } }),
      createElement: () => ({ getContext: () => null, canPlayType: () => '' })
    },
    Vue: {
      ref: value => ({ value }),
      computed: getter => ({ get value() { return getter(); } }),
      onMounted: fn => { mounted = fn; },
      createApp: options => ({ mount() { state = options.setup(); } })
    }
  };
  context.window = {
    isSecureContext: true,
    matchMedia: () => ({ matches: false }),
    localStorage: storage(), sessionStorage: storage(),
    CSS: context.CSS, Promise
  };
  // 仅在测试 VM 中暴露闭包，不增加生产脚本的公共 API。
  const instrumented = source.replace('    return {\n      userAgent,', `
    globalThis.internals = { detectEnvironment, getSkipReason, checkModernFeatures,
      detectBrowserInfo, generateRecommendation, testImageDecode, testStorage, testIndexedDB,
      releaseWebGLContext, animateScore };
    return {\n      userAgent,`);
  vm.runInNewContext(instrumented, context);
  return { context, state, api: context.internals, timers, images, listeners,
    mounted: () => mounted(),
    runTimers(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay) { timers.delete(id); timer.fn(); }
      }
    }
  };
}

function completeImages(h) {
  for (const image of h.images) {
    image.naturalWidth = image.naturalHeight = 1;
    if (image.onload) image.onload();
  }
}

async function detect(h) {
  h.api.detectEnvironment();
  const pending = h.api.checkModernFeatures();
  completeImages(h);
  await pending;
  return name => h.state.detectionResults.value.find(item => item.name === name);
}

test('protected browser policy and warning template remain byte-identical except FxiOS recognition', () => {
  const lock = require('./fixtures/policy-lock.json');
  const hash = text => createHash('sha256').update(text).digest('hex');
  const policy = source.slice(source.indexOf('    // 检测浏览器类型和版本'), source.indexOf('    // 收尾'))
    .replace('/firefox|fxios/i.test(ua)', '/firefox/i.test(ua)');
  assert.equal(hash(policy), lock.policySha256);
  const html = fs.readFileSync('index.html', 'utf8');
  const warning = html.slice(html.indexOf('      <!-- 国产/套壳浏览器警告块 -->'), html.indexOf('      <!-- 内核版本及建议块 -->'));
  assert.equal(hash(warning), lock.warningSha256);
});

test('protected classification, deduction and disguised-version boundaries (378 combinations)', () => {
  const h = harness();
  const markers = ['HeyTap', 'Quark', 'baidu', 'xweb', 'miuibrowser', 'mibrowser', 'WeChat', 'MicroMessenger', 'QQ'];
  for (const marker of markers) {
    for (const version of [109, 110, 111, 119, 120, 129, 130, 137, 138, 144, 145, 150, 151, 999]) {
      for (const initial of [100, 90, 10]) {
        h.context.navigator.userAgent = `${marker} Chrome/${version}.0.0.0 Safari/537.36`;
        h.state.totalScore.value = initial;
        h.api.detectBrowserInfo();
        const webview = /WeChat|MicroMessenger|QQ/.test(marker);
        assert.equal(h.state.browserType.value, webview ? '套壳浏览器' : '国产浏览器');
        assert.equal(h.state.totalScore.value, Math.max(0, initial - (webview ? 20 : 30) - (version === 110 ? 40 : 50)));
        assert.equal(h.state.chromeVersion.value, version > 110 ? `疑似恶意伪装成 ${version} 的 109` : version);
        assert.ok(h.state.switchSuggestion.value.length > 0);
        if (version > 110) assert.match(h.state.recommendation.value, /疑似在恶意伪装/);
      }
    }
  }
  h.context.navigator.userAgent = 'Quark QQ Chrome/145.0';
  h.state.totalScore.value = 100;
  h.api.detectBrowserInfo();
  assert.equal(h.state.browserType.value, '套壳浏览器');
  assert.equal(h.state.totalScore.value, 30);
});

test('Chromium version score boundaries remain unchanged', () => {
  for (const [version, penalty] of [[109,50],[110,40],[119,40],[120,30],[129,30],[130,20],[137,20],[138,10],[144,10],[145,0],[150,0],[151,0]]) {
    const h = harness();
    h.context.navigator.userAgent = `Chrome/${version}.0.0.0`;
    h.api.detectBrowserInfo();
    assert.equal(h.state.totalScore.value, 100 - penalty);
  }
});

test('iOS Firefox is not Safari or Chromium', () => {
  const h = harness();
  h.context.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/143.0 Mobile/15E148 Safari/605.1.15';
  h.api.detectEnvironment();
  h.api.detectBrowserInfo();
  assert.equal(h.state.browserType.value, 'Firefox');
  assert.equal(h.state.isChromeEngine.value, false);
  assert.equal(h.state.isIOSDevice.value, true);
});

for (const [name, ua, touches, ios, mobile] of [
  ['iPad desktop UA', 'Macintosh', 5, true, true],
  ['Mac', 'Macintosh', 0, false, false],
  ['Android tablet', 'Linux; Android 15', 5, false, true],
  ['Linux', 'X11; Linux x86_64', 0, false, false]
]) {
  test(`environment: ${name}`, () => {
    const h = harness();
    Object.assign(h.context.navigator, { userAgent: ua, maxTouchPoints: touches });
    h.api.detectEnvironment();
    assert.equal(h.state.isIOSDevice.value, ios);
    assert.equal(h.state.isMobileDevice.value, mobile);
  });
}

test('secure and file-origin exclusions; localhost remains eligible', () => {
  const h = harness();
  h.context.window.isSecureContext = false;
  h.api.detectEnvironment();
  assert.match(h.api.getSkipReason({ secure: true }), /安全上下文/);
  h.context.location.protocol = 'file:';
  h.context.window.isSecureContext = true;
  h.api.detectEnvironment();
  assert.match(h.api.getSkipReason({ secure: true }), /file:/);
  h.context.location.protocol = 'http:';
  h.api.detectEnvironment();
  assert.equal(h.api.getSkipReason({ secure: true }), null);
});

test('iOS notification exception distinguishes tabs from standalone apps', async () => {
  const h = harness();
  h.context.navigator.userAgent = 'iPhone';
  let find = await detect(h);
  assert.equal(find('Web Notifications').skipped, true);
  h.context.navigator.standalone = true;
  find = await detect(h);
  assert.equal(find('Web Notifications').skipped, false);
});

test('storage probe preserves existing values, including colliding probe keys', () => {
  const h = harness();
  for (const name of ['localStorage', 'sessionStorage']) {
    h.context.window[name].setItem('__browserchecker_probe__', 'keep');
    h.context.window[name].setItem('user-data', 'unchanged');
  }
  assert.equal(h.api.testStorage(), true);
  for (const name of ['localStorage', 'sessionStorage']) {
    assert.deepEqual([...h.context.window[name].values], [['__browserchecker_probe__', 'keep'], ['user-data', 'unchanged']]);
  }
});

for (const name of ['SecurityError', 'QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']) {
  test(`storage ${name} is skipped rather than unsupported`, () => {
    const h = harness();
    h.context.window.sessionStorage.setItem = () => { throw { name }; };
    assert.equal(h.api.testStorage().skipped, true);
    assert.equal(h.context.window.localStorage.values.size, 0);
  });
}

test('blocked storage getter is skipped; absent storage is unsupported', () => {
  const h = harness();
  Object.defineProperty(h.context.window, 'localStorage', { configurable: true, get() { throw { name: 'SecurityError' }; } });
  assert.equal(h.api.testStorage().skipped, true);
  delete h.context.window.localStorage;
  assert.equal(h.api.testStorage(), false);
});

test('silent storage write failures are unsupported and cleaned up', () => {
  const h = harness();
  h.context.window.localStorage.setItem = () => {};
  assert.equal(h.api.testStorage(), false);
  assert.equal(h.context.window.localStorage.values.size, 0);
});

for (const outcome of ['load', 'error', 'timeout', 'csp']) {
  test(`image ${outcome} settles once and cleans handlers, timers and CSP listener`, async () => {
    const h = harness();
    const promise = h.api.testImageDecode('data:image/webp;base64,test');
    const image = h.images[0];
    if (outcome === 'load') completeImages(h);
    if (outcome === 'error') { image.onerror(); h.runTimers(100); }
    if (outcome === 'timeout') h.runTimers(2000);
    if (outcome === 'csp') {
      image.onerror();
      for (const fn of h.listeners.get('securitypolicyviolation')) {
        fn({ effectiveDirective: 'img-src', blockedURI: 'data', disposition: 'enforce' });
      }
    }
    const result = await promise;
    if (outcome === 'load') assert.equal(result, true);
    else if (outcome === 'error') assert.equal(result, false);
    else assert.equal(result.skipped, true);
    assert.equal(h.timers.size, 0);
    assert.equal(h.listeners.get('securitypolicyviolation').size, 0);
    assert.equal(image.onload, null);
    assert.equal(image.onerror, null);
  });
}

test('report-only or unrelated CSP violations do not skip a valid image', async () => {
  const h = harness();
  const promise = h.api.testImageDecode('data:image/webp;base64,test');
  for (const fn of h.listeners.get('securitypolicyviolation')) {
    fn({ effectiveDirective: 'img-src', blockedURI: 'data', disposition: 'report' });
    fn({ effectiveDirective: 'script-src', blockedURI: 'data', disposition: 'enforce' });
  }
  completeImages(h);
  assert.equal(await promise, true);
});

for (const mode of ['webgl2', 'webgl', 'experimental-webgl', 'none']) {
  test(`WebGL ${mode}: correct result and immediate resource release`, async () => {
    const h = harness();
    let released = 0;
    h.context.document.createElement = () => ({ getContext: name => name === mode ? {
      getExtension: () => ({ loseContext: () => { released++; } })
    } : null });
    const find = await detect(h);
    const result = find('WebGL 2.0');
    assert.equal(result.supported, mode === 'webgl2');
    assert.equal(result.skipped, mode === 'none');
    assert.equal(released, mode === 'none' ? 0 : 1);
  });
}

test('legacy window.orientation does not imply modern Screen Orientation support', async () => {
  const h = harness();
  h.context.screen = {};
  h.context.window.orientation = 0;
  const find = await detect(h);
  assert.equal(find('Screen Orientation API').supported, false);
});

test('Geolocation and Gamepad are skipped on insecure origins', async () => {
  const h = harness();
  h.context.window.isSecureContext = false;
  const find = await detect(h);
  assert.equal(find('Geolocation API').skipped, true);
  assert.equal(find('Gamepad API').skipped, true);
});

test('feature score, sorting, support rate and notice counts exclude skipped items', async () => {
  const h = harness();
  await detect(h);
  const items = h.state.detectionResults.value;
  assert.equal(items.length, 60);
  const supported = items.filter(i => i.supported).length;
  const unsupported = items.filter(i => !i.supported && !i.skipped).length;
  assert.equal(h.state.totalScore.value, 100 - unsupported * 2);
  assert.equal(h.state.getSupportRate(), Math.round(supported / (supported + unsupported) * 100));
  assert.equal(h.state.getSupportedFeaturesCount(), supported);
  assert.equal(h.state.getUnsupportedFeaturesCount(), unsupported);
  assert.equal(h.state.getSkippedFeaturesCount(), items.length - supported - unsupported);
  assert.equal(h.state.skipNotices.value.reduce((sum, item) => sum + item.count, 0), h.state.getSkippedFeaturesCount());
  const rank = i => i.skipped ? 2 : (i.supported ? 0 : 1);
  assert.deepEqual(items.map(rank), items.map(rank).sort());
});

test('missing requestAnimationFrame does not overwrite the score with 50', () => {
  const h = harness();
  h.state.totalScore.value = 86;
  h.api.animateScore();
  assert.equal(h.state.displayScore.value, 86);
});

test('reduced motion bypasses JavaScript score animation', () => {
  const h = harness();
  h.context.window.matchMedia = () => ({ matches: true });
  h.context.window.requestAnimationFrame = () => { throw new Error('must not animate'); };
  h.state.totalScore.value = 72;
  h.api.animateScore();
  assert.equal(h.state.displayScore.value, 72);
});

test('initialization failure always exits loading and does not invent a 50-point score', async () => {
  const h = harness();
  Object.defineProperty(h.context.navigator, 'userAgent', { get() { throw new Error('environment failure'); } });
  await h.mounted();
  h.runTimers(800);
  assert.equal(h.state.isLoading.value, false);
  assert.equal(h.state.detectionError.value, true);
  assert.equal(h.state.totalScore.value, null);
  assert.equal(h.state.displayScore.value, null);
  assert.equal(h.state.detectionResults.value.length, 0);
});


test('blocked optional environment APIs do not abort detection', async () => {
  const h = harness();
  h.context.window.matchMedia = () => { throw new Error('blocked'); };
  Object.defineProperty(h.context.navigator, 'userAgentData', { get() { throw new Error('blocked'); } });
  const pending = h.mounted();
  completeImages(h);
  await pending;
  h.runTimers(800);
  assert.equal(h.state.detectionError.value, false);
  assert.equal(h.state.isLoading.value, false);
  assert.equal(h.state.detectionResults.value.length, 60);
});

test('animation exceptions cannot invalidate a completed score', () => {
  const h = harness();
  h.context.window.requestAnimationFrame = () => { throw new Error('blocked'); };
  h.state.totalScore.value = 84;
  h.api.animateScore();
  assert.equal(h.state.displayScore.value, 84);
});

test('animation uses frame timestamps, stays bounded and ends at the exact score', () => {
  const h = harness();
  let next;
  h.context.window.requestAnimationFrame = callback => { next = callback; };
  h.state.totalScore.value = 84;
  h.api.animateScore();
  assert.equal(h.state.displayScore.value, 84); // Even if the first frame never runs.
  next(10000);
  assert.equal(h.state.displayScore.value, 0);
  next(10750);
  assert.equal(h.state.displayScore.value, 79);
  next(11500);
  assert.equal(h.state.displayScore.value, 84);
});

test('hidden pages immediately get the final score without scheduling animation', () => {
  const h = harness();
  h.context.document.hidden = true;
  let calls = 0;
  h.context.window.requestAnimationFrame = () => { calls++; };
  h.state.totalScore.value = 82;
  h.api.animateScore();
  assert.equal(h.state.displayScore.value, 82);
  assert.equal(calls, 0);
});

test('explicit Permissions Policy denial skips features without deducting points', async () => {
  const h = harness();
  const names = ['geolocation', 'gamepad', 'usb', 'bluetooth', 'payment', 'web-share',
    'idle-detection', 'midi', 'screen-wake-lock'];
  h.context.document.featurePolicy = { features: () => names, allowsFeature: () => false };
  const find = await detect(h);
  for (const name of ['Geolocation API', 'Gamepad API', 'WebUSB', 'Web Bluetooth',
    'Payment Request API', 'Web Share API', 'Idle Detection API', 'Web MIDI API', 'Screen Wake Lock API']) {
    assert.equal(find(name).skipped, true, name);
    assert.match(find(name).reason, /Permissions Policy/);
  }
  assert.equal(h.state.totalScore.value, 100 - h.state.getUnsupportedFeaturesCount() * 2);
});

test('unknown, allowed, missing or broken policy introspection does not bypass detection', () => {
  const h = harness();
  const feature = { policy: 'usb' };
  for (const policy of [undefined, {},
    { features: () => [], allowsFeature: () => false },
    { features: () => ['usb'], allowsFeature: () => true },
    { features: () => { throw new Error('blocked'); } }]) {
    h.context.document.permissionsPolicy = policy;
    assert.equal(h.api.getSkipReason(feature), null);
  }
});

function indexedDBMock(h) {
  const request = {};
  const read = { result: 'ok' };
  const transaction = { objectStore: () => ({ get: () => read }) };
  const calls = { deleted: [], closed: 0, writes: 0, aborted: 0 };
  const database = {
    createObjectStore: () => ({ put() { calls.writes++; } }),
    transaction: () => transaction,
    close() { calls.closed++; }
  };
  request.result = database;
  request.transaction = { abort() { calls.aborted++; } };
  h.context.window.indexedDB = {
    open(name) { calls.name = name; return request; },
    deleteDatabase(name) { calls.deleted.push(name); }
  };
  return { request, read, transaction, calls };
}

test('IndexedDB requires a completed read/write transaction and deletes only its probe', async () => {
  const h = harness();
  const m = indexedDBMock(h);
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  m.request.onsuccess();
  m.transaction.oncomplete();
  assert.equal(await pending, true);
  assert.equal(m.calls.writes, 1);
  assert.equal(m.calls.closed, 1);
  assert.deepEqual(m.calls.deleted, [m.calls.name]);
  assert.equal(h.timers.size, 0);
});

test('IndexedDB absence and silent readback failure are unsupported', async () => {
  const h = harness();
  assert.equal(await h.api.testIndexedDB(), false);
  const m = indexedDBMock(h);
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  m.request.onsuccess();
  m.read.result = undefined;
  m.transaction.oncomplete();
  assert.equal(await pending, false);
  assert.equal(m.calls.closed, 1);
});

for (const name of ['SecurityError', 'NotAllowedError', 'QuotaExceededError', 'InvalidStateError', 'UnknownError']) {
  test(`IndexedDB ${name}: synchronous access and asynchronous open errors are skipped`, async () => {
    const h = harness();
    Object.defineProperty(h.context.window, 'indexedDB', { configurable: true, get() { throw { name }; } });
    assert.equal((await h.api.testIndexedDB()).skipped, true);
    delete h.context.window.indexedDB;
    const m = indexedDBMock(h);
    const pending = h.api.testIndexedDB();
    m.request.error = { name };
    m.request.onerror();
    assert.equal((await pending).skipped, true);
    assert.equal(h.timers.size, 0);
  });
}

for (const mode of ['blocked', 'timeout', 'collision']) {
  test(`IndexedDB ${mode}: no existing database is modified or deleted`, async () => {
    const h = harness();
    const m = indexedDBMock(h);
    const pending = h.api.testIndexedDB();
    if (mode === 'blocked') m.request.onblocked();
    if (mode === 'timeout') h.runTimers(2000);
    if (mode === 'collision') m.request.onsuccess();
    assert.equal((await pending).skipped, true);
    if (mode !== 'collision') {
      m.request.onupgradeneeded({ oldVersion: 0 });
      assert.equal(m.calls.aborted, 1);
      m.request.onsuccess();
    }
    assert.equal(m.calls.writes, 0);
    assert.equal(m.calls.closed, 1);
    assert.deepEqual(m.calls.deleted, []);
    assert.equal(h.timers.size, 0);
  });
}

test('IndexedDB timeout after upgrade cleans up the eventual successful connection', async () => {
  const h = harness();
  const m = indexedDBMock(h);
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  h.runTimers(2000);
  assert.equal((await pending).skipped, true);
  m.request.onsuccess();
  assert.equal(m.calls.closed, 1);
  assert.deepEqual(m.calls.deleted, [m.calls.name]);
});

test('IndexedDB aborted transaction reports policy restrictions and cleans up', async () => {
  const h = harness();
  const m = indexedDBMock(h);
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  m.request.onsuccess();
  m.transaction.error = { name: 'QuotaExceededError' };
  m.transaction.onabort();
  assert.equal((await pending).skipped, true);
  assert.equal(m.calls.closed, 1);
  assert.deepEqual(m.calls.deleted, [m.calls.name]);
});


test('storage collisions or broken getItem shims cannot cause an infinite synchronous loop', () => {
  const h = harness();
  let reads = 0;
  h.context.window.localStorage.getItem = () => { reads++; return 'occupied'; };
  h.context.window.localStorage.setItem = () => { throw new Error('must not overwrite'); };
  assert.equal(h.api.testStorage().skipped, true);
  assert.equal(reads, 8);
});

test('storage collision retry preserves the colliding value and removes only its own key', () => {
  const h = harness();
  const s = h.context.window.localStorage;
  const get = s.getItem;
  let collision;
  s.getItem = key => {
    if (!collision) { collision = key; s.setItem(key, 'keep'); }
    return get(key);
  };
  assert.equal(h.api.testStorage(), true);
  assert.deepEqual([...s.values], [[collision, 'keep']]);
});

for (const property of ['mobile', 'maxTouchPoints', 'standalone']) {
  test(`blocked optional ${property} getter does not invalidate all feature results`, async () => {
    const h = harness();
    h.context.navigator.userAgent = 'Macintosh';
    h.context.navigator.userAgentData = {};
    const object = property === 'mobile' ? h.context.navigator.userAgentData : h.context.navigator;
    Object.defineProperty(object, property, { get() { throw new Error('blocked optional hint'); } });
    const pending = h.mounted();
    completeImages(h);
    await pending;
    h.runTimers(800);
    assert.equal(h.state.detectionError.value, false);
    assert.equal(h.state.detectionResults.value.length, 60);
  });
}

test('score animation finishes even if frames stop after the first callback', () => {
  const h = harness();
  let next;
  h.context.window.requestAnimationFrame = callback => { next = callback; return 42; };
  h.state.totalScore.value = 84;
  h.api.animateScore();
  next(0);
  assert.equal(h.state.displayScore.value, 0);
  h.runTimers(1600);
  assert.equal(h.state.displayScore.value, 84);
  next(500); // A late queued frame must not overwrite the final score.
  assert.equal(h.state.displayScore.value, 84);
  assert.equal(h.timers.size, 0);
});

test('hiding a page mid-animation finalizes its score and removes listeners', () => {
  const h = harness();
  let next;
  h.context.window.requestAnimationFrame = callback => { next = callback; };
  h.state.totalScore.value = 84;
  h.api.animateScore();
  next(0);
  h.context.document.hidden = true;
  for (const fn of h.listeners.get('visibilitychange') || []) fn();
  assert.equal(h.state.displayScore.value, 84);
  assert.equal(h.listeners.get('visibilitychange')?.size, 0);
  assert.equal(h.timers.size, 0);
});

test('normal animation completion clears its fallback timer and visibility listener', () => {
  const h = harness();
  let next;
  h.context.window.requestAnimationFrame = callback => { next = callback; };
  h.api.animateScore();
  next(0);
  next(1500);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.get('visibilitychange')?.size, 0);
});

test('IndexedDB upgrade quota errors are not masked by a subsequent open AbortError', async () => {
  const h = harness();
  const m = indexedDBMock(h);
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  const transaction = m.request.transaction;
  transaction.error = { name: 'QuotaExceededError' };
  if (transaction.onabort) transaction.onabort();
  m.request.error = { name: 'AbortError' };
  m.request.onerror();
  assert.equal((await pending).skipped, true);
  assert.equal(h.timers.size, 0);
});

test('IndexedDB cleanup exceptions cannot strand the already-completed probe', async () => {
  const h = harness();
  const m = indexedDBMock(h);
  m.request.result.close = () => { throw new Error('extension blocked close'); };
  const pending = h.api.testIndexedDB();
  m.request.onupgradeneeded({ oldVersion: 0 });
  m.request.onsuccess();
  assert.doesNotThrow(() => m.transaction.oncomplete());
  assert.equal(await pending, true);
  assert.deepEqual(m.calls.deleted, [m.calls.name]);
});

test('image cleanup exceptions cannot strand a successful decode', async () => {
  const h = harness();
  const pending = h.api.testImageDecode('data:image/webp;base64,test');
  h.images[0].removeAttribute = () => { throw new Error('extension blocked cleanup'); };
  assert.doesNotThrow(() => completeImages(h));
  assert.equal(await pending, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.get('securitypolicyviolation').size, 0);
});

test('a throwing image source setter cleans up the probe instead of leaking its timer', async () => {
  const h = harness();
  Object.defineProperty(h.context.Image.prototype, 'src', { set() { throw new Error('blocked source'); } });
  const pending = h.api.testImageDecode('data:image/webp;base64,test');
  const result = await pending;
  assert.equal(result.skipped, true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.get('securitypolicyviolation').size, 0);
});

test('non-callable API placeholders are not reported as usable capabilities', async () => {
  const h = harness();
  Object.assign(h.context.navigator, { share: undefined, getGamepads: null, requestMIDIAccess: {}, clipboard: null });
  h.context.window.showOpenFilePicker = undefined;
  h.context.document.startViewTransition = false;
  const find = await detect(h);
  for (const name of ['Web Share API', 'Gamepad API', 'Web MIDI API', 'Clipboard API',
    'File System Access API', 'View Transitions API']) {
    assert.equal(find(name).supported, false, name);
    assert.equal(find(name).skipped, false, name);
  }
});

test('callable capability checks never invoke permission-sensitive APIs', async () => {
  const h = harness();
  const doNotCall = () => { assert.fail('capability checks must not request permissions'); };
  Object.assign(h.context.navigator, { share: doNotCall, getGamepads: doNotCall,
    requestMIDIAccess: doNotCall, clipboard: { writeText: doNotCall } });
  h.context.window.showOpenFilePicker = doNotCall;
  h.context.document.startViewTransition = doNotCall;
  const find = await detect(h);
  for (const name of ['Web Share API', 'Gamepad API', 'Web MIDI API', 'Clipboard API',
    'File System Access API', 'View Transitions API']) assert.equal(find(name).supported, true, name);
});

const capabilities = require('./fixtures/capabilities.cjs');
const capabilityScope = (h, scope) => scope === 'element'
  ? h.context.HTMLElement.prototype : h.context[scope];

for (const [label, value] of [['undefined', undefined], ['null', null], ['empty object', {}], ['boolean', false]]) {
  test(`remaining capability checks reject ${label} placeholders`, async () => {
    const h = harness();
    for (const item of capabilities) {
      const object = capabilityScope(h, item.scope);
      object[item.property] = value;
      if (item.alternate) object[item.alternate] = value;
    }
    const find = await detect(h);
    for (const item of capabilities) {
      assert.equal(find(item.name).supported, false, item.name);
      assert.equal(find(item.name).skipped, false, item.name);
    }
  });
}

test('callable interfaces are supported without invoking constructors or permission APIs', async () => {
  const h = harness();
  const doNotCall = () => { assert.fail('must not invoke the detected interface'); };
  for (const item of capabilities) {
    const value = item.methods ? Object.fromEntries(item.methods.map(name => [name, doNotCall])) : doNotCall;
    capabilityScope(h, item.scope)[item.property] = value;
  }
  const find = await detect(h);
  for (const item of capabilities) assert.equal(find(item.name).supported, true, item.name);
});

test('partial interface objects cannot pass a required-method check', async () => {
  for (const item of capabilities.filter(item => item.methods)) {
    for (const missing of item.methods) {
      const h = harness();
      capabilityScope(h, item.scope)[item.property] = Object.fromEntries(item.methods.map(name =>
        [name, name === missing ? null : () => { assert.fail('must not call'); }]
      ));
      const find = await detect(h);
      assert.equal(find(item.name).supported, false, `${item.name}.${missing}`);
    }
  }
});

test('working alternative constructors are not masked by truthy invalid primary properties', async () => {
  const h = harness();
  for (const item of capabilities.filter(item => item.alternate)) {
    const object = capabilityScope(h, item.scope);
    object[item.property] = {};
    object[item.alternate] = () => { assert.fail('must not construct'); };
  }
  const find = await detect(h);
  for (const item of capabilities.filter(item => item.alternate)) assert.equal(find(item.name).supported, true, item.name);
});

for (const errorName of ['SecurityError', 'NotAllowedError', 'TypeError']) {
  test(`feature getter ${errorName} is classified without aborting other probes`, async () => {
    const h = harness();
    Object.defineProperty(h.context.navigator, 'clipboard', { get() { throw { name: errorName }; } });
    const find = await detect(h);
    const result = find('Clipboard API');
    assert.equal(result.supported, false);
    assert.equal(result.skipped, errorName !== 'TypeError');
    if (result.skipped) assert.match(result.reason, /安全策略|权限/);
    assert.equal(find('Storage API').supported, true);
    assert.equal(h.state.detectionResults.value.length, 60);
  });
}

test('a denied interface getter is not mistaken for an exposed usable API', async () => {
  const h = harness();
  Object.defineProperty(h.context.navigator, 'serviceWorker', { get() { throw { name: 'SecurityError' }; } });
  const find = await detect(h);
  assert.equal(find('Service Worker').supported, false);
  assert.equal(find('Service Worker').skipped, true);
});
