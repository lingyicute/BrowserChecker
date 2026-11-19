const { createApp, ref, computed, onMounted } = Vue;
if (typeof window.browserCheckerRender !== 'function') throw new Error('缺少预编译的检测页面模板');

const app = createApp({
  render: window.browserCheckerRender,
  setup() {
    // 基础数据
    const userAgent = ref('');
    const browserType = ref('');
    const isChromeEngine = ref(false);
    const chromeVersion = ref(0);
    const totalScore = ref(100);
    const detectionResults = ref([]);
    const recommendation = ref('');
    const switchSuggestion = ref('');
    const isLoading = ref(true);
    const isFadingOut = ref(false);
    const detectionError = ref(false);
    const displayScore = ref(0);
    const isMobileDevice = ref(false);
    const isIOSDevice = ref(false);
    const isLinuxDesktop = ref(false);
    const isSecureContext = ref(true);
    const isFileOrigin = ref(false);
    const isOpaqueOrigin = ref(false);
    const isStandalonePWA = ref(false);
    const skipNotices = ref([]);

    // 计算属性：分数颜色样式
    const scoreColorClass = computed(() => {
      if (detectionError.value) return 'score-unavailable';
      if (totalScore.value === 100) return 'score-green';
      if (totalScore.value >= 80) return 'score-yellow';
      if (totalScore.value >= 70) return 'score-orange';
      return 'score-red';
    });

    // 计算属性：动画背景颜色
    const scoreColorGradient = computed(() => {
      if (detectionError.value) return 'radial-gradient(circle, #94a3b8, #64748b)';
      if (totalScore.value === 100) return 'radial-gradient(circle, #22c55e, #16a34a)';
      if (totalScore.value >= 80) return 'radial-gradient(circle, #eab308, #ca8a04)';
      if (totalScore.value >= 70) return 'radial-gradient(circle, #f97316, #ea580c)';
      return 'radial-gradient(circle, #ef4444, #dc2626)';
    });

    // 参与计分的检测项（排除已跳过项）
    // 缓存统计结果，避免分数动画每一帧都重复遍历检测项。
    const featureStats = computed(() => {
      const stats = { supported: 0, unsupported: 0, skipped: 0 };
      detectionResults.value.forEach(item => {
        stats[item.skipped ? 'skipped' : (item.supported ? 'supported' : 'unsupported')]++;
      });
      return stats;
    });

    // 获取支持的特性数量
    const getSupportedFeaturesCount = () => {
      return featureStats.value.supported;
    };

    // 获取不支持的特性数量
    const getUnsupportedFeaturesCount = () => {
      return featureStats.value.unsupported;
    };

    // 获取跳过的特性数量
    const getSkippedFeaturesCount = () => {
      return featureStats.value.skipped;
    };

    // 获取特性支持率（百分比，不计入跳过项）
    const getSupportRate = () => {
      const { supported, unsupported } = featureStats.value;
      const evaluated = supported + unsupported;
      return evaluated ? Math.round((supported / evaluated) * 100) : null;
    };

    // 检测项状态文字
    const getStatusText = (item) => {
      if (item.skipped) return '已跳过';
      return item.supported ? '支持' : '不支持';
    };

    // 动画/显示模式只是增强，相关 API 被扩展禁用时不应使整个检测失败。
    const matchesMedia = (query) => {
      try {
        return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
      } catch (e) {
        return false;
      }
    };
    const prefersReducedMotion = () => matchesMedia('(prefers-reduced-motion: reduce)');

    // 隐私扩展可能只拦截某一个 getter；可选提示失败不能使整页检测失败。
    const optionalValue = (object, property) => {
      try { return object && object[property]; } catch (e) { return undefined; }
    };

    const animateScore = () => {
      const targetScore = totalScore.value;
      const requestFrame = optionalValue(window, 'requestAnimationFrame');
      if (!Number.isFinite(targetScore) || targetScore <= 0 ||
          typeof requestFrame !== 'function' || prefersReducedMotion() ||
          optionalValue(document, 'hidden') === true) {
        displayScore.value = targetScore;
        return;
      }
      const duration = 1500;
      let startTime;
      let frame;
      let settled = false;
      let timer;
      const finish = () => {
        if (settled) return;
        settled = true;
        displayScore.value = targetScore;
        clearTimeout(timer);
        try { document.removeEventListener('visibilitychange', onVisibilityChange); } catch (e) {}
        try {
          if (frame !== undefined && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(frame);
          }
        } catch (e) { /* 已排队的回调也会检查 settled，不再覆盖最终分数。 */ }
      };
      const onVisibilityChange = () => { if (optionalValue(document, 'hidden') === true) finish(); };
      const updateScore = (timestamp) => {
        if (settled) return;
        if (!Number.isFinite(timestamp)) {
          finish();
          return;
        }
        // 使用 rAF 的单调时间戳，避免系统时间回拨导致负分或动画迟迟不结束。
        if (startTime === undefined) startTime = timestamp;
        const progress = Math.max(0, Math.min(1, (timestamp - startTime) / duration));
        displayScore.value = Math.round((1 - Math.pow(1 - progress, 4)) * targetScore);
        if (progress < 1) scheduleFrame();
        else finish();
      };
      const scheduleFrame = () => {
        try {
          frame = requestFrame.call(window, updateScore);
        } catch (e) {
          finish();
        }
      };
      // 第一帧和中途停帧都必须有兜底；进入后台时立即完成，避免停在部分分数。
      displayScore.value = targetScore;
      timer = setTimeout(finish, duration + 100);
      // 监听失败只影响“切到后台立即收尾”，仍有定时器兜底，不应使检测失败。
      try { document.addEventListener('visibilitychange', onVisibilityChange); } catch (e) {}
      scheduleFrame();
    };

    // 检测运行环境（设备类型 / 平台 / 安全上下文）
    const detectEnvironment = () => {
      const ua = navigator.userAgent;
      const uaData = optionalValue(navigator, 'userAgentData');

      // iPadOS 13+ 的 Safari 默认伪装成 Macintosh，结合触控点数判断
      const isIPadOSDesktopUA = /Macintosh/i.test(ua) && optionalValue(navigator, 'maxTouchPoints') > 1;

      isIOSDevice.value = /iPhone|iPad|iPod/i.test(ua) || isIPadOSDesktopUA;

      const uaSaysMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
      isMobileDevice.value = optionalValue(uaData, 'mobile') === true || uaSaysMobile || isIOSDevice.value;

      // 桌面 Linux（不含 Android / ChromeOS）
      isLinuxDesktop.value = !isMobileDevice.value && /Linux|X11/i.test(ua) && !/Android|CrOS/i.test(ua);

      isFileOrigin.value = location.protocol === 'file:';
      isOpaqueOrigin.value = optionalValue(window, 'origin') === 'null';
      isSecureContext.value = window.isSecureContext === true;
      const standaloneDisplay = matchesMedia('(display-mode: standalone)');
      isStandalonePWA.value = !!(standaloneDisplay || optionalValue(navigator, 'standalone') === true);

      console.log(`[浏览器检测] - 设备类型: ${isMobileDevice.value ? '移动设备' : '桌面设备'}`);
      console.log(`[浏览器检测] - iOS: ${isIOSDevice.value}, 桌面 Linux: ${isLinuxDesktop.value}, 安全上下文: ${isSecureContext.value}, file://: ${isFileOrigin.value}`);
      return isMobileDevice.value;
    };

    // 平台名单只是 API 缺失时的解释，不能盖过实际暴露的能力。
    const getUnavailablePlatformReason = (feature) => {
      if (feature.desktopOnly && isMobileDevice.value) return '当前移动端环境未提供此 API';
      if (feature.skipOnIOS && isIOSDevice.value) return '当前 iOS 浏览器环境未提供此 API';
      if (feature.skipOnLinuxDesktop && isLinuxDesktop.value) return '当前桌面 Linux 环境未提供此 API';
      return null;
    };

    // 安全上下文和网站来源是两个条件。本地文件可以是安全上下文。
    const getSkipReason = (feature) => {
      if (feature.siteOrigin && (isFileOrigin.value || isOpaqueOrigin.value)) {
        return isFileOrigin.value
          ? 'file:// 本地页面没有可用于该 API 的网站来源'
          : '当前页面使用不透明来源，无法评估此 API';
      }
      if (feature.secure && !isSecureContext.value) {
        return '需要安全上下文（HTTPS 或可信的本地来源）';
      }
      // 只信任浏览器明确认识且明确禁止的策略名称；不查询或申请用户权限。
      if (feature.policy || feature.policiesAll) {
        const anyPolicies = feature.policy
          ? (Array.isArray(feature.policy) ? feature.policy : [feature.policy])
          : [];
        for (const property of ['permissionsPolicy', 'featurePolicy']) {
          const policy = optionalValue(document, property);
          try {
            if (!hasMethods(policy, ['features', 'allowsFeature'])) continue;
            const known = policy.features();
            if (!Array.isArray(known)) continue;
            const isDenied = (name) => known.includes(name) && policy.allowsFeature(name) === false;
            if (anyPolicies.some(isDenied) ||
                (feature.policiesAll && feature.policiesAll.length > 0 && feature.policiesAll.every(isDenied))) {
              return '被页面权限策略（Permissions Policy）禁用';
            }
            break;
          } catch (e) { /* 尝试旧接口，否则直接执行能力检测。 */ }
        }
      }
      if (typeof feature.skipIf === 'function') {
        try {
          const reason = feature.skipIf();
          if (reason) return reason;
        } catch (e) {
          // 跳过条件本身失败时，继续执行实际能力检测。
        }
      }
      return null;
    };

    // 图片解码检测：超时 / CSP 拦截属于无法评估，不应当作为格式不支持扣分。
    const testImageDecode = (dataUri) => new Promise((resolve) => {
      if (typeof Image !== 'function') {
        resolve(false);
        return;
      }
      let img;
      let settled = false;
      let errorTimer;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(errorTimer);
        if (img) {
          // 清理属于尽力而为；不能在 settled 后抛错，导致 Promise 永远无法完成。
          try { img.onload = null; } catch (e) {}
          try { img.onerror = null; } catch (e) {}
          try { img.removeAttribute('src'); } catch (e) {}
        }
        try { document.removeEventListener('securitypolicyviolation', onPolicyViolation); } catch (e) {}
        resolve(result);
      };
      const onPolicyViolation = (event) => {
        if (event && event.disposition === 'enforce' && event.effectiveDirective === 'img-src' &&
            (event.blockedURI === 'data' || event.blockedURI === 'data:' || event.blockedURI === dataUri)) {
          finish({ skipped: true, reason: '图片解码样本被内容安全策略（CSP）阻止' });
        }
      };
      const timer = setTimeout(() => finish({
        skipped: true, reason: '图片解码超时，无法评估当前格式支持情况'
      }), 2000);
      try {
        img = new Image();
        document.addEventListener('securitypolicyviolation', onPolicyViolation);
        img.onload = () => {
          try { finish(img.naturalWidth > 0 && img.naturalHeight > 0); }
          catch (e) { finish({ skipped: true, reason: '无法读取图片解码结果' }); }
        };
        // 给异步 CSP 事件留出时间；普通解码失败仍然标记为不支持。
        img.onerror = () => {
          clearTimeout(errorTimer);
          errorTimer = setTimeout(() => finish(false), 100);
        };
        img.src = dataUri;
      } catch (e) {
        finish({ skipped: true, reason: '图片解码样本无法加载，无法评估当前格式支持情况' });
      }
    });

    // 仅检查属性存在会把被禁用的存储误报为可用；探测后只删除自己的临时键。
    const testStorage = () => {
      for (const name of ['localStorage', 'sessionStorage']) {
        let storage;
        let key;
        let written = false;
        try {
          storage = window[name];
          if (!hasMethods(storage, ['getItem', 'setItem', 'removeItem'])) return false;
          // 不同标签页使用不同的键，避免相互读取/删除探测值；碰撞重试必须有界。
          const prefix = '__browserchecker_probe__' + Date.now() + '_' + Math.random().toString(36).slice(2);
          for (let attempt = 0; attempt < 8; attempt++) {
            key = prefix + '_' + attempt;
            if (storage.getItem(key) === null) break;
            key = null;
          }
          if (key === null) return { skipped: true, reason: '无法分配独立的网站存储检测键' };
          storage.setItem(key, key);
          written = true;
          const matches = storage.getItem(key) === key;
          storage.removeItem(key);
          written = false;
          if (storage.getItem(key) === key) {
            return { skipped: true, reason: '浏览器未清除网站存储探测键' };
          }
          if (!matches) return false;
        } catch (error) {
          if (error && (error.name === 'SecurityError' || error.name === 'NotAllowedError' ||
              error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            return { skipped: true, reason: '网站存储被安全策略限制或配额已用尽' };
          }
          return false;
        } finally {
          if (written) {
            try {
              if (storage.getItem(key) === key) storage.removeItem(key);
            } catch (e) { /* 策略可能在检测期间变化。 */ }
          }
        }
      }
      return true;
    };

    // IndexedDB 属性存在不代表可读写（隐私模式、沙箱或网站存储策略可能阻止打开）。
    // 仅操作本次创建的随机临时数据库；超时后到达的请求也必须关闭连接。
    const testIndexedDB = () => new Promise((resolve) => {
      let factory;
      let request;
      let database;
      let created = false;
      let settled = false;
      let timer;
      const name = '__browserchecker_probe__' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const restricted = { skipped: true, reason: 'IndexedDB 被存储策略限制或暂时不可用' };
      const cleanup = () => {
        if (database) {
          const connection = database;
          database = null;
          try { connection.close(); } catch (e) { /* 清理失败不能阻断结果或删除请求。 */ }
        }
        if (created) {
          created = false;
          try { factory.deleteDatabase(name); } catch (e) { /* 存储策略可能已变化。 */ }
        }
      };
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(result);
      };
      const fail = (error) => {
        const limited = error && ['SecurityError', 'NotAllowedError', 'QuotaExceededError',
          'NS_ERROR_DOM_QUOTA_REACHED', 'InvalidStateError', 'UnknownError'].includes(error.name);
        finish(limited ? restricted : false);
      };
      try {
        factory = window.indexedDB;
        if (!hasMethods(factory, ['open', 'deleteDatabase'])) { finish(false); return; }
        timer = setTimeout(() => finish({ skipped: true, reason: 'IndexedDB 检测超时，无法评估' }), 2000);
        request = factory.open(name);
        request.onblocked = () => finish(restricted);
        request.onerror = () => { if (!settled) fail(optionalValue(request, 'error')); };
        request.onupgradeneeded = (event) => {
          // 万一名称碰撞，不读写、更不删除已有数据库；超时后的升级直接回滚。
          if (settled || event.oldVersion !== 0) {
            try { request.transaction?.abort(); } catch (e) {}
            if (!settled) finish(restricted);
            return;
          }
          created = true;
          // 升级写入可能异步触发 QuotaExceededError，open 请求随后只报告 AbortError。
          // 保留原始事务错误，避免把存储限制误算为浏览器缺少 IndexedDB。
          const upgrade = request.transaction;
          let write;
          if (upgrade) upgrade.onabort = () => {
            if (!settled) fail(optionalValue(upgrade, 'error') || optionalValue(write, 'error'));
          };
          try {
            write = request.result.createObjectStore('probe').put('ok', 'probe');
          } catch (error) {
            if (upgrade) {
              upgrade.onabort = null;
              try { upgrade.abort(); } catch (e) {}
            }
            fail(error);
          }
        };
        request.onsuccess = () => {
          database = request.result;
          if (settled) { cleanup(); return; }
          if (!created) { finish(restricted); return; }
          try {
            const transaction = database.transaction('probe', 'readonly');
            const read = transaction.objectStore('probe').get('probe');
            transaction.oncomplete = () => {
              try { finish(read.result === 'ok'); } catch (error) { fail(error); }
            };
            transaction.onabort = () => fail(optionalValue(transaction, 'error') || optionalValue(read, 'error'));
            database.onversionchange = () => finish(restricted);
          } catch (error) { fail(error); }
        };
      } catch (error) { fail(error); }
    });

    const releaseWebGLContext = (context) => {
      if (!context) return;
      try {
        const extension = context.getExtension('WEBGL_lose_context');
        if (extension) extension.loseContext();
      } catch (e) { /* 清理失败不改变已经取得的检测结果。 */ }
    };

    const WEBP_SAMPLE = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    const AVIF_SAMPLE = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

    // 只检查可调用接口，不申请权限、不启动设备或网络请求。
    // `in` 会把扩展留下的 undefined / null / 空对象占位符误判为支持。
    const hasMethods = (object, methods) => !!object &&
      methods.every(method => typeof object[method] === 'function');

    const supportsCSS = (...args) => hasMethods(window.CSS, ['supports']) &&
      !!window.CSS.supports(...args);

    // canPlayType 返回浏览器对具体媒体类型的判断，不代表已播放样本。
    const canPlay = (elementName, types) => {
      const media = document.createElement(elementName);
      return typeof media.canPlayType === 'function' && types.some(type => {
        const result = media.canPlayType(type);
        return result === 'probably' || result === 'maybe';
      });
    };

    // 检测现代Web功能
    // 每个检测项可选字段：
    //   policy            - 对应 Permissions Policy（单条或数组）；任一策略明确禁用时跳过
    //   policiesAll       - 对应多条 Permissions Policy；全部明确禁用时跳过
    //   secure            - 需要安全上下文；由浏览器判定，不直接等同于 HTTPS
    //   siteOrigin        - 需要网站来源；本地文件与不透明来源跳过
    //   desktopOnly / skipOnIOS / skipOnLinuxDesktop - 接口缺失时按平台跳过
    //   skipIf            - 根据当前运行形态返回跳过原因
    // test 可以返回布尔值、Promise<boolean>，或返回 { skipped: true, reason } 表示运行时判定为环境限制
    const checkModernFeatures = async () => {
      console.log('[浏览器检测] - 开始检测Web特性');

      const features = [
        // 本脚本能执行就已经证明了所用的 ES6 和 async/await 语法，无需 eval。
        { name: 'ES6 支持', test: () => true },
        { name: 'Fetch API', test: () => typeof window.fetch === 'function' },
        { name: 'Promise', test: () => typeof window.Promise === 'function' },
        { name: 'Service Worker', secure: true, siteOrigin: true, test: () => hasMethods(navigator.serviceWorker, ['register']) },
        { name: 'WebAssembly', test: () => hasMethods(window.WebAssembly, ['compile', 'instantiate']) },
        { name: 'Async/Await', test: () => true },
        { name: 'Intersection Observer', test: () => typeof window.IntersectionObserver === 'function' },
        { name: 'Web Animation API', test: () => typeof HTMLElement.prototype.animate === 'function' },
        { name: 'CSS Grid', test: () => supportsCSS('display', 'grid') },
        { name: 'CSS Variables', test: () => supportsCSS('--a', '0') },
        { name: 'WebGL 2.0', test: () => {
          // 若连 WebGL 1.0 都不可用，说明是 GPU 加速被禁用/远程桌面等环境问题，而非浏览器过时
          const tryContext = (type) => {
            try {
              const canvas = document.createElement('canvas');
              return typeof canvas.getContext === 'function' ? canvas.getContext(type) : null;
            } catch (e) {
              return null;
            }
          };
          const gl2 = tryContext('webgl2');
          if (gl2) {
            releaseWebGLContext(gl2);
            return true;
          }
          const gl1 = tryContext('webgl') || tryContext('experimental-webgl');
          if (!gl1) {
            return { skipped: true, reason: '当前环境无法创建 WebGL 上下文，无法评估' };
          }
          releaseWebGLContext(gl1);
          return false;
        }},
        { name: 'WebRTC', test: () => typeof window.RTCPeerConnection === 'function' || typeof window.webkitRTCPeerConnection === 'function' },
        { name: 'Web Speech API', test: () => typeof window.SpeechRecognition === 'function' || typeof window.webkitSpeechRecognition === 'function' },
        { name: 'Web Share API', policy: 'web-share', secure: true, skipOnLinuxDesktop: true, test: () => typeof navigator.share === 'function' },
        { name: 'Payment Request API', policy: 'payment', secure: true, test: () => typeof window.PaymentRequest === 'function' },
        { name: 'Pointer Events', test: () => typeof window.PointerEvent === 'function' },
        { name: 'Web Audio API', test: () => typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function' },
        { name: 'WebXR Device API', policy: 'xr-spatial-tracking', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.xr, ['requestSession']) },
        { name: 'WebUSB', policy: 'usb', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.usb, ['requestDevice']) },
        { name: 'Web Bluetooth', policy: 'bluetooth', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.bluetooth, ['requestDevice']) },
        { name: 'WebAuthn', policy: ['publickey-credentials-get', 'publickey-credentials-create'], secure: true, siteOrigin: true, test: () => hasMethods(navigator.credentials, ['get', 'create']) && typeof window.PublicKeyCredential === 'function' },
        { name: 'Geolocation API', policy: 'geolocation', secure: true, test: () => hasMethods(navigator.geolocation, ['getCurrentPosition']) },
        { name: 'IndexedDB', test: testIndexedDB },
        { name: 'Web Notifications', secure: true, siteOrigin: true,
          // iOS 的 Notifications API 主要面向已添加到主屏幕的 Web App。
          // 普通标签页跳过，主屏幕 Web App 则进行实际检测。
          skipIf: () => (isIOSDevice.value && !isStandalonePWA.value)
            ? 'iOS 普通标签页不支持，请添加到主屏幕后再检测'
            : null,
          test: () => typeof window.Notification === 'function' },
        { name: 'Screen Orientation API', test: () => typeof screen !== 'undefined' && !!(screen &&
          screen.orientation && typeof screen.orientation.type === 'string' &&
          screen.orientation.type.length > 0 && Number.isFinite(screen.orientation.angle)) },
        { name: 'Gamepad API', policy: 'gamepad', secure: true, test: () => typeof navigator.getGamepads === 'function' },
        { name: 'Web Components', test: () => hasMethods(window.customElements, ['define', 'get']) },
        { name: '支持视频格式 WebM', test: () => canPlay('video', [
          'video/webm; codecs="vp8, vorbis"', 'video/webm; codecs="vp9, opus"',
          'video/webm; codecs="av01.0.04M.08, opus"'
        ]) },
        { name: '支持音频格式 AAC', test: () => canPlay('audio', [
          'audio/aac', 'audio/mp4; codecs="mp4a.40.2"'
        ]) },
        { name: 'requestAnimationFrame', test: () => typeof window.requestAnimationFrame === 'function' },
        { name: 'Storage API', test: testStorage },
        { name: 'Clipboard API', policiesAll: ['clipboard-read', 'clipboard-write'], secure: true, test: () => {
          const clipboard = navigator.clipboard;
          return !!clipboard && ['read', 'readText', 'write', 'writeText']
            .some(method => typeof clipboard[method] === 'function');
        } },
        { name: 'ResizeObserver', test: () => typeof window.ResizeObserver === 'function' },
        { name: 'Performance API', test: () => hasMethods(window.performance, ['now']) },
        // 图片格式：改为真实解码测试
        // 原先的 canvas.toDataURL 只能检测“编码”能力
        // Chrome 至今不支持编码 AVIF、Safari 也长期不支持编码 WebP，导致假阴性
        { name: '支持图像格式 WebP', test: () => testImageDecode(WEBP_SAMPLE) },
        { name: '支持图像格式 AVIF', test: () => testImageDecode(AVIF_SAMPLE) },
        { name: 'URL.createObjectURL', test: () => typeof URL !== 'undefined' && hasMethods(URL, ['createObjectURL']) },
        { name: 'Web Locks API', secure: true, siteOrigin: true, test: () => hasMethods(navigator.locks, ['request']) },
        // 新版 Chromium Android 已逐步提供文件选择器；这里使用能力检测，
        // 不再把整个 File System Access API 一刀切为桌面专属。
        { name: 'File System Access API', secure: true, test: () => typeof window.showOpenFilePicker === 'function' },
        { name: 'CSS :has() 选择器', test: () => supportsCSS('selector(:has(*))') },
        { name: 'CSS 容器查询', test: () => supportsCSS('container-type: inline-size') },
        { name: 'CSS 嵌套规则', test: () => supportsCSS('selector(&)') },
        { name: 'CSS aspect-ratio', test: () => supportsCSS('aspect-ratio: 1/1') },
        { name: 'CSS color-mix()', test: () => supportsCSS('color: color-mix(in srgb, red, blue)') },
        { name: 'WebGPU API', secure: true, test: () => hasMethods(navigator.gpu, ['requestAdapter']) },
        { name: 'WebTransport API', secure: true, test: () => typeof window.WebTransport === 'function' },
        { name: 'Compression Streams API', test: () => typeof window.CompressionStream === 'function' },
        { name: 'Cookie Store API', secure: true, siteOrigin: true, test: () => hasMethods(window.cookieStore, ['get', 'set']) },
        { name: 'Idle Detection API', policy: 'idle-detection', secure: true, skipOnIOS: true, test: () => typeof window.IdleDetector === 'function' },
        { name: 'Web MIDI API', policy: 'midi', secure: true, skipOnIOS: true, test: () => typeof navigator.requestMIDIAccess === 'function' },
        { name: 'Reporting API', test: () => typeof window.ReportingObserver === 'function' },
        { name: 'Screen Wake Lock API', policy: 'screen-wake-lock', secure: true, test: () => hasMethods(navigator.wakeLock, ['request']) },
        { name: 'EyeDropper API', secure: true, desktopOnly: true, test: () => typeof window.EyeDropper === 'function' },
        { name: 'ScrollTimeline / ViewTimeline', test: () => typeof window.ScrollTimeline === 'function' || typeof window.ViewTimeline === 'function' },
        { name: 'MediaSession API', test: () => hasMethods(navigator.mediaSession, ['setActionHandler']) },
        { name: 'Credential Management API', secure: true, siteOrigin: true, test: () => hasMethods(navigator.credentials, ['get', 'create']) },
        // --- 针对 Chromium 120-150 新增的新特性检测 ---
        { name: 'Popover API', test: () => 'popover' in HTMLElement.prototype &&
          hasMethods(HTMLElement.prototype, ['showPopover', 'hidePopover', 'togglePopover']) },
        { name: 'View Transitions API', test: () => typeof document.startViewTransition === 'function' },
        { name: 'CSS light-dark()', test: () => supportsCSS('color: light-dark(white, black)') },
        { name: 'Speculation Rules API', skipOnIOS: true, test: () => typeof HTMLScriptElement !== 'undefined' &&
          hasMethods(HTMLScriptElement, ['supports']) && !!HTMLScriptElement.supports('speculationrules') },
        // Baseline 2026 / ECMAScript 2026 新增能力：仅探测稳定、无需权限的接口，不执行导航或设备操作。
        { name: 'Navigation API', test: () => hasMethods(window.navigation, ['navigate', 'entries']) },
        { name: 'Math.sumPrecise()', test: () => typeof Math.sumPrecise === 'function' &&
          Math.sumPrecise([1e20, 0.1, -1e20]) === 0.1 },
        { name: 'Iterator.concat()', test: () => typeof Iterator === 'function' &&
          typeof Iterator.concat === 'function' },
        { name: 'Intl.Locale 信息 API', test: () => typeof Intl === 'object' && !!Intl &&
          typeof Intl.Locale === 'function' && hasMethods(Intl.Locale.prototype, ['getWeekInfo']) },
        { name: 'CSS field-sizing', test: () => supportsCSS('field-sizing: content') },
        { name: 'CSS :open 选择器', test: () => supportsCSS('selector(:open)') },
        // --- ECMAScript 2025 / 2026 内置能力：只检查接口存在，不执行迭代或解析 ---
        { name: 'Set 集合运算方法', test: () => typeof Set === 'function' &&
          hasMethods(Set.prototype, ['union', 'intersection', 'difference', 'isSubsetOf']) },
        { name: 'Iterator Helpers', test: () => typeof Iterator === 'function' &&
          hasMethods(Iterator.prototype, ['map', 'filter', 'take', 'toArray']) },
        { name: 'RegExp.escape()', test: () => typeof RegExp === 'function' && typeof RegExp.escape === 'function' },
        { name: 'Float16Array', test: () => typeof Float16Array === 'function' && typeof Math.f16round === 'function' },
        { name: 'Uint8Array Base64 / Hex 编解码', test: () => typeof Uint8Array === 'function' &&
          hasMethods(Uint8Array, ['fromBase64', 'fromHex']) && hasMethods(Uint8Array.prototype, ['toBase64', 'toHex']) },
        { name: 'Temporal API', test: () => typeof Temporal === 'object' && !!Temporal &&
          hasMethods(Temporal.Now, ['instant', 'plainDateISO']) && typeof Temporal.PlainDate === 'function' },
        { name: 'Object.groupBy() / Map.groupBy()', test: () => hasMethods(Object, ['groupBy']) &&
          typeof Map === 'function' && hasMethods(Map, ['groupBy']) },
        { name: 'Promise.withResolvers()', test: () => hasMethods(window.Promise, ['withResolvers']) },
        { name: 'Promise.try()', test: () => hasMethods(window.Promise, ['try']) },
        { name: 'Array.fromAsync()', test: () => typeof Array.fromAsync === 'function' },
        { name: 'Error.isError()', test: () => typeof Error.isError === 'function' },
        // --- Baseline 与较新的 CSS 能力 ---
        { name: 'CSS @scope', test: () => typeof window.CSSScopeRule === 'function' },
        { name: 'CSS @starting-style', test: () => typeof window.CSSStartingStyleRule === 'function' },
        { name: 'CSS @property', test: () => hasMethods(window.CSS, ['registerProperty']) &&
          typeof window.CSSPropertyRule === 'function' },
        { name: 'CSS subgrid', test: () => supportsCSS('grid-template-columns: subgrid') },
        { name: 'CSS text-wrap: balance', test: () => supportsCSS('text-wrap: balance') },
        { name: 'CSS 锚点定位', test: () => supportsCSS('anchor-name: --a') && supportsCSS('position-anchor: --a') },
        { name: 'CSS Custom Highlight API', test: () => !!window.CSS &&
          hasMethods(window.CSS.highlights, ['set', 'delete']) && typeof window.Highlight === 'function' },
        { name: 'CSS @layer', test: () => typeof window.CSSLayerBlockRule === 'function' &&
          typeof window.CSSLayerStatementRule === 'function' },
        { name: 'CSS 相对颜色', test: () => supportsCSS('color', 'rgb(from rebeccapurple r g b / 50%)') },
        { name: 'CSS transition-behavior', test: () => supportsCSS('transition-behavior', 'allow-discrete') },
        // 不测 content: attr(...)，它会把只支持旧字符串形式的浏览器算作支持。
        { name: 'CSS 类型化 attr()', test: () => supportsCSS('width', 'attr(data-width type(<length>), 1px)') },
        // --- Baseline 与较新的 Web 平台能力：不创建元素实例、不发起解析或任务 ---
        { name: '声明式 Shadow DOM / setHTMLUnsafe()', test: () => typeof window.HTMLTemplateElement === 'function' &&
          'shadowRootMode' in window.HTMLTemplateElement.prototype &&
          !!window.Element && hasMethods(window.Element.prototype, ['setHTMLUnsafe']) },
        { name: 'Invoker Commands（commandfor）', test: () => typeof window.HTMLButtonElement === 'function' &&
          'commandForElement' in window.HTMLButtonElement.prototype && typeof window.CommandEvent === 'function' },
        { name: 'Element.moveBefore()', test: () => !!window.Element && hasMethods(window.Element.prototype, ['moveBefore']) },
        { name: 'scrollend 事件', test: () => 'onscrollend' in document ||
          (!!window.Element && 'onscrollend' in window.Element.prototype) },
        { name: 'URLPattern API', test: () => typeof window.URLPattern === 'function' },
        { name: 'Import Maps', test: () => typeof HTMLScriptElement !== 'undefined' &&
          hasMethods(HTMLScriptElement, ['supports']) && !!HTMLScriptElement.supports('importmap') },
        { name: 'OffscreenCanvas', test: () => typeof window.OffscreenCanvas === 'function' },
        { name: 'Web Crypto API', secure: true, test: () => hasMethods(window.crypto, ['getRandomValues', 'randomUUID']) &&
          hasMethods(window.crypto.subtle, ['digest', 'encrypt']) },
        { name: 'WebCodecs API', secure: true, test: () => typeof window.VideoDecoder === 'function' },
        { name: 'Prioritized Task Scheduling（scheduler.postTask）', test: () => hasMethods(window.scheduler, ['postTask']) },
        { name: 'AbortSignal.any() / timeout()', test: () => typeof window.AbortSignal === 'function' &&
          hasMethods(window.AbortSignal, ['any', 'timeout']) },
        { name: 'HTMLDialogElement.requestClose()', test: () => typeof window.HTMLDialogElement === 'function' &&
          hasMethods(window.HTMLDialogElement.prototype, ['requestClose']) },
        { name: 'IntersectionObserver.scrollMargin', test: () => typeof window.IntersectionObserver === 'function' &&
          !!window.IntersectionObserver.prototype && typeof Object.getOwnPropertyDescriptor(
            window.IntersectionObserver.prototype, 'scrollMargin')?.get === 'function' },
        { name: 'Origin Private File System（OPFS）', secure: true, siteOrigin: true,
          test: () => hasMethods(navigator.storage, ['getDirectory']) },
        { name: 'Sanitizer API', test: () => typeof window.Sanitizer === 'function' &&
          hasMethods(window.Element && window.Element.prototype, ['setHTML']) },
        // 与 WebUSB / Web Bluetooth 同类的硬件接口：只检查入口方法，不请求设备。
        { name: 'Web Serial API', policy: 'serial', secure: true, desktopOnly: true, test: () => hasMethods(navigator.serial, ['requestPort']) },
        { name: 'WebHID API', policy: 'hid', secure: true, desktopOnly: true, test: () => hasMethods(navigator.hid, ['requestDevice']) }
      ];

      // 检测每项功能并记录结果（支持异步检测）
      const results = await Promise.all(features.map(async (feature) => {
        const skipReason = getSkipReason(feature);
        if (skipReason) {
          return { name: feature.name, supported: false, skipped: true, reason: skipReason };
        }

        let supported = false;
        let skipped = false;
        let reason = '';
        try {
          const outcome = await feature.test();
          if (outcome && typeof outcome === 'object' && outcome.skipped) {
            skipped = true;
            reason = outcome.reason || '环境限制';
          } else {
            supported = !!outcome;
          }
        } catch (e) {
          // 明确的安全/权限拒绝表示无法评估，而非浏览器缺少此功能。
          // 其他异常（例如 TypeError）仍按检测失败处理，不能一律免除扣分。
          if (e && (e.name === 'SecurityError' || e.name === 'NotAllowedError')) {
            skipped = true;
            reason = 'API 访问被安全策略或权限限制，无法评估';
          }
        }

        if (!supported && !skipped) {
          const platformReason = getUnavailablePlatformReason(feature);
          if (platformReason) {
            skipped = true;
            reason = platformReason;
          }
        }
        return { name: feature.name, supported, skipped, reason };
      }));

      results.forEach(item => {
        if (!item.skipped && !item.supported) {
          totalScore.value -= 2; // 微调扣分系数，适应更多检测项
        }
      });

      // 汇总跳过原因，用于页面提示
      const reasonCount = Object.create(null);
      results.filter(r => r.skipped).forEach(r => {
        reasonCount[r.reason] = (reasonCount[r.reason] || 0) + 1;
      });
      skipNotices.value = Object.keys(reasonCount).map(reason => ({ reason, count: reasonCount[reason] }));

      // 对检测结果排序：支持 → 不支持 → 已跳过，同组内按名称排序
      const rank = (item) => (item.skipped ? 2 : (item.supported ? 0 : 1));
      results.sort((a, b) => {
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'zh-CN');
      });

      detectionResults.value = results;
    };

    // 与当前 Chrome Stable 主版本对齐；Chrome 从 2026 年起加快发布节奏，
    // 更新此基线时同步调整下方推荐阈值和回归测试。
    const latestChromiumVersion = 158;

    // 检测浏览器类型和版本
    const detectBrowserInfo = () => {
      const ua = navigator.userAgent;
      userAgent.value = ua;
      isChromeEngine.value = false;
      chromeVersion.value = 0;
      switchSuggestion.value = '';

      console.log('[浏览器检测] - 开始分析浏览器类型和版本');

      const isChinaBrowser = /HeyTap|Quark|baidu|xweb|miuibrowser|mibrowser/i.test(ua);
      const isWebView = /WeChat|MicroMessenger|QQ/i.test(ua);

      if (isWebView) {
        browserType.value = '套壳浏览器';
        totalScore.value -= 20;
      } else if (isChinaBrowser) {
        browserType.value = '国产浏览器';
        totalScore.value -= 30;
      } else if (/\b(?:firefox|fxios)\//i.test(ua)) {
        browserType.value = 'Firefox';
      } else if (/\bedgios\//i.test(ua)) {
        browserType.value = 'Edge（iOS）';
      } else if (/\b(?:edg|edga|edge)\//i.test(ua)) {
        browserType.value = 'Edge';
      } else if (/\b(?:opios|opt)\//i.test(ua)) {
        browserType.value = 'Opera（iOS）';
      } else if (/\b(?:opera|opr)\//i.test(ua)) {
        browserType.value = 'Opera';
      } else if (/\bcrios\//i.test(ua)) {
        browserType.value = 'Chrome（iOS）';
      } else if (/\bandroid\b/i.test(ua) && /;\s*wv(?=[;)])/i.test(ua)) {
        // 通用 Android WebView 是运行形态，不等同于上方指定的套壳品牌扣分规则。
        browserType.value = 'Android WebView';
      } else if (/\b(?:chrome|chromium|headlesschrome)\/\d+\b/i.test(ua)) {
        browserType.value = 'Chromium';
      } else if (/\bsafari\//i.test(ua)) {
        browserType.value = 'Safari';
      } else {
        browserType.value = '未知浏览器';
      }

      // EdgeHTML 与当前已知的 iOS 浏览器可能带兼容性标记，不能据此认定 Chromium。
      const hasNonChromiumToken = /\b(?:edge|crios|edgios|firefox|fxios|opios|opt)\//i.test(ua);
      const chromeMatch = isChinaBrowser || isWebView
        ? ua.match(/chrome\/(\d+)/i) // 受保护的浏览器策略沿用原来的匹配范围。
        : hasNonChromiumToken ? null : ua.match(/\b(?:chrome|chromium|headlesschrome)\/(\d+)\b/i);
      if (chromeMatch && chromeMatch[1]) {
        isChromeEngine.value = true;
        const reportedVersion = parseInt(chromeMatch[1], 10);

        // 国内/WebView如果汇报高于110，判定为虚标伪装。国产浏览器存在严重的隐私和安全性隐患，且常常充斥着广告和骚扰内容。有些国产浏览器甚至在网页中动态插入广告。此处声称国产浏览器伪装内核版本是作为一种恐吓，目的是让用户产生危机感，尽快切换到国际主流浏览器。
        const isUnreliableVersion = (isChinaBrowser || isWebView) && reportedVersion > 110;

        const realVersion = isUnreliableVersion ? 109 : reportedVersion;

        if (isUnreliableVersion) {
          chromeVersion.value = `疑似恶意伪装成 ${reportedVersion} 的 ${realVersion}`;
        } else {
          chromeVersion.value = realVersion;
        }

        const version = realVersion;

        // 版本分档相对当前 Stable 基线计算，避免新主版本落入未覆盖区间而漏扣分。
        if (version >= latestChromiumVersion - 5) {
          // 当前及最近五个主版本不扣分；更新发布基线时分档随之平移。
        } else if (version >= latestChromiumVersion - 12) {
          totalScore.value -= 10;
        } else if (version >= latestChromiumVersion - 20) {
          totalScore.value -= 20;
        } else if (version >= latestChromiumVersion - 30) {
          totalScore.value -= 30;
        } else if (version >= 110) {
          // 延续旧策略的最低版本分界，避免改变旧版本的基础扣分含义。
          totalScore.value -= 40;
        } else {
          totalScore.value -= 50;
        }
      }

      // 保证最终分数边界为 0-100
      totalScore.value = Math.max(0, Math.min(100, totalScore.value));

      // 生成建议
      generateRecommendation();
    };

    // 生成建议
    const generateRecommendation = () => {
      let upgradeSuggestion = '';
      let localSwitchSuggestion = '';
      let featureSuggestion = '';
      let isFakeVersion = false;

      if (isChromeEngine.value) {
        let version;

        // 国产浏览器存在严重的隐私和安全性隐患，且常常充斥着广告和骚扰内容。有些国产浏览器甚至在网页中动态插入广告。此处声称国产浏览器伪装内核版本是作为一种恐吓，目的是让用户产生危机感，尽快切换到国际主流浏览器。
        if (typeof chromeVersion.value === 'string' && chromeVersion.value.includes('伪装')) {
          version = 109;
          isFakeVersion = true;
          upgradeSuggestion = `你的浏览器疑似在恶意伪装更高版本，实际使用的可能是严重过时的 Chromium 内核（估测为 109 左右），存在重大安全风险。梨强烈建议你立即切换到原生 Chrome、Iridium、Brave 或 Firefox 浏览器。`;
        } else {
          version = Number(chromeVersion.value) || 0;

          // 建议中的 Iridium 是本人出品的 chromium 浏览器。
          if (version <= latestChromiumVersion - 30) {
            upgradeSuggestion = '你的浏览器内核版本已严重过时（Chromium ' + version + '），与最新的 Chromium 相比缺失大量核心安全补丁。梨强烈建议你立即升级浏览器。';
          } else if (version <= latestChromiumVersion - 15) {
            upgradeSuggestion = '你的浏览器内核版本落后较多（Chromium ' + version + '）。梨建议你升级到最新的 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更好的性能和安全保障。';
          } else if (version <= latestChromiumVersion - 6) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）有些落后，建议适时更新。';
          } else if (version < latestChromiumVersion) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）较新，但梨仍然建议你更新至最新的 Chrome、Iridium、Brave 或 Firefox 浏览器以获得最佳性能和安全性。';
          } else {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）处于最新前沿，能够体验最先进的网络技术。';
          }
        }
      } else if (browserType.value === '未知浏览器') {
        upgradeSuggestion = '未能从 User-Agent 确认你的浏览器内核，建议保持浏览器更新。';
      } else {
        upgradeSuggestion = '你的浏览器未使用 Chromium 内核，建议保持更新以获得最佳性能和安全性。';
      }

      if (browserType.value === '国产浏览器') {
        localSwitchSuggestion = '你正在使用国产定制浏览器，它们基于主流浏览器二次开发，往往充斥着各类广告和骚扰内容，且存在较大的隐私和安全风险。有些国产浏览器甚至在网页画面中动态插入广告。梨建议你切换到原生 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更清爽、稳定和安全的体验。';
        switchSuggestion.value = localSwitchSuggestion;
      } else if (browserType.value === '套壳浏览器') {
        localSwitchSuggestion = '你正在使用 App 内置浏览器，它们通常更新不及时、受到功能上的限制，且存在较大的隐私和安全风险。梨建议你使用原生 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更稳定和安全的体验。';
        switchSuggestion.value = localSwitchSuggestion;
      }

      if (!isFakeVersion) {
        const { supported, unsupported } = featureStats.value;
        const evaluated = supported + unsupported;
        featureSuggestion = evaluated
          ? `本次评估的 ${evaluated} 项现代 Web 特性中，有 ${supported} 项受支持（${getSupportRate()}%）。`
          : '本次没有可评估的现代 Web 特性，无法给出支持率。';
      }

      if (isFakeVersion) {
        recommendation.value = upgradeSuggestion;
      } else {
        recommendation.value = featureSuggestion;
        if (upgradeSuggestion) {
          recommendation.value += ' ' + upgradeSuggestion;
        }
      }
    };

    // 收尾不依赖动画事件，后台标签页和减少动态效果模式也能正常结束。
    const finishLoading = () => {
      if (window.browserCheckerStartup) window.browserCheckerStartup.complete();
      isFadingOut.value = true;
      if (prefersReducedMotion() || optionalValue(document, 'hidden') === true) {
        isLoading.value = false;
        return;
      }
      setTimeout(() => {
        isLoading.value = false;
      }, 800);
    };

    // 页面加载后立即检测，无需人为等待一秒。
    onMounted(async () => {
      console.log('[浏览器检测] - 初始化检测');
      try {
        // 环境检测也可能被浏览器策略或扩展干扰，必须纳入错误收尾。
        detectEnvironment();
        totalScore.value = 100;
        await checkModernFeatures();
        detectBrowserInfo();
        animateScore();
      } catch (error) {
        console.error('[浏览器检测] - 检测过程中发生错误:', error);
        detectionError.value = true;
        // 检测失败不是 50 分；不展示不完整的统计或误导性的评分。
        displayScore.value = totalScore.value = null;
        browserType.value = '';
        isChromeEngine.value = false;
        chromeVersion.value = 0;
        switchSuggestion.value = '';
        userAgent.value = '';
        detectionResults.value = [];
        skipNotices.value = [];
        recommendation.value = '检测过程中发生错误，请刷新页面重试。';
      } finally {
        finishLoading();
      }
    });

    return {
      userAgent,
      browserType,
      isChromeEngine,
      chromeVersion,
      totalScore,
      displayScore,
      detectionResults,
      recommendation,
      scoreColorClass,
      scoreColorGradient,
      isLoading,
      isFadingOut,
      detectionError,
      getSupportedFeaturesCount,
      getUnsupportedFeaturesCount,
      getSkippedFeaturesCount,
      getSupportRate,
      getStatusText,
      switchSuggestion,
      isMobileDevice,
      isIOSDevice,
      isSecureContext,
      isFileOrigin,
      isStandalonePWA,
      skipNotices
    };
  }
});

// 让未处理的渲染异常到达启动守卫，不把空白页标记为成功。
app.config.throwUnhandledErrorInProduction = true;
const root = document.getElementById('app');
app.mount(root);
if (window.browserCheckerStartup) {
  window.browserCheckerStartup.mounted();
} else {
  // 启动守卫本身被单独禁用时，若 Vue 和应用仍能运行就显示结果。
  root.hidden = false;
  const fallback = document.getElementById('startup-error');
  if (fallback) fallback.hidden = true;
}
