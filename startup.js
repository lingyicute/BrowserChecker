// 独立于 Vue，保留 ES5 语法：依赖不可达、脚本无法解析时也能显示错误。
(function () {
  var finished = false;
  var timer = setTimeout(fail, 15000);

  function fail() {
    if (finished) return;
    clearTimeout(timer);
    document.getElementById('startup-error').hidden = false;
    document.body.classList.add('startup-failed');
  }

  function onError(event) {
    var target = event.target;
    if ((target && (target.id === 'vue-script' || target.id === 'app-script')) ||
        (event.filename && /\/(app|vue\.global\.prod)\.js(?:[?#]|$)/.test(event.filename))) {
      fail();
    }
  }

  window.addEventListener('error', onError, true);
  window.browserCheckerStartup = {
    complete: function () {
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('error', onError, true);
      document.getElementById('startup-error').hidden = true;
      document.body.classList.remove('startup-failed');
    }
  };
}());
