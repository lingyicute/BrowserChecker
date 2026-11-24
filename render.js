// 由 node scripts/compile-template.cjs 生成，请修改 templates/app.html。
window.browserCheckerRender = (function () {
  const { createElementVNode: _createElementVNode, normalizeClass: _normalizeClass, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, normalizeStyle: _normalizeStyle, createTextVNode: _createTextVNode, renderList: _renderList, Fragment: _Fragment } = Vue

  return function render(_ctx, _cache) {
    return (_openBlock(), _createElementBlock(_Fragment, null, [
      (_ctx.isLoading)
        ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: _normalizeClass(["loading-overlay", { 'fade-out': _ctx.isFadingOut }]),
            "aria-hidden": _ctx.isFadingOut ? 'true' : null,
            role: "status",
            "aria-live": "polite"
          }, [
            _createElementVNode("div", { class: "loading-content" }, [
              _createElementVNode("div", {
                class: "loader",
                "aria-hidden": "true"
              }),
              _createElementVNode("div", { class: "loading-text" }, "正在检测浏览器特性...")
            ])
          ], 10 /* CLASS, PROPS */, ["aria-hidden"]))
        : _createCommentVNode("v-if", true),
      (!_ctx.isLoading || _ctx.isFadingOut)
        ? (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "container content-loaded"
          }, [
            _createElementVNode("h1", { class: "visually-hidden" }, "浏览器检查"),
            _createElementVNode("div", { class: "score-wrapper" }, [
              _createElementVNode("div", { class: "score-section block-item block-score" }, [
                _createElementVNode("div", { class: "score-container" }, [
                  _createElementVNode("div", {
                    class: _normalizeClass(["score", _ctx.scoreColorClass])
                  }, _toDisplayString(_ctx.detectionError ? '—' : _ctx.displayScore), 3 /* TEXT, CLASS */),
                  _createElementVNode("h2", { class: "score-text" }, _toDisplayString(_ctx.detectionError ? '检测失败' : '浏览器得分'), 1 /* TEXT */)
                ]),
                _createElementVNode("div", {
                  class: "animation-container",
                  "aria-hidden": "true"
                }, [
                  _createElementVNode("div", {
                    class: "circle-loader",
                    style: _normalizeStyle({ background: _ctx.scoreColorGradient })
                  }, null, 4 /* STYLE */)
                ])
              ])
            ]),
            (_ctx.browserType === '国产浏览器' || _ctx.browserType === '套壳浏览器')
              ? (_openBlock(), _createElementBlock("div", {
                  key: 0,
                  class: "block-item block-warning"
                }, [
                  _createElementVNode("div", { class: "warning-icon" }, "⚠️"),
                  _createElementVNode("div", { class: "warning-content" }, [
                    _createElementVNode("h3", null, "检测到" + _toDisplayString(_ctx.browserType), 1 /* TEXT */),
                    _createElementVNode("p", null, _toDisplayString(_ctx.switchSuggestion), 1 /* TEXT */)
                  ])
                ]))
              : _createCommentVNode("v-if", true),
            _createElementVNode("div", { class: "block-item block-engine" }, [
              _createElementVNode("h2", null, "浏览器内核信息"),
              _createElementVNode("div", { class: "browser-info" }, [
                (!_ctx.detectionError)
                  ? (_openBlock(), _createElementBlock("p", { key: 0 }, [
                      _createElementVNode("strong", null, "浏览器类型："),
                      _createTextVNode(_toDisplayString(_ctx.browserType), 1 /* TEXT */)
                    ]))
                  : _createCommentVNode("v-if", true),
                (!_ctx.detectionError && _ctx.isChromeEngine)
                  ? (_openBlock(), _createElementBlock("p", { key: 1 }, [
                      _createElementVNode("strong", null, "Chromium 内核版本："),
                      _createTextVNode(_toDisplayString(_ctx.chromeVersion), 1 /* TEXT */)
                    ]))
                  : _createCommentVNode("v-if", true),
                _createElementVNode("div", { class: "engine-recommendation" }, [
                  _createElementVNode("p", null, _toDisplayString(_ctx.recommendation), 1 /* TEXT */)
                ]),
                (!_ctx.detectionError)
                  ? (_openBlock(), _createElementBlock("p", {
                      key: 2,
                      class: "user-agent"
                    }, [
                      _createElementVNode("strong", null, "浏览器 User-Agent："),
                      _createTextVNode(_toDisplayString(_ctx.userAgent), 1 /* TEXT */)
                    ]))
                  : _createCommentVNode("v-if", true)
              ])
            ]),
            (!_ctx.detectionError)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 1,
                  class: "block-item block-features"
                }, [
                  _createElementVNode("h2", null, "现代 Web 特性支持情况"),
                  _createElementVNode("div", { class: "features-summary" }, [
                    _createElementVNode("div", { class: "feature-stats" }, [
                      _createElementVNode("div", { class: "stat-item" }, [
                        _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.getSupportedFeaturesCount()), 1 /* TEXT */),
                        _createElementVNode("div", { class: "stat-label" }, "支持特性")
                      ]),
                      _createElementVNode("div", { class: "stat-item" }, [
                        _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.getUnsupportedFeaturesCount()), 1 /* TEXT */),
                        _createElementVNode("div", { class: "stat-label" }, "不支持特性")
                      ]),
                      _createElementVNode("div", { class: "stat-item" }, [
                        _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.getSupportRate() === null ? '—' : _ctx.getSupportRate() + '%'), 1 /* TEXT */),
                        _createElementVNode("div", { class: "stat-label" }, "支持率")
                      ]),
                      (_ctx.getSkippedFeaturesCount() > 0)
                        ? (_openBlock(), _createElementBlock("div", {
                            key: 0,
                            class: "stat-item"
                          }, [
                            _createElementVNode("div", { class: "stat-value" }, _toDisplayString(_ctx.getSkippedFeaturesCount()), 1 /* TEXT */),
                            _createElementVNode("div", { class: "stat-label" }, "已跳过")
                          ]))
                        : _createCommentVNode("v-if", true)
                    ]),
                    (_ctx.isMobileDevice)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 0,
                          class: "mobile-notice"
                        }, [
                          _createElementVNode("p", null, "⚙️ 检测到" + _toDisplayString(_ctx.isIOSDevice ? ' iOS ' : '') + "移动设备，若平台未提供某些能力，相应检测项将跳过，不计入评分", 1 /* TEXT */)
                        ]))
                      : _createCommentVNode("v-if", true),
                    (_ctx.isFileOrigin)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 1,
                          class: "mobile-notice notice-local-file"
                        }, [
                          _createElementVNode("p", null, "📄 当前页面通过 file:// 本地打开，需要网站来源的 API 已跳过；其他 API 按当前上下文检测。请通过 HTTPS 或 localhost 访问以获得完整结果")
                        ]))
                      : _createCommentVNode("v-if", true),
                    (!_ctx.isSecureContext && !_ctx.isFileOrigin)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 2,
                          class: "mobile-notice notice-insecure"
                        }, [
                          _createElementVNode("p", null, "🔒 当前页面不在安全上下文中，依赖安全上下文的 API 已跳过。请通过 HTTPS 或 localhost 访问以获得完整结果")
                        ]))
                      : _createCommentVNode("v-if", true),
                    (_ctx.skipNotices.length)
                      ? (_openBlock(), _createElementBlock("div", {
                          key: 3,
                          class: "skip-notices"
                        }, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.skipNotices, (notice) => {
                            return (_openBlock(), _createElementBlock("span", {
                              class: "skip-notice-item",
                              key: notice.reason
                            }, _toDisplayString(notice.reason) + " × " + _toDisplayString(notice.count), 1 /* TEXT */))
                          }), 128 /* KEYED_FRAGMENT */))
                        ]))
                      : _createCommentVNode("v-if", true)
                  ])
                ]))
              : _createCommentVNode("v-if", true),
            (!_ctx.detectionError)
              ? (_openBlock(), _createElementBlock("div", {
                  key: 2,
                  class: "block-item block-details"
                }, [
                  _createElementVNode("h2", { id: "details-heading" }, "详细检测结果"),
                  _createElementVNode("div", {
                    class: "detail-items-container",
                    tabindex: "0",
                    role: "region",
                    "aria-labelledby": "details-heading"
                  }, [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(_ctx.detectionResults, (item, index) => {
                      return (_openBlock(), _createElementBlock("div", {
                        class: _normalizeClass(["detail-item", { 'detail-item-skipped': item.skipped }]),
                        key: item.name,
                        style: _normalizeStyle({ animationDelay: `${Math.min(index, 12) * 0.03}s` })
                      }, [
                        _createElementVNode("div", { class: "detail-name" }, [
                          _createTextVNode(_toDisplayString(item.name) + " ", 1 /* TEXT */),
                          (item.skipped)
                            ? (_openBlock(), _createElementBlock("span", {
                                key: 0,
                                class: "detail-reason"
                              }, _toDisplayString(item.reason), 1 /* TEXT */))
                            : _createCommentVNode("v-if", true)
                        ]),
                        _createElementVNode("div", {
                          class: _normalizeClass(["detail-status", { supported: item.supported, skipped: item.skipped }])
                        }, _toDisplayString(_ctx.getStatusText(item)), 3 /* TEXT, CLASS */)
                      ], 6 /* CLASS, STYLE */))
                    }), 128 /* KEYED_FRAGMENT */))
                  ])
                ]))
              : _createCommentVNode("v-if", true)
          ]))
        : _createCommentVNode("v-if", true)
    ], 64 /* STABLE_FRAGMENT */))
  }
}());
