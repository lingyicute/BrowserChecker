// 独立于 Vue，保留 ES5 语法：依赖不可达、脚本无法解析时也能显示错误。
(function () {
  var finished = false;
  var timer = setTimeout(fail, 15000);

  function fail() {
    if (finished) return;
    clearTimeout(timer);
    var errorEl = document.getElementById('startup-error');
    if (errorEl) errorEl.hidden = false;
    if (document.body) document.body.classList.add('startup-failed');
  }

  // 离线使用时依赖文件可能被改名（README 允许“自行保存依赖并调整引用”），
  // 因此除默认文件名外，还要匹配启动脚本标签的实际 src。
  function isStartupScriptUrl(url) {
    if (!url) return false;
    if (/(?:^|\/)(app|vue\.global\.prod)\.js(?:[?#]|$)/.test(url)) return true;
    var ids = ['vue-script', 'app-script'];
    for (var i = 0; i < ids.length; i++) {
      var script = document.getElementById(ids[i]);
      if (script && script.src && script.src === url) return true;
    }
    return false;
  }

  function onError(event) {
    if (!event) return;
    var target = event.target;
    if ((target && (target.id === 'vue-script' || target.id === 'app-script')) ||
        isStartupScriptUrl(event.filename)) {
      fail();
    }
  }

  function onPolicyViolation(event) {
    if (event.disposition === 'enforce' &&
        event.effectiveDirective === 'script-src' &&
        event.blockedURI === 'eval') {
      fail();
    }
  }

  window.addEventListener('error', onError, true);
  document.addEventListener('securitypolicyviolation', onPolicyViolation);
  window.browserCheckerStartup = {
    complete: function () {
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('error', onError, true);
      document.removeEventListener('securitypolicyviolation', onPolicyViolation);
      var errorEl = document.getElementById('startup-error');
      if (errorEl) errorEl.hidden = true;
      if (document.body) document.body.classList.remove('startup-failed');
    }
  };
}());
