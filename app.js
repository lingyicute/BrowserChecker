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
    
    // 获取支持的特性数量
    const getSupportedFeaturesCount = () => {
      if (!detectionResults.value.length) return 0;
      return detectionResults.value.filter(item => item.supported).length;
    };
    
    // 获取不支持的特性数量
    const getUnsupportedFeaturesCount = () => {
      if (!detectionResults.value.length) return 0;
      return detectionResults.value.filter(item => !item.supported).length;
    };
    
    // 获取特性支持率（百分比）
    const getSupportRate = () => {
      if (!detectionResults.value.length) return 0;
      const supportedCount = getSupportedFeaturesCount();
      return Math.round((supportedCount / detectionResults.value.length) * 100);
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
    
    // 检测是否为移动设备
    const detectMobileDevice = () => {
      const ua = navigator.userAgent;
      isMobileDevice.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      console.log(`[浏览器检测] - 设备类型: ${isMobileDevice.value ? '移动设备' : '桌面设备'}`);
      return isMobileDevice.value;
    };
    
    // 检测现代Web功能
    const checkModernFeatures = () => {
      console.log('[浏览器检测] - 开始检测Web特性');
      console.log('[浏览器检测] - 用户代理:', navigator.userAgent);
      
      const features = [
        { name: 'ES6 支持', test: () => {
          try {
            new Function('() => {}; let x = 1; const y = 2;');
            return true;
          } catch (e) {
            return false;
          }
        }},
        { name: 'Fetch API', test: () => typeof window.fetch === 'function' },
        { name: 'Promise', test: () => typeof window.Promise === 'function' },
        { name: 'Service Worker', test: () => 'serviceWorker' in navigator },
        { name: 'WebAssembly', test: () => typeof WebAssembly === 'object' },
        { name: 'Async/Await', test: () => {
          try {
            new Function('async () => { await Promise.resolve(); }');
            return true;
          } catch (e) {
            return false;
          }
        }},
        { name: 'Intersection Observer', test: () => 'IntersectionObserver' in window },
        { name: 'Web Animation API', test: () => 'animate' in HTMLElement.prototype },
        { name: 'CSS Grid', test: () => {
          const div = document.createElement('div');
          return div.style.grid !== undefined || div.style.gridTemplate !== undefined;
        }},
        { name: 'CSS Variables', test: () => !!(window.CSS && CSS.supports('--a', '0')) },
        { name: 'WebGL 2.0', test: () => {
          try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('webgl2');
          } catch (e) {
            return false;
          }
        }},
        { name: 'WebRTC', test: () => !!(window.RTCPeerConnection || window.webkitRTCPeerConnection) },
        { name: 'Web Speech API', test: () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window },
        { name: 'Web Share API', test: () => 'share' in navigator },
        { name: 'Payment Request API', test: () => 'PaymentRequest' in window },
        { name: 'Pointer Events', test: () => 'PointerEvent' in window },
        { name: 'Web Audio API', test: () => 'AudioContext' in window || 'webkitAudioContext' in window },
        { name: 'WebXR Device API', test: () => 'xr' in navigator },
        { name: 'WebUSB', test: () => 'usb' in navigator },
        { name: 'Web Bluetooth', test: () => 'bluetooth' in navigator },
        { name: 'WebAuthn', test: () => 'credentials' in navigator && 'PublicKeyCredential' in window },
        { name: 'Geolocation API', test: () => 'geolocation' in navigator },
        { name: 'IndexedDB', test: () => 'indexedDB' in window },
        { name: 'Web Notifications', test: () => 'Notification' in window },
        { name: 'Screen Orientation API', test: () => 'orientation' in screen || 'orientation' in window },
        { name: 'Gamepad API', test: () => 'getGamepads' in navigator },
        { name: 'Web Components', test: () => 'customElements' in window },
        { name: '支持视频格式 WebM', test: () => {
          const video = document.createElement('video');
          return !!(video.canPlayType && video.canPlayType('video/webm; codecs="vp8, vorbis"'));
        }},
        { name: '支持音频格式 AAC', test: () => {
          const audio = document.createElement('audio');
          return !!(audio.canPlayType && audio.canPlayType('audio/aac'));
        }},
        { name: 'requestAnimationFrame', test: () => 'requestAnimationFrame' in window },
        { name: 'Storage API', test: () => 'localStorage' in window && 'sessionStorage' in window },
        { name: 'Clipboard API', test: () => typeof navigator.clipboard !== 'undefined' },
        { name: 'ResizeObserver', test: () => 'ResizeObserver' in window },
        { name: 'Performance API', test: () => 'performance' in window },
        { name: '支持图像格式 WebP', test: () => {
          const elem = document.createElement('canvas');
          if (!elem.getContext || !elem.getContext('2d')) return false;
          return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        }},
        { name: '支持图像格式 AVIF', test: () => {
          try {
            const elem = document.createElement('canvas');
            if (!elem.getContext || !elem.getContext('2d')) return false;
            return elem.toDataURL('image/avif').indexOf('data:image/avif') === 0;
          } catch (e) {
            return false;
          }
        }},
        { name: 'URL.createObjectURL', test: () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' },
        { name: 'Web Locks API', test: () => 'locks' in navigator },
        { name: 'File System Access API', test: () => 'showOpenFilePicker' in window },
        { name: 'CSS :has() 选择器', test: () => !!(window.CSS && CSS.supports('selector(:has(*))')) },
        { name: 'CSS 容器查询', test: () => !!(window.CSS && CSS.supports('container-type: inline-size')) },
        { name: 'CSS 嵌套规则', test: () => !!(window.CSS && CSS.supports('selector(&)')) },
        { name: 'CSS aspect-ratio', test: () => !!(window.CSS && CSS.supports('aspect-ratio: 1/1')) },
        { name: 'CSS color-mix()', test: () => !!(window.CSS && CSS.supports('color: color-mix(in srgb, red, blue)')) },
        { name: 'WebGPU API', test: () => 'gpu' in navigator },
        { name: 'WebTransport API', test: () => 'WebTransport' in window },
        { name: 'Compression Streams API', test: () => 'CompressionStream' in window },
        { name: 'Cookie Store API', test: () => 'cookieStore' in window },
        { name: 'Idle Detection API', test: () => 'IdleDetector' in window },
        { name: 'Web MIDI API', test: () => 'requestMIDIAccess' in navigator },
        { name: 'Reporting API', test: () => 'ReportingObserver' in window },
        { name: 'Screen Wake Lock API', test: () => 'wakeLock' in navigator },
        { name: 'EyeDropper API', test: () => 'EyeDropper' in window },
        { name: 'ScrollTimeline / ViewTimeline', test: () => 'ScrollTimeline' in window || 'ViewTimeline' in window },
        { name: 'MediaSession API', test: () => 'mediaSession' in navigator },
        { name: 'Credential Management API', test: () => 'credentials' in navigator },
        // --- 针对 Chromium 120-150 新增的新特性检测 ---
        { name: 'Popover API', test: () => 'popover' in HTMLElement.prototype },
        { name: 'View Transitions API', test: () => 'startViewTransition' in document },
        { name: 'CSS light-dark()', test: () => !!(window.CSS && CSS.supports('color: light-dark(white, black)')) },
        { name: 'Speculation Rules API', test: () => HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules') }
      ];
      
      // 检测每项功能并记录结果
      detectionResults.value = features.map(feature => {
        let supported = false;
        try {
          supported = feature.test();
        } catch (e) {
          supported = false;
        }
        
        if (!supported) {
          totalScore.value -= 2; // 微调扣分系数，适应更多检测项
        }
        return {
          name: feature.name,
          supported
        };
      });
      
      // 对检测结果按照支持状态和名称排序
      detectionResults.value.sort((a, b) => {
        if (a.supported !== b.supported) {
          return a.supported ? -1 : 1;
        }
        return a.name.localeCompare(b.name, 'zh-CN');
      });
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
    
    // 页面加载时运行检测
    onMounted(() => {
      console.log('[浏览器检测] - 初始化检测');
      detectMobileDevice();
      
      setTimeout(() => {
        try {
          // 重置分数基准
          totalScore.value = 100;
          
          checkModernFeatures();
          detectBrowserInfo();
          
          setTimeout(() => {
            document.querySelectorAll('.detail-item').forEach((item, index) => {
              item.style.animationDelay = `${index * 0.03}s`;
            });
          }, 100);
          
          animateScore();
          
          setTimeout(() => {
            document.querySelector('.loading-overlay')?.classList.add('fade-out');
            setTimeout(() => {
              isLoading.value = false;
            }, 800);
          }, 500);
        } catch (error) {
          console.error('[浏览器检测] - 检测过程中发生错误:', error);
          document.querySelector('.loading-overlay')?.classList.add('fade-out');
          setTimeout(() => {
            isLoading.value = false;
          }, 800);
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
      getSupportRate,
      switchSuggestion,
      isMobileDevice
    };
  }
});

// 挂载Vue应用
app.mount('#app');
