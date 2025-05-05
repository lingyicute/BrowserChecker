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
    
    // 安全测试一个特性
    const safeTest = (testFn, featureName) => {
      try {
        const result = testFn();
        if (!result) {
          console.log(`[浏览器检测] - 特性 "${featureName}" 不支持`);
        }
        return result;
      } catch (e) {
        console.log(`[浏览器检测] - 特性 "${featureName}" 检测发生错误:`, e.message);
        return false;
      }
    };
    
    // 检测现代Web功能
    const checkModernFeatures = () => {
      console.log('[浏览器检测] - 开始检测Web特性');
      console.log('[浏览器检测] - 用户代理:', navigator.userAgent);
      
      const features = [
        { name: 'ES6 支持', test: () => {
          try {
            // 测试箭头函数、let、const等
            new Function('() => {}; let x = 1; const y = 2;');
            return true;
          } catch (e) {
            console.log('[浏览器检测] - ES6支持检测失败:', e.message);
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
            console.log('[浏览器检测] - Async/Await检测失败:', e.message);
            return false;
          }
        }},
        { name: 'Intersection Observer', test: () => 'IntersectionObserver' in window },
        { name: 'Web Animation API', test: () => 'animate' in HTMLElement.prototype },
        { name: 'CSS Grid', test: () => {
          const div = document.createElement('div');
          return div.style.grid !== undefined || div.style.gridTemplate !== undefined;
        }},
        { name: 'CSS Variables', test: () => window.CSS && CSS.supports('--a', '0') },
        { name: 'WebGL 2.0', test: () => {
          try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('webgl2');
          } catch (e) {
            console.log('[浏览器检测] - WebGL 2.0检测失败:', e.message);
            return false;
          }
        }},
        { name: 'WebRTC', test: () => !!(window.RTCPeerConnection || window.webkitRTCPeerConnection) },
        { name: 'Web Speech API', test: () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window },
        { name: 'Web Share API', test: () => 'share' in navigator },
        { name: 'Payment Request API', test: () => 'PaymentRequest' in window },
        { name: 'Pointer Events', test: () => 'PointerEvent' in window },
        { name: 'Web Audio API', test: () => 'AudioContext' in window || 'webkitAudioContext' in window },
        { name: 'WebVR/WebXR', test: () => 'getVRDisplays' in navigator || 'xr' in navigator },
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
          const result = video.canPlayType && video.canPlayType('video/webm; codecs="vp8, vorbis"') !== '';
          if (!result) {
            console.log('[浏览器检测] - WebM视频支持检测值:', video.canPlayType && video.canPlayType('video/webm; codecs="vp8, vorbis"'));
          }
          return result;
        }},
        { name: '支持音频格式 AAC', test: () => {
          const audio = document.createElement('audio');
          const result = audio.canPlayType && audio.canPlayType('audio/aac;') !== '';
          if (!result) {
            console.log('[浏览器检测] - AAC音频支持检测值:', audio.canPlayType && audio.canPlayType('audio/aac;'));
          }
          return result;
        }},
        { name: 'requestAnimationFrame', test: () => 'requestAnimationFrame' in window },
        { name: 'Storage API', test: () => 'localStorage' in window && 'sessionStorage' in window },
        { name: 'Clipboard API', test: () => {
          const result = typeof navigator.clipboard !== 'undefined';
          if (!result) {
            console.log('[浏览器检测] - Clipboard API 不存在，navigator.clipboard =', navigator.clipboard);
          }
          return result;
        }},
        { name: 'ResizeObserver', test: () => 'ResizeObserver' in window },
        { name: 'Performance API', test: () => 'performance' in window },
        { name: '支持图像格式 WebP', test: () => {
          // 正确的WebP检测
          const elem = document.createElement('canvas');
          if (!elem.getContext || !elem.getContext('2d')) {
            console.log('[浏览器检测] - WebP检测失败: canvas 2d上下文不可用');
            return false;
          }
          const result = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
          if (!result) {
            console.log('[浏览器检测] - WebP检测结果:', elem.toDataURL('image/webp').substring(0, 30) + '...');
          }
          return result;
        }},
        { name: '支持图像格式 AVIF', test: () => {
          // 只能通过特性检测间接判断AVIF支持
          try {
            const img = new Image();
            const result = 'decode' in img && 'loading' in img;
            if (!result) {
              console.log('[浏览器检测] - AVIF检测: Image对象不完全支持新特性, decode:', 'decode' in img, ', loading:', 'loading' in img);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - AVIF检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'URL.createObjectURL', test: () => {
          const result = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
          if (!result) {
            console.log('[浏览器检测] - URL.createObjectURL不支持: URL对象:', typeof URL, ', createObjectURL方法:', typeof URL !== 'undefined' ? typeof URL.createObjectURL : 'N/A');
          }
          return result;
        }},
        { name: 'Web Locks API', test: () => {
          const result = 'locks' in navigator;
          if (!result) {
            console.log('[浏览器检测] - Web Locks API不支持: navigator.locks不存在');
          }
          return result;
        }},
        { name: 'File System Access API', test: () => {
          const result = 'showOpenFilePicker' in window;
          if (!result) {
            console.log('[浏览器检测] - File System Access API不支持: window.showOpenFilePicker不存在');
          }
          return result;
        }},
        { name: 'CSS :has() 选择器', test: () => {
          try {
            const result = window.CSS && CSS.supports('selector(:has(*))');
            if (!result) {
              console.log('[浏览器检测] - CSS :has()选择器不支持: CSS.supports可用:', !!window.CSS);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - CSS :has()选择器检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'CSS 容器查询', test: () => {
          try {
            const result = window.CSS && CSS.supports('container-type: inline-size');
            if (!result) {
              console.log('[浏览器检测] - CSS容器查询不支持: CSS.supports可用:', !!window.CSS);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - CSS容器查询检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'CSS 嵌套规则', test: () => {
          try {
            const result = window.CSS && CSS.supports('selector(&)');
            if (!result) {
              console.log('[浏览器检测] - CSS嵌套规则不支持: CSS.supports可用:', !!window.CSS);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - CSS嵌套规则检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'CSS aspect-ratio', test: () => {
          try {
            const result = window.CSS && CSS.supports('aspect-ratio: 1/1');
            if (!result) {
              console.log('[浏览器检测] - CSS aspect-ratio不支持: CSS.supports可用:', !!window.CSS);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - CSS aspect-ratio检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'CSS color-mix()', test: () => {
          try {
            const result = window.CSS && CSS.supports('color: color-mix(in srgb, red, blue)');
            if (!result) {
              console.log('[浏览器检测] - CSS color-mix()不支持: CSS.supports可用:', !!window.CSS);
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - CSS color-mix()检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'WebGPU API', test: () => {
          const result = 'gpu' in navigator;
          if (!result) {
            console.log('[浏览器检测] - WebGPU API不支持: navigator.gpu不存在');
          }
          return result;
        }},
        { name: 'WebTransport API', test: () => {
          const result = 'WebTransport' in window;
          if (!result) {
            console.log('[浏览器检测] - WebTransport API不支持: window.WebTransport不存在');
          }
          return result;
        }},
        { name: 'Compression Streams API', test: () => {
          const result = 'CompressionStream' in window;
          if (!result) {
            console.log('[浏览器检测] - Compression Streams API不支持: window.CompressionStream不存在');
          }
          return result;
        }},
        { name: 'Cookie Store API', test: () => {
          const result = 'cookieStore' in window;
          if (!result) {
            console.log('[浏览器检测] - Cookie Store API不支持: window.cookieStore不存在');
          }
          return result;
        }},
        { name: 'Idle Detection API', test: () => {
          const result = 'IdleDetector' in window;
          if (!result) {
            console.log('[浏览器检测] - Idle Detection API不支持: window.IdleDetector不存在');
          }
          return result;
        }},
        { name: 'Web MIDI API', test: () => {
          const result = 'requestMIDIAccess' in navigator;
          if (!result) {
            console.log('[浏览器检测] - Web MIDI API不支持: navigator.requestMIDIAccess不存在');
          }
          return result;
        }},
        { name: 'Reporting API', test: () => {
          const result = 'ReportingObserver' in window;
          if (!result) {
            console.log('[浏览器检测] - Reporting API不支持: window.ReportingObserver不存在');
          }
          return result;
        }},
        { name: 'Screen Wake Lock API', test: () => {
          const result = 'wakeLock' in navigator;
          if (!result) {
            console.log('[浏览器检测] - Screen Wake Lock API不支持: navigator.wakeLock不存在');
          }
          return result;
        }},
        { name: 'EyeDropper API', test: () => {
          const result = 'EyeDropper' in window;
          if (!result) {
            console.log('[浏览器检测] - EyeDropper API不支持: window.EyeDropper不存在');
          }
          return result;
        }},
        { name: 'ScrollTimeline API', test: () => {
          try {
            const result = 'ScrollTimeline' in window || 
              (HTMLElement.prototype.animate && 'scroll' in document.createElement('div').animate());
            if (!result) {
              console.log('[浏览器检测] - ScrollTimeline API不支持: window.ScrollTimeline存在:', 'ScrollTimeline' in window, 
                          ', animate.scroll存在:', HTMLElement.prototype.animate ? 'scroll' in document.createElement('div').animate() : 'animate不存在');
            }
            return result;
          } catch (e) {
            console.log('[浏览器检测] - ScrollTimeline API检测发生错误:', e.message);
            return false;
          }
        }},
        { name: 'MediaSession API', test: () => {
          const result = 'mediaSession' in navigator;
          if (!result) {
            console.log('[浏览器检测] - MediaSession API不支持: navigator.mediaSession不存在');
          }
          return result;
        }},
        { name: 'Credential Management API', test: () => {
          const result = 'credentials' in navigator;
          if (!result) {
            console.log('[浏览器检测] - Credential Management API不支持: navigator.credentials不存在');
          }
          return result;
        }}
      ];
      
      // 检测每项功能并记录结果
      detectionResults.value = features.map(feature => {
        const supported = feature.test();
        if (!supported) {
          // 每缺少一项功能扣3分
          totalScore.value -= 3;
        }
        return {
          name: feature.name,
          supported
        };
      });
      
      // 对检测结果按照支持状态和名称排序，便于阅读
      detectionResults.value.sort((a, b) => {
        // 首先按照支持状态排序（支持的在前）
        if (a.supported !== b.supported) {
          return a.supported ? -1 : 1;
        }
        // 如果支持状态相同，则按名称字母顺序排序
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      
      // 输出不支持的功能数量统计
      const unsupportedCount = detectionResults.value.filter(item => !item.supported).length;
      console.log(`[浏览器检测] - 总共检测 ${features.length} 项特性，不支持 ${unsupportedCount} 项，支持率: ${Math.round((features.length - unsupportedCount) / features.length * 100)}%`);
    };
    
    // 检测浏览器类型和版本
    const detectBrowserInfo = () => {
      const ua = navigator.userAgent;
      userAgent.value = ua;
      
      console.log('[浏览器检测] - 开始分析浏览器类型和版本');
      
      // 检测是否是中国企业制作的"套壳"浏览器
      const isChinaBrowser = /HeyTap|Quark|baidu|xweb|miuibrowser|mibrowser/i.test(ua);
      if (isChinaBrowser) {
        console.log('[浏览器检测] - 检测到国产浏览器，匹配特征:', 
                   ua.match(/HeyTap|Quark|baidu|xweb|miuibrowser|mibrowser/i)[0]);
      }
      
      // 检测是否是应用内webview
      const isWebView = /WeChat|MicroMessenger|QQ|xweb/i.test(ua);
      if (isWebView) {
        console.log('[浏览器检测] - 检测到套壳浏览器，匹配特征:', 
                   ua.match(/WeChat|MicroMessenger|QQ|xweb/i)[0]);
      }
      
      // 设置浏览器类型
      if (isChinaBrowser) {
        browserType.value = '国产浏览器';
        totalScore.value -= 30;
        console.log('[浏览器检测] - 因国产浏览器特征扣除30分');
      } else if (isWebView) {
        browserType.value = '套壳浏览器';
        totalScore.value -= 15;
        console.log('[浏览器检测] - 因套壳浏览器特征扣除15分');
      } else if (/firefox/i.test(ua)) {
        browserType.value = 'Firefox';
        console.log('[浏览器检测] - 识别为Firefox浏览器');
      } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        browserType.value = 'Safari';
        console.log('[浏览器检测] - 识别为Safari浏览器');
      } else if (/edge/i.test(ua)) {
        browserType.value = 'Edge';
        console.log('[浏览器检测] - 识别为Edge浏览器');
      } else if (/chrome/i.test(ua)) {
        browserType.value = 'Chromium';
        console.log('[浏览器检测] - 识别为Chromium浏览器');
      } else if (/opera/i.test(ua) || /opr/i.test(ua)) {
        browserType.value = 'Opera';
        console.log('[浏览器检测] - 识别为Opera浏览器');
      } else {
        browserType.value = '未知浏览器';
        console.log('[浏览器检测] - 未能识别浏览器类型');
      }
      
      // 检测Chromium内核版本
      const chromeMatch = ua.match(/chrome\/(\d+)/i);
      if (chromeMatch && chromeMatch[1]) {
        isChromeEngine.value = true;
        const reportedVersion = parseInt(chromeMatch[1], 10);
        const isUnreliableVersion = (isChinaBrowser || isWebView) && reportedVersion > 110;
        
        // 国产/套壳浏览器且版本>110时，使用103作为实际版本
        const realVersion = isUnreliableVersion ? 103 : reportedVersion;
        
        // 记录伪装版本信息
        if (isUnreliableVersion) {
          chromeVersion.value = `伪装成 ${reportedVersion} 的 ${realVersion}`;
          console.log(`[浏览器检测] - 检测到国产/套壳浏览器伪装版本: 报告 ${reportedVersion}, 实际估计为 103`);
        } else {
          chromeVersion.value = realVersion;
          console.log(`[浏览器检测] - 检测到Chromium内核版本: ${realVersion}`);
        }
        
        // 根据Chromium版本扣分 (使用实际版本)
        const version = isUnreliableVersion ? 103 : reportedVersion;
        if (version >= 131 && version <= 132) {
          totalScore.value -= 10;
          console.log('[浏览器检测] - Chromium版本 131-132，扣除10分');
        } else if (version >= 126 && version <= 130) {
          totalScore.value -= 15;
          console.log('[浏览器检测] - Chromium版本 126-130，扣除15分');
        } else if (version >= 121 && version <= 125) {
          totalScore.value -= 20;
          console.log('[浏览器检测] - Chromium版本 121-125，扣除20分');
        } else if (version >= 111 && version <= 120) {
          totalScore.value -= 30;
          console.log('[浏览器检测] - Chromium版本 111-120，扣除30分');
        } else if (version >= 101 && version <= 110) {
          totalScore.value -= 40;
          console.log('[浏览器检测] - Chromium版本 101-110，扣除40分');
        } else if (version <= 100) {
          totalScore.value -= 50;
          console.log('[浏览器检测] - Chromium版本 ≤100，扣除50分');
        } else {
          console.log('[浏览器检测] - Chromium版本 >132，不扣分');
        }
      } else {
        console.log('[浏览器检测] - 未检测到Chromium内核版本');
      }
      
      // 确保分数不会低于0
      if (totalScore.value < 0) {
        console.log(`[浏览器检测] - 总分低于0，调整为0`);
        totalScore.value = 0;
      }
      
      console.log(`[浏览器检测] - 最终分数: ${totalScore.value}`);
      
      // 生成建议
      generateRecommendation();
    };
    
    // 生成建议
    const generateRecommendation = () => {
      let upgradeSuggestion = '';
      let localSwitchSuggestion = '';
      let featureSuggestion = '';
      
      // 根据内核版本决定是否需要升级浏览器
      if (isChromeEngine.value) {
        let version;
        
        // 处理伪装版本的情况
        if (typeof chromeVersion.value === 'string' && chromeVersion.value.includes('伪装')) {
          // 当检测到伪装版本时，使用固定的103版本
          version = 103;
          upgradeSuggestion = `你的浏览器正在恶意伪装更高版本，实际使用的是严重过时的 Chromium 内核（估计为103），存在重大安全风险，强烈建议切换到原生 Chrome、Iridium 或 Firefox 浏览器。`;
        } else {
          version = chromeVersion.value;
          
          if (version <= 115) {
            upgradeSuggestion = '你的浏览器内核版本已严重过时（Chromium ' + version + '），存在重大安全风险，强烈建议立即升级浏览器。';
          } else if (version <= 122) {
            upgradeSuggestion = '你的浏览器内核版本有些落后（Chromium ' + version + '），建议升级到最新版本以获得更好的性能和安全保障。';
          } else if (version <= 130) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）略有落后，建议适时更新。';
          } else if (version <= 132) {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）较新，但仍可更新以获得最佳的性能和安全保障。';
          } else {
            upgradeSuggestion = '你的浏览器内核版本（Chromium ' + version + '）非常新，可以体验最前沿的网络技术。';
          }
        }
      } else {
        // 非Chromium内核浏览器
        upgradeSuggestion = '你的浏览器未使用 Chromium 内核，建议保持更新以获得最佳性能和安全性。';
      }
      
      // 根据浏览器类型决定是否需要切换浏览器
      if (browserType.value === '国产浏览器') {
        localSwitchSuggestion = '你正在使用国产定制浏览器，它们基于主流浏览器二次开发，往往充斥着各类广告和骚扰内容，且存在较大的隐私和安全风险。梨建议你切换到原生 Chrome、Iridium 或 Firefox 浏览器以获得更清爽、稳定和安全的体验。';
        // 设置switchSuggestion的值，用于警告块显示
        switchSuggestion.value = localSwitchSuggestion;
      } else if (browserType.value === '套壳浏览器') {
        localSwitchSuggestion = '你正在使用 App 内置浏览器，它们通常更新不及时、受到功能上的限制，且存在较大的隐私和安全风险。梨建议你使用原生 Chrome、Iridium 或 Firefox 浏览器以获得更稳定和安全的体验。';
        // 设置switchSuggestion的值，用于警告块显示
        switchSuggestion.value = localSwitchSuggestion;
      }
      
      // 根据功能支持情况提供建议
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
        featureSuggestion = '你的浏览器支持 ' + supportRate + '% 的现代 Web 特性，能够流畅使用绝大多数网站。';
      }
      
      // 组合建议
      recommendation.value = featureSuggestion;
      
      if (upgradeSuggestion) {
        recommendation.value += ' ' + upgradeSuggestion;
      }
      
      console.log('[浏览器检测] - 生成的建议:', recommendation.value);
    };
    
    // 页面加载时运行检测
    onMounted(() => {
      console.log('[浏览器检测] - 初始化检测');
      // 设置一个固定延迟后进行检测，不再依赖load事件
      setTimeout(() => {
        try {
          checkModernFeatures();
          detectBrowserInfo();
          
          // 创建检测项目的动画序列效果
          setTimeout(() => {
            document.querySelectorAll('.detail-item').forEach((item, index) => {
              item.style.animationDelay = `${index * 0.03}s`;
            });
          }, 100);
          
          // 启动分数动画
          animateScore();
          
          // 隐藏加载动画 - 改为使用CSS的淡出类
          setTimeout(() => {
            // 添加淡出类，让动画覆盖层淡出
            document.querySelector('.loading-overlay').classList.add('fade-out');
            // 淡出动画结束后再隐藏元素
            setTimeout(() => {
              isLoading.value = false;
              console.log('[浏览器检测] - 检测完成，隐藏加载动画');
            }, 800); // 与CSS过渡持续时间相同
          }, 500);
        } catch (error) {
          console.error('[浏览器检测] - 检测过程中发生错误:', error);
          // 出错时也要隐藏加载动画
          document.querySelector('.loading-overlay').classList.add('fade-out');
          setTimeout(() => {
            isLoading.value = false;
          }, 800);
          // 设置默认分数
          displayScore.value = totalScore.value = 50;
          recommendation.value = '检测过程中发生错误，请刷新页面重试。';
        }
      }, 1000);
    });
    
    // 返回数据给模板
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
      switchSuggestion
    };
  }
});

// 挂载Vue应用
app.mount('#app'); 