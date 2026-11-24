// 独立于 Vue，保留 ES5 语法：依赖不可达、脚本无法解析时也能显示错误。
(function () {
  var errorEl = document.getElementById('startup-error');
  var loadingEl = document.getElementById('startup-loading');
  var appEl = document.getElementById('app');
  var scriptIds = ['vue-script', 'render-script', 'app-script'];
  var failed = false;
  var finished = false;
  var timer;

  function hide(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function stopWatching() {
    clearTimeout(timer);
    window.removeEventListener('error', onError, true);
  }

  function fail() {
    if (finished || failed) return;
    failed = true;
    stopWatching();
    hide(errorEl, false);
    hide(loadingEl, true);
    hide(appEl, true);
  }

  function onError(event) {
    if (!event) return;
    for (var i = 0; i < scriptIds.length; i++) {
      var script = document.getElementById(scriptIds[i]);
      // 比对实际标签和 URL，既支持离线改名，也不把同名的扩展脚本误判为本项目脚本。
      if (script && (event.target === script || (script.src && script.src === event.filename))) {
        fail();
        return;
      }
    }
  }

  window.addEventListener('error', onError, true);
  timer = setTimeout(fail, 15000);
  hide(errorEl, true);
  hide(loadingEl, false);
  window.browserCheckerStartup = {
    mounted: function () {
      hide(loadingEl, true);
      if (!failed) hide(appEl, false);
    },
    fail: fail,
    complete: function () {
      finished = true;
      stopWatching();
      hide(errorEl, true);
      hide(loadingEl, true);
      hide(appEl, false);
    }
  };
}());
