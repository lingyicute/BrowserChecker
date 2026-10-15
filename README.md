# Browser Checker

这是一个简单的网页应用，用于检测访问者浏览器的现代化程度并给出评分。

## 功能特点

- 检测 Chromium 内核版本
- 检测 60 项现代 Web API 和特性
- 识别套壳浏览器和国产浏览器
- 根据检测结果，给出评分和建议
- 响应式设计，适合移动端访问
- 流畅的动画效果

## 检测内容

该应用会检测以下内容：

1. 现代 Web 功能（如 ES6、Fetch API、WebAssembly 等）
2. 浏览器用户代理信息
3. 是否为中国企业制作的“套壳”浏览器
4. 是否为应用内 WebView
5. Chromium 内核版本（如果适用）

## 评分规则

- 起始分数为 100 分
- 每缺少一项现代 Web 功能扣 2 分
- 如果是国产浏览器，扣 30 分
- 如果是套壳浏览器，扣 20 分
- 根据 Chromium 版本视情况扣分

以上规则可以叠加扣分，最低分为 0。

## 跳过规则（避免假阳性）

以下情况的检测项会被标记为「已跳过」，不计入扣分与支持率：

- **非安全上下文**：依赖安全上下文的 API（例如 Service Worker、Clipboard、WebUSB、WebGPU、Wake Lock 等）在非 HTTPS 或非可信本地来源下不检测。`localhost` 等可信本地来源仍可参与检测。
- **本地文件**：通过 `file://` 直接打开页面时，依赖网站来源的 API 会被跳过；建议通过 HTTPS 或 `localhost` 访问以获得完整结果。
- **移动端**：EyeDropper API 等明确仅桌面端提供的功能在移动端跳过。
- **iOS / iPadOS**：在常见 WebKit 环境下，WebUSB、Web Bluetooth、WebXR、Idle Detection、Web MIDI、Speculation Rules 等不可用的功能会被跳过。
- **iOS 通知**：普通 iOS 标签页不检测 Web Notifications；已添加到主屏幕并以独立 Web App 运行时可进行实际检测。
- **桌面 Linux**：Web Share API 在该平台的浏览器实现受操作系统能力限制，因此不计入评分。
- **图片解码受限**：图片样本被 CSP 拦截或解码超时时跳过；明确解码失败才视为不支持。
- **网站存储受限**：存储被安全策略限制或配额耗尽时跳过。检测会对 localStorage / sessionStorage 写入并清理临时键，不覆盖已有键。
- **GPU / WebGL 环境**：若当前环境连 WebGL 1.0 上下文也无法创建，则跳过 WebGL 2.0 检测，因为无法区分浏览器能力与 GPU、驱动、远程桌面或系统策略的影响。

## 使用方法

直接在本地打开 index.html 或访问 [官方网站](https://test.92li.uk) 即可使用。

## 文件结构

- `index.html` - 主 HTML 文件
- `style.css` - 样式表
- `app.js` - Vue.js 应用和检测逻辑
- `startup.js` - 不依赖 Vue 的启动失败提示和超时保护
- `tests/` - 单元测试、跨浏览器回归测试及策略锁定基线
- `playwright.config.cjs` - Chromium / Firefox / WebKit 测试配置

## 开发与测试

页面仍然是无需构建的静态网站；Node.js / npm 仅用于开发测试。

```sh
# Node.js 20+（CI 使用 22）
npm ci
npm test
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

浏览器测试以本地锁定的 Vue npm 文件替代 CDN 响应，保留浏览器原生 SRI 校验，不依赖 CDN 在线状态。真实 CDN 的可达性仍需部署后检查。

Pull Request 自动运行回归测试；主分支 Pages 部署也必须先通过相同测试。部署只发布 `index.html`、`style.css`、`app.js`、`startup.js`，不发布测试及 npm 依赖。

## 检测范围与运行限制

- 分数是本站规则下的特性可用性评估，不是性能基准测试，也不是完整安全审计。API 存在不等于已经授权、具有硬件支持，或所有调用都能成功；检测不会申请摄像头、定位、蓝牙等权限。
- 浏览器识别依赖 User-Agent。品牌和版本可被伪装，iOS Firefox 的 `FxiOS` 被识别为 Firefox，但不会因此标记为 Gecko 内核。
- 运行时使用固定版本的 Vue 生产构建并启用 SRI。首次打开（包括 `file://`）仍需网络访问 CDN；离线使用需自行保存对应依赖并调整引用。更新 Vue 时请同步 URL、`package.json` / lockfile、SRI 和测试中的 URL。
- 当前使用 Vue 的 DOM 模板运行时编译器，严格禁止 `unsafe-eval` 的 CSP 无法启动完整页面。

## License

AGPL-3.0