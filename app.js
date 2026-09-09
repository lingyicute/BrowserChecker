// 创建Vue应用
const { createApp, ref, computed, onMounted } = Vue;

const app = createApp({
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
      if (totalScore.value === 100) return 'score-green';
      if (totalScore.value >= 80) return 'score-yellow';
      if (totalScore.value >= 70) return 'score-orange';
      return 'score-red';
    });

    // 计算属性：动画背景颜色
    const scoreColorGradient = computed(() => {
      if (totalScore.value === 100) return 'radial-gradient(circle, #22c55e, #16a34a)';
      if (totalScore.value >= 80) return 'radial-gradient(circle, #eab308, #ca8a04)';
      if (totalScore.value >= 70) return 'radial-gradient(circle, #f97316, #ea580c)';
      return 'radial-gradient(circle, #ef4444, #dc2626)';
    });

    // 参与计分的检测项（排除已跳过项）
    const getEvaluatedResults = () => detectionResults.value.filter(item => !item.skipped);

    // 获取支持的特性数量
    const getSupportedFeaturesCount = () => {
      return getEvaluatedResults().filter(item => item.supported).length;
    };

    // 获取不支持的特性数量
    const getUnsupportedFeaturesCount = () => {
      return getEvaluatedResults().filter(item => !item.supported).length;
    };

    // 获取跳过的特性数量
    const getSkippedFeaturesCount = () => {
      return detectionResults.value.filter(item => item.skipped).length;
    };

    // 获取特性支持率（百分比，不计入跳过项）
    const getSupportRate = () => {
      const evaluated = getEvaluatedResults();
      if (!evaluated.length) return 0;
      return Math.round((getSupportedFeaturesCount() / evaluated.length) * 100);
    };

    // 检测项状态文字
    const getStatusText = (item) => {
      if (item.skipped) return '已跳过';
      return item.supported ? '支持' : '不支持';
    };

    // 数字滚动动画
    const animateScore = () => {
      const duration = 1500; // 动画持续时间(毫秒)
      const startTime = Date.now();
      const targetScore = totalScore.value;

      const updateScore = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;

        if (elapsed < duration) {
          // 使用easeOutExpo缓动函数使动画更加自然
          const progress = 1 - Math.pow(1 - (elapsed / duration), 4);
          displayScore.value = Math.round(progress * targetScore);
          requestAnimationFrame(updateScore);
        } else {
          displayScore.value = targetScore;
        }
      };

      updateScore();
    };

    // 检测运行环境（设备类型 / 平台 / 安全上下文）
    const detectEnvironment = () => {
      const ua = navigator.userAgent;
      const uaData = navigator.userAgentData;

      // iPadOS 13+ 的 Safari 默认伪装成 Macintosh，结合触控点数判断
      const isIPadOSDesktopUA = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

      isIOSDevice.value = /iPhone|iPad|iPod/i.test(ua) || isIPadOSDesktopUA;

      const uaSaysMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
      isMobileDevice.value = !!(uaData && uaData.mobile) || uaSaysMobile || isIOSDevice.value;

      // 桌面 Linux（不含 Android / ChromeOS）
      isLinuxDesktop.value = !isMobileDevice.value && /Linux|X11/i.test(ua) && !/Android|CrOS/i.test(ua);

      isFileOrigin.value = location.protocol === 'file:';
      isSecureContext.value = window.isSecureContext === true;
      const standaloneDisplay = typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches;
      isStandalonePWA.value = !!(standaloneDisplay || navigator.standalone === true);

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

    // 图片解码检测
    const testImageDecode = (dataUri) => new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), 2000);
      img.onload = () => { clearTimeout(timer); resolve(img.width > 0 && img.height > 0); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = dataUri;
    });

    const WEBP_SAMPLE = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    const AVIF_SAMPLE = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

    // 检测现代Web功能
    // 每个检测项可选字段：
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
        { name: 'Service Worker', secure: true, test: () => 'serviceWorker' in navigator },
        { name: 'WebAssembly', test: () => typeof WebAssembly === 'object' },
        { name: 'Async/Await', test: () => {
          try {
            new Function('async () => { await Promise.resolve(); }');
            return true;
          } catch (e) {
            return e instanceof EvalError;
          }
        }},
        { name: 'Intersection Observer', test: () => 'IntersectionObserver' in window },
        { name: 'Web Animation API', test: () => 'animate' in HTMLElement.prototype },
        { name: 'CSS Grid', test: () => !!(window.CSS && CSS.supports('display', 'grid')) },
        { name: 'CSS Variables', test: () => !!(window.CSS && CSS.supports('--a', '0')) },
        { name: 'WebGL 2.0', test: () => {
          // 若连 WebGL 1.0 都不可用，说明是 GPU 加速被禁用/远程桌面等环境问题，而非浏览器过时
          const canvas = document.createElement('canvas');
          let gl2 = null;
          let gl1 = null;
          try { gl2 = canvas.getContext('webgl2'); } catch (e) { gl2 = null; }
          if (gl2) return true;
          try {
            gl1 = document.createElement('canvas').getContext('webgl') ||
                  document.createElement('canvas').getContext('experimental-webgl');
          } catch (e) { gl1 = null; }
          if (!gl1) {
            return { skipped: true, reason: '当前环境无法创建 WebGL 上下文，无法评估' };
          }
          return false;
        }},
        { name: 'WebRTC', test: () => !!(window.RTCPeerConnection || window.webkitRTCPeerConnection) },
        { name: 'Web Speech API', test: () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window },
        { name: 'Web Share API', secure: true, skipOnLinuxDesktop: true, test: () => 'share' in navigator },
        { name: 'Payment Request API', secure: true, test: () => 'PaymentRequest' in window },
        { name: 'Pointer Events', test: () => 'PointerEvent' in window },
        { name: 'Web Audio API', test: () => 'AudioContext' in window || 'webkitAudioContext' in window },
        { name: 'WebXR Device API', secure: true, skipOnIOS: true, test: () => 'xr' in navigator },
        { name: 'WebUSB', secure: true, skipOnIOS: true, test: () => 'usb' in navigator },
        { name: 'Web Bluetooth', secure: true, skipOnIOS: true, test: () => 'bluetooth' in navigator },
        { name: 'WebAuthn', secure: true, test: () => 'credentials' in navigator && 'PublicKeyCredential' in window },
        { name: 'Geolocation API', test: () => 'geolocation' in navigator },
        { name: 'IndexedDB', test: () => 'indexedDB' in window },
        { name: 'Web Notifications', secure: true,
          // iOS 的 Notifications API 主要面向已添加到主屏幕的 Web App。
          // 普通标签页跳过，主屏幕 Web App 则进行实际检测。
          skipIf: () => (isIOSDevice.value && !isStandalonePWA.value)
            ? 'iOS 普通标签页不支持，请添加到主屏幕后再检测'
            : null,
          test: () => 'Notification' in window },
        { name: 'Screen Orientation API', test: () => 'orientation' in screen || 'orientation' in window },
        { name: 'Gamepad API', test: () => 'getGamepads' in navigator },
        { name: 'Web Components', test: () => 'customElements' in window },
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
        { name: 'requestAnimationFrame', test: () => 'requestAnimationFrame' in window },
        { name: 'Storage API', test: () => 'localStorage' in window && 'sessionStorage' in window },
        { name: 'Clipboard API', secure: true, test: () => typeof navigator.clipboard !== 'undefined' },
        { name: 'ResizeObserver', test: () => 'ResizeObserver' in window },
        { name: 'Performance API', test: () => 'performance' in window },
        // 图片格式：改为真实解码测试
        // 原先的 canvas.toDataURL 只能检测“编码”能力
        // Chrome 至今不支持编码 AVIF、Safari 也长期不支持编码 WebP，导致假阳性
        { name: '支持图像格式 WebP', test: () => testImageDecode(WEBP_SAMPLE) },
        { name: '支持图像格式 AVIF', test: () => testImageDecode(AVIF_SAMPLE) },
        { name: 'URL.createObjectURL', test: () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' },
        { name: 'Web Locks API', secure: true, test: () => 'locks' in navigator },
        // 新版 Chromium Android 已逐步提供文件选择器；这里使用能力检测，
        // 不再把整个 File System Access API 一刀切为桌面专属。
        { name: 'File System Access API', secure: true, test: () => 'showOpenFilePicker' in window },
        { name: 'CSS :has() 选择器', test: () => !!(window.CSS && CSS.supports('selector(:has(*))')) },
        { name: 'CSS 容器查询', test: () => !!(window.CSS && CSS.supports('container-type: inline-size')) },
        { name: 'CSS 嵌套规则', test: () => !!(window.CSS && CSS.supports('selector(&)')) },
        { name: 'CSS aspect-ratio', test: () => !!(window.CSS && CSS.supports('aspect-ratio: 1/1')) },
        { name: 'CSS color-mix()', test: () => !!(window.CSS && CSS.supports('color: color-mix(in srgb, red, blue)')) },
        { name: 'WebGPU API', secure: true, test: () => 'gpu' in navigator },
        { name: 'WebTransport API', secure: true, test: () => 'WebTransport' in window },
        { name: 'Compression Streams API', test: () => 'CompressionStream' in window },
        { name: 'Cookie Store API', secure: true, test: () => 'cookieStore' in window },
        { name: 'Idle Detection API', secure: true, skipOnIOS: true, test: () => 'IdleDetector' in window },
        { name: 'Web MIDI API', secure: true, skipOnIOS: true, test: () => 'requestMIDIAccess' in navigator },
        { name: 'Reporting API', test: () => 'ReportingObserver' in window },
        { name: 'Screen Wake Lock API', secure: true, test: () => 'wakeLock' in navigator },
        { name: 'EyeDropper API', secure: true, desktopOnly: true, test: () => 'EyeDropper' in window },
        { name: 'ScrollTimeline / ViewTimeline', test: () => 'ScrollTimeline' in window || 'ViewTimeline' in window },
        { name: 'MediaSession API', test: () => 'mediaSession' in navigator },
        { name: 'Credential Management API', secure: true, test: () => 'credentials' in navigator },
        // --- 针对 Chromium 120-150 新增的新特性检测 ---
        { name: 'Popover API', test: () => 'popover' in HTMLElement.prototype },
        { name: 'View Transitions API', test: () => 'startViewTransition' in document },
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
          supported = false;
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
      const isWebView = /WeChat|MicroMessenger|QQ|xweb/i.test(ua);

      if (isChinaBrowser) {
        browserType.value = '国产浏览器';
        totalScore.value -= 30;
      } else if (isWebView) {
        browserType.value = '套壳浏览器';
        totalScore.value -= 15;
      } else if (/firefox/i.test(ua)) {
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

        // 国内/WebView如果汇报高于110，判定为虚标伪装
        const isUnreliableVersion = (isChinaBrowser || isWebView) && reportedVersion > 110;

        const realVersion = isUnreliableVersion ? 103 : reportedVersion;

        if (isUnreliableVersion) {
          chromeVersion.value = `恶意伪装成 ${reportedVersion} 的 ${realVersion}`;
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

        if (typeof chromeVersion.value === 'string' && chromeVersion.value.includes('伪装')) {
          version = 103;
          isFakeVersion = true;
          upgradeSuggestion = `你的浏览器正在恶意伪装更高版本，实际使用的是严重过时的 Chromium 内核（估测为 103 左右），存在重大安全风险。梨强烈建议你立即切换到原生 Chrome、Iridium、Brave 或 Firefox 浏览器。`;
        } else {
          version = Number(chromeVersion.value) || 0;

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
        localSwitchSuggestion = '你正在使用国产定制浏览器，它们基于主流浏览器二次开发，往往充斥着各类广告和骚扰内容，且存在较大的隐私和安全风险。梨建议你切换到原生 Chrome、Edge、Brave 或 Firefox 浏览器以获得更清爽、稳定和安全的体验。';
        switchSuggestion.value = localSwitchSuggestion;
      } else if (browserType.value === '套壳浏览器') {
        localSwitchSuggestion = '你正在使用 App 内置浏览器，它们通常更新不及时、受到功能上的限制，且存在较大的隐私和安全风险。梨建议你使用原生 Chrome、Edge 或 Firefox 浏览器以获得更稳定和安全的体验。';
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

    // 收尾：淡出加载动画
    const finishLoading = () => {
      document.querySelector('.loading-overlay')?.classList.add('fade-out');
      setTimeout(() => {
        isLoading.value = false;
      }, 800);
    };

    // 页面加载时运行检测
    onMounted(() => {
      console.log('[浏览器检测] - 初始化检测');
      detectEnvironment();

      setTimeout(async () => {
        try {
          // 重置分数基准
          totalScore.value = 100;

          await checkModernFeatures();
          detectBrowserInfo();

          setTimeout(() => {
            document.querySelectorAll('.detail-item').forEach((item, index) => {
              item.style.animationDelay = `${index * 0.03}s`;
            });
          }, 100);

          animateScore();

          setTimeout(finishLoading, 500);
        } catch (error) {
          console.error('[浏览器检测] - 检测过程中发生错误:', error);
          finishLoading();
          displayScore.value = totalScore.value = 50;
          recommendation.value = '检测过程中发生错误，请刷新页面重试。';
        }
      }, 1000);
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
