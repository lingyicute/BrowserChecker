const { createApp, ref, computed, onMounted } = Vue;

const app = createApp({
  // 本页模板没有自定义元素。避免编译器自动调用受限的 customElements.get，
  // 否则某个待检测 API 不可用会在挂载前使整页崩溃。
  compilerOptions: { isCustomElement: () => false },
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
    const detectionError = ref(false);
    const displayScore = ref(0);
    const isMobileDevice = ref(false);
    const isIOSDevice = ref(false);
    const isLinuxDesktop = ref(false);
    const isSecureContext = ref(true);
    const isFileOrigin = ref(false);
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
      return evaluated ? Math.round((supported / evaluated) * 100) : 0;
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

    const animateScore = () => {
      const targetScore = totalScore.value;
      if (typeof window.requestAnimationFrame !== 'function' || prefersReducedMotion() ||
          document.hidden) {
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
        document.removeEventListener('visibilitychange', onVisibilityChange);
        try {
          if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
        } catch (e) { /* 已排队的回调也会检查 settled，不再覆盖最终分数。 */ }
      };
      const onVisibilityChange = () => { if (document.hidden) finish(); };
      const updateScore = (timestamp) => {
        if (settled) return;
        // 使用 rAF 的单调时间戳，避免系统时间回拨导致负分或动画迟迟不结束。
        if (startTime === undefined) startTime = timestamp;
        const progress = Math.max(0, Math.min(1, (timestamp - startTime) / duration));
        displayScore.value = Math.round((1 - Math.pow(1 - progress, 4)) * targetScore);
        if (progress < 1) scheduleFrame();
        else finish();
      };
      const scheduleFrame = () => {
        try {
          frame = window.requestAnimationFrame(updateScore);
        } catch (e) {
          finish();
        }
      };
      // 第一帧和中途停帧都必须有兜底；进入后台时立即完成，避免停在部分分数。
      displayScore.value = targetScore;
      timer = setTimeout(finish, duration + 100);
      document.addEventListener('visibilitychange', onVisibilityChange);
      scheduleFrame();
    };

    // 隐私扩展可能只拦截某一个 getter；可选提示失败不能使整页检测失败。
    const optionalValue = (object, property) => {
      try { return object && object[property]; } catch (e) { return undefined; }
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
      isSecureContext.value = window.isSecureContext === true;
      const standaloneDisplay = matchesMedia('(display-mode: standalone)');
      isStandalonePWA.value = !!(standaloneDisplay || optionalValue(navigator, 'standalone') === true);

      console.log(`[浏览器检测] - 设备类型: ${isMobileDevice.value ? '移动设备' : '桌面设备'}`);
      console.log(`[浏览器检测] - iOS: ${isIOSDevice.value}, 桌面 Linux: ${isLinuxDesktop.value}, 安全上下文: ${isSecureContext.value}, file://: ${isFileOrigin.value}`);
      return isMobileDevice.value;
    };

    // 判断某个检测项在当前环境下是否应当跳过，返回跳过原因或 null
    const getSkipReason = (feature) => {
      if (feature.secure && (isFileOrigin.value || !isSecureContext.value)) {
        if (isFileOrigin.value) {
          return 'file:// 本地页面没有可用于该 API 的网站来源';
        }
        return '需要安全上下文（HTTPS 或可信的本地来源）';
      }
      if (feature.desktopOnly && isMobileDevice.value) {
        return '移动端不提供此 API';
      }
      if (feature.skipOnIOS && isIOSDevice.value) {
        return '当前 iOS 浏览器环境不提供此 API';
      }
      if (feature.skipOnLinuxDesktop && isLinuxDesktop.value) {
        return '桌面 Linux 平台默认不提供此 API';
      }
      // 只信任浏览器明确认识且明确禁止的策略名称，未知策略不能当作“不支持”。
      // 不查询/申请用户权限，也不改变 API 正常可检测时的评分。
      if (feature.policy) {
        try {
          const policy = document.permissionsPolicy || document.featurePolicy;
          if (policy && typeof policy.features === 'function' &&
              typeof policy.allowsFeature === 'function' &&
              policy.features().includes(feature.policy) && !policy.allowsFeature(feature.policy)) {
            return '被页面权限策略（Permissions Policy）禁用';
          }
        } catch (e) { /* 不支持策略 introspection 的浏览器仍执行原能力检测。 */ }
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
      const img = new Image();
      let settled = false;
      let errorTimer;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(errorTimer);
        img.onload = img.onerror = null;
        // 清理属于尽力而为；不能在 settled 后抛错，导致 Promise 永远无法完成。
        try { document.removeEventListener('securitypolicyviolation', onPolicyViolation); } catch (e) {}
        try { img.removeAttribute('src'); } catch (e) {}
        resolve(result);
      };
      const onPolicyViolation = (event) => {
        if (event.disposition === 'enforce' && event.effectiveDirective === 'img-src' &&
            (event.blockedURI === 'data' || event.blockedURI === dataUri)) {
          finish({ skipped: true, reason: '图片解码样本被内容安全策略（CSP）阻止' });
        }
      };
      const timer = setTimeout(() => finish({
        skipped: true, reason: '图片解码超时，无法评估当前格式支持情况'
      }), 2000);
      try {
        document.addEventListener('securitypolicyviolation', onPolicyViolation);
        img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
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
          if (!storage || typeof storage.setItem !== 'function') return false;
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
          if (storage.getItem(key) !== key) return false;
        } catch (error) {
          if (error.name === 'SecurityError' || error.name === 'QuotaExceededError' ||
              error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            return { skipped: true, reason: '网站存储被安全策略限制或配额已用尽' };
          }
          return false;
        } finally {
          if (written) {
            try { storage.removeItem(key); } catch (e) { /* 策略可能在检测期间变化。 */ }
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
          'InvalidStateError', 'UnknownError'].includes(error.name);
        finish(limited ? restricted : false);
      };
      try {
        factory = window.indexedDB;
        if (!factory || typeof factory.open !== 'function') { finish(false); return; }
        timer = setTimeout(() => finish({ skipped: true, reason: 'IndexedDB 检测超时，无法评估' }), 2000);
        request = factory.open(name);
        request.onblocked = () => finish(restricted);
        request.onerror = () => { if (!settled) fail(request.error); };
        request.onupgradeneeded = (event) => {
          // 万一名称碰撞，不读写、更不删除已有数据库；超时后的升级直接回滚。
          if (settled || event.oldVersion !== 0) {
            request.transaction.abort();
            if (!settled) finish(restricted);
            return;
          }
          created = true;
          // 升级写入可能异步触发 QuotaExceededError，open 请求随后只报告 AbortError。
          // 保留原始事务错误，避免把存储限制误算为浏览器缺少 IndexedDB。
          const upgrade = request.transaction;
          upgrade.onabort = () => { if (!settled) fail(upgrade.error); };
          try {
            request.result.createObjectStore('probe').put('ok', 'probe');
          } catch (error) {
            request.transaction.abort();
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
            transaction.oncomplete = () => finish(read.result === 'ok');
            transaction.onabort = () => fail(transaction.error);
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

    // 检测现代Web功能
    // 每个检测项可选字段：
    //   policy            - 对应 Permissions Policy；页面明确禁用时跳过
    //   secure            - 需要安全上下文（HTTPS），非 HTTPS 下跳过
    //   desktopOnly       - 当前确实仅桌面端提供，移动端跳过
    //   skipOnIOS         - 常见 iOS WebKit 环境不提供，跳过
    //   skipOnLinuxDesktop- 桌面 Linux 平台默认不提供，跳过
    //   skipIf            - 根据当前运行形态返回跳过原因
    // test 可以返回布尔值、Promise<boolean>，或返回 { skipped: true, reason } 表示运行时判定为环境限制
    const checkModernFeatures = async () => {
      console.log('[浏览器检测] - 开始检测Web特性');
      console.log('[浏览器检测] - 用户代理:', navigator.userAgent);

      const features = [
        { name: 'ES6 支持', test: () => {
          try {
            new Function('() => {}; let x = 1; const y = 2;');
            return true;
          } catch (e) {
            // 被 CSP 禁止 eval 时会抛出 EvalError，此时本脚本自身（使用了箭头函数/const）能运行即说明支持
            return e instanceof EvalError;
          }
        }},
        { name: 'Fetch API', test: () => typeof window.fetch === 'function' },
        { name: 'Promise', test: () => typeof window.Promise === 'function' },
        { name: 'Service Worker', secure: true, test: () => hasMethods(navigator.serviceWorker, ['register']) },
        { name: 'WebAssembly', test: () => hasMethods(window.WebAssembly, ['compile', 'instantiate']) },
        { name: 'Async/Await', test: () => {
          try {
            new Function('async () => { await Promise.resolve(); }');
            return true;
          } catch (e) {
            return e instanceof EvalError;
          }
        }},
        { name: 'Intersection Observer', test: () => typeof window.IntersectionObserver === 'function' },
        { name: 'Web Animation API', test: () => typeof HTMLElement.prototype.animate === 'function' },
        { name: 'CSS Grid', test: () => !!(window.CSS && CSS.supports('display', 'grid')) },
        { name: 'CSS Variables', test: () => !!(window.CSS && CSS.supports('--a', '0')) },
        { name: 'WebGL 2.0', test: () => {
          // 若连 WebGL 1.0 都不可用，说明是 GPU 加速被禁用/远程桌面等环境问题，而非浏览器过时
          const canvas = document.createElement('canvas');
          let gl2 = null;
          let gl1 = null;
          try { gl2 = canvas.getContext('webgl2'); } catch (e) { gl2 = null; }
          if (gl2) {
            releaseWebGLContext(gl2);
            return true;
          }
          try {
            gl1 = document.createElement('canvas').getContext('webgl') ||
                  document.createElement('canvas').getContext('experimental-webgl');
          } catch (e) { gl1 = null; }
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
        { name: 'WebXR Device API', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.xr, ['requestSession']) },
        { name: 'WebUSB', policy: 'usb', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.usb, ['requestDevice']) },
        { name: 'Web Bluetooth', policy: 'bluetooth', secure: true, skipOnIOS: true, test: () => hasMethods(navigator.bluetooth, ['requestDevice']) },
        { name: 'WebAuthn', secure: true, test: () => hasMethods(navigator.credentials, ['get', 'create']) && typeof window.PublicKeyCredential === 'function' },
        { name: 'Geolocation API', policy: 'geolocation', secure: true, test: () => hasMethods(navigator.geolocation, ['getCurrentPosition']) },
        { name: 'IndexedDB', test: testIndexedDB },
        { name: 'Web Notifications', secure: true,
          // iOS 的 Notifications API 主要面向已添加到主屏幕的 Web App。
          // 普通标签页跳过，主屏幕 Web App 则进行实际检测。
          skipIf: () => (isIOSDevice.value && !isStandalonePWA.value)
            ? 'iOS 普通标签页不支持，请添加到主屏幕后再检测'
            : null,
          test: () => typeof window.Notification === 'function' },
        { name: 'Screen Orientation API', test: () => !!(screen.orientation &&
          typeof screen.orientation.type === 'string' && typeof screen.orientation.angle === 'number') },
        { name: 'Gamepad API', policy: 'gamepad', secure: true, test: () => typeof navigator.getGamepads === 'function' },
        { name: 'Web Components', test: () => hasMethods(window.customElements, ['define', 'get']) },
        { name: '支持视频格式 WebM', test: () => {
          const video = document.createElement('video');
          if (!video.canPlayType) return false;
          return !!(video.canPlayType('video/webm; codecs="vp8, vorbis"') ||
                    video.canPlayType('video/webm; codecs="vp9, opus"') ||
                    video.canPlayType('video/webm'));
        }},
        { name: '支持音频格式 AAC', test: () => {
          const audio = document.createElement('audio');
          if (!audio.canPlayType) return false;
          return !!(audio.canPlayType('audio/aac') ||
                    audio.canPlayType('audio/mp4; codecs="mp4a.40.2"') ||
                    audio.canPlayType('audio/x-m4a'));
        }},
        { name: 'requestAnimationFrame', test: () => typeof window.requestAnimationFrame === 'function' },
        { name: 'Storage API', test: testStorage },
        { name: 'Clipboard API', secure: true, test: () => {
          const clipboard = navigator.clipboard;
          return !!clipboard && ['read', 'readText', 'write', 'writeText']
            .some(method => typeof clipboard[method] === 'function');
        } },
        { name: 'ResizeObserver', test: () => typeof window.ResizeObserver === 'function' },
        { name: 'Performance API', test: () => hasMethods(window.performance, ['now']) },
        // 图片格式：改为真实解码测试
        // 原先的 canvas.toDataURL 只能检测“编码”能力
        // Chrome 至今不支持编码 AVIF、Safari 也长期不支持编码 WebP，导致假阳性
        { name: '支持图像格式 WebP', test: () => testImageDecode(WEBP_SAMPLE) },
        { name: '支持图像格式 AVIF', test: () => testImageDecode(AVIF_SAMPLE) },
        { name: 'URL.createObjectURL', test: () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' },
        { name: 'Web Locks API', secure: true, test: () => hasMethods(navigator.locks, ['request']) },
        // 新版 Chromium Android 已逐步提供文件选择器；这里使用能力检测，
        // 不再把整个 File System Access API 一刀切为桌面专属。
        { name: 'File System Access API', secure: true, test: () => typeof window.showOpenFilePicker === 'function' },
        { name: 'CSS :has() 选择器', test: () => !!(window.CSS && CSS.supports('selector(:has(*))')) },
        { name: 'CSS 容器查询', test: () => !!(window.CSS && CSS.supports('container-type: inline-size')) },
        { name: 'CSS 嵌套规则', test: () => !!(window.CSS && CSS.supports('selector(&)')) },
        { name: 'CSS aspect-ratio', test: () => !!(window.CSS && CSS.supports('aspect-ratio: 1/1')) },
        { name: 'CSS color-mix()', test: () => !!(window.CSS && CSS.supports('color: color-mix(in srgb, red, blue)')) },
        { name: 'WebGPU API', secure: true, test: () => hasMethods(navigator.gpu, ['requestAdapter']) },
        { name: 'WebTransport API', secure: true, test: () => typeof window.WebTransport === 'function' },
        { name: 'Compression Streams API', test: () => typeof window.CompressionStream === 'function' },
        { name: 'Cookie Store API', secure: true, test: () => hasMethods(window.cookieStore, ['get', 'set']) },
        { name: 'Idle Detection API', policy: 'idle-detection', secure: true, skipOnIOS: true, test: () => typeof window.IdleDetector === 'function' },
        { name: 'Web MIDI API', policy: 'midi', secure: true, skipOnIOS: true, test: () => typeof navigator.requestMIDIAccess === 'function' },
        { name: 'Reporting API', test: () => typeof window.ReportingObserver === 'function' },
        { name: 'Screen Wake Lock API', policy: 'screen-wake-lock', secure: true, test: () => hasMethods(navigator.wakeLock, ['request']) },
        { name: 'EyeDropper API', secure: true, desktopOnly: true, test: () => typeof window.EyeDropper === 'function' },
        { name: 'ScrollTimeline / ViewTimeline', test: () => typeof window.ScrollTimeline === 'function' || typeof window.ViewTimeline === 'function' },
        { name: 'MediaSession API', test: () => hasMethods(navigator.mediaSession, ['setActionHandler']) },
        { name: 'Credential Management API', secure: true, test: () => hasMethods(navigator.credentials, ['get', 'create']) },
        // --- 针对 Chromium 120-150 新增的新特性检测 ---
        { name: 'Popover API', test: () => 'popover' in HTMLElement.prototype },
        { name: 'View Transitions API', test: () => typeof document.startViewTransition === 'function' },
        { name: 'CSS light-dark()', test: () => !!(window.CSS && CSS.supports('color: light-dark(white, black)')) },
        { name: 'Speculation Rules API', skipOnIOS: true, test: () => !!(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) }
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

        return { name: feature.name, supported, skipped, reason };
      }));

      results.forEach(item => {
        if (!item.skipped && !item.supported) {
          totalScore.value -= 2; // 微调扣分系数，适应更多检测项
        }
      });

      // 汇总跳过原因，用于页面提示
      const reasonCount = {};
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

    // 检测浏览器类型和版本
    const detectBrowserInfo = () => {
      const ua = navigator.userAgent;
      userAgent.value = ua;

      console.log('[浏览器检测] - 开始分析浏览器类型和版本');

      const isChinaBrowser = /HeyTap|Quark|baidu|xweb|miuibrowser|mibrowser/i.test(ua);
      const isWebView = /WeChat|MicroMessenger|QQ/i.test(ua);

      if (isWebView) {
        browserType.value = '套壳浏览器';
        totalScore.value -= 20;
      } else if (isChinaBrowser) {
        browserType.value = '国产浏览器';
        totalScore.value -= 30;
      } else if (/firefox|fxios/i.test(ua)) {
        browserType.value = 'Firefox';
      } else if (/edg|edge/i.test(ua)) {
        browserType.value = 'Edge';
      } else if (/opera|opr/i.test(ua)) {
        browserType.value = 'Opera';
      } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
        browserType.value = 'Safari';
      } else if (/chrome|crios/i.test(ua)) {
        browserType.value = 'Chromium';
      } else {
        browserType.value = '未知浏览器';
      }

      // 检测Chromium内核版本
      const chromeMatch = ua.match(/chrome\/(\d+)/i);
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

        // 版本打分阶梯
        if (version >= 145 && version <= 150) {
          // 最新的 145 - 150 版本，不扣分
        } else if (version >= 138 && version <= 144) {
          totalScore.value -= 10;
        } else if (version >= 130 && version <= 137) {
          totalScore.value -= 20;
        } else if (version >= 120 && version <= 129) {
          totalScore.value -= 30;
        } else if (version >= 110 && version <= 119) {
          totalScore.value -= 40;
        } else if (version < 110) {
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
          if (version <= 120) {
            upgradeSuggestion = '你的浏览器内核版本已严重过时（Chromium ' + version + '），与最新的 Chromium 相比缺失大量核心安全补丁。梨强烈建议你立即升级浏览器。';
          } else if (version <= 135) {
            upgradeSuggestion = '你的浏览器内核版本落后较多（Chromium ' + version + '）。梨建议你升级到最新的 Chrome、Iridium、Brave 或 Firefox 浏览器以获得更好的性能和安全保障。';
          } else if (version <= 144) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）有些落后，建议适时更新。';
          } else if (version <= 149) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）较新，但梨仍然建议你更新至最新的 Chrome、Iridium、Brave 或 Firefox 浏览器以获得最佳性能和安全性。';
          } else {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）处于最新前沿，能够体验最先进的网络技术。';
          }
        }
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
        const supportRate = getSupportRate();

        if (supportRate <= 50) {
          featureSuggestion = '你的浏览器仅支持 ' + supportRate + '% 的现代 Web 特性，大多数现代网站可能无法正常工作。';
        } else if (supportRate <= 70) {
          featureSuggestion = '你的浏览器支持 ' + supportRate + '% 的现代 Web 特性，许多新型网站可能会出现兼容性问题。';
        } else if (supportRate <= 85) {
          featureSuggestion = '你的浏览器支持 ' + supportRate + '% 的现代 Web 特性，大部分网站能正常使用，但可能缺少一些新功能。';
        } else if (supportRate < 95) {
          featureSuggestion = '你的浏览器支持 ' + supportRate + '% 的现代 Web 特性，能够流畅使用大多数网站。';
        } else {
          featureSuggestion = '你的浏览器支持 ' + supportRate + '% 的现代 Web 特性，能够流畅体验几乎所有最新的 Web 功能。';
        }
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
      document.querySelector('.loading-overlay')?.classList.add('fade-out');
      setTimeout(() => {
        isLoading.value = false;
      }, prefersReducedMotion() ? 0 : 800);
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

// 挂载Vue应用
app.mount('#app');
