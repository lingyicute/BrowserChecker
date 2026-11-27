<br>
<br>
<br>
<br>
<p align="center">
  <img src="./favicon.svg" alt="Logo" width="96" height="96"/>
<h1 align="center">Browser Checker</h1>
<h3 align="center">你的浏览器，现在有几分?</h3>

<p align="center">一个轻量、开箱即用的网页小工具：只需打开页面，即可全面体检浏览器的现代 Web 能力，并获得直观的评分与建议。</p>
<p align="center">Made with ❤️ by <a href="https://github.com/lingyicute">lingyicute</a>.</p>
<br>
<br>
<p align="center">
  🇨🇳 中文 •
  <a href="https://github.com/lingyicute/BrowserChecker">🌐 Source Code</a> •
  <a href="https://github.com/lingyicute/BrowserChecker/issues">🐛 Report Bug</a>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange.svg" alt="License: AGPL-3.0"></a>
  <a href="./index.html"><img src="https://img.shields.io/badge/Build-None-brightgreen" alt="No build step"></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/Vue-3.5.44-42b883" alt="Vue 3.5.44"></a>
  <a href="./tests"><img src="https://img.shields.io/badge/Tests-Unit%20%2B%20Playwright-blue" alt="Unit and Playwright tests"></a>
  <a href="https://github.com/lingyicute/BrowserChecker"><img src="https://img.shields.io/github/stars/lingyicute/BrowserChecker?style=flat&color=yellow" alt="GitHub Stars"></a>
</p>
<br>

## 📖 Overview

点开页面，体检即刻开始：它能精准识别你的浏览器类型与内核版本，全面检测 105 项现代 Web 能力，智能分辨国产浏览器、套壳浏览器及应用内 WebView，最终将结果汇总为一个 0–100 的直观分数和几条实用的升级建议。

这是一个**无需构建的纯静态网站**，运行时仅由 `index.html`、`style.css`、`app.js`、`startup.js`、预生成的 `render.js` 和 `favicon.svg` 驱动。**没有后端、无需账号、零追踪**，可随时部署到任意静态托管平台。你也可以直接在本地打开 `index.html`，或立即访问官方站点 [test.92li.uk](https://test.92li.uk) 在线体验。

<br>

## ✨ Features

- **🔍 105 项现代 Web 能力检测**
  - 既覆盖 ES6、Fetch API、WebAssembly 等基础特性，也囊括 Navigation API、`Math.sumPrecise()`、`Iterator.concat()`、`Intl.Locale` 信息 API、CSS `field-sizing` 与 `:open` 等前沿特性。
  - 包含 Temporal、Set 集合运算、Iterator Helpers、Float16Array、Uint8Array Base64 等 ES2025+ 内置能力，`@scope`、`@starting-style`、锚点定位、`subgrid` 等 Baseline CSS 能力，以及声明式 Shadow DOM、Invoker Commands、URLPattern、WebCodecs、Web Crypto 等现代平台 API。
  - 同时检测 `Promise.withResolvers()`、`Promise.try()`、`Array.fromAsync()`、集合分组、`Error.isError()`、CSS 分层与相对颜色、类型化 `attr()`、离散过渡、对话框关闭请求、OPFS、Sanitizer 等新锐能力。
  - 每项结果均清晰标记为「支持 / 不支持 / 已跳过」，并附带具体的跳过原因。

- **🧭 浏览器与内核信息**
  - 显示浏览器类型、Chromium 内核版本（如适用）和 User-Agent。
  - 内置版本分档基准（当前参考 Chrome 158 Stable），无需联网查询即可根据你的内核版本给出精准的升级建议。

- **🚩 国产 / 套壳浏览器识别**
  - 识别中国厂商浏览器与套壳浏览器，并给出切换建议。

- **📊 友好评分**
  - 起始 100 分，缺一项现代能力扣 2 分。
  - 国产浏览器扣 30 分，套壳浏览器扣 20 分，Chromium 版本过低也会扣分。
  - 各类扣分可以叠加，最低为 0 分。

- **📱 响应式与可访问**
  - 完美适配手机、平板和桌面端屏幕。
  - 窄屏下特性名称自动换行，详情区域支持完整的键盘聚焦与滚动操作。
  - 尊重系统的「减少动态效果」设置，后台运行时直接展示最终分数；装饰性动画克制，绝不无限循环。
  - 内容默认可见；即使你的自定义样式禁用了 CSS 动画，依然能正常查看所有检测结果。

- **🛡️ 尽量避免假阳性**
  - 严格校验构造函数和对象接口的可调用性，绝不把 `undefined`、`null` 或空壳占位符误判为支持；同时保持克制，检测过程不会主动调用任何权限敏感接口。
  - 在非安全上下文、`file://` 协议、移动端、iOS / iPadOS、桌面 Linux 等场景下，不适用的检测项会被智能标记为「已跳过」，不计入扣分或拉低支持率。
  - 针对权限策略、存储限制、IndexedDB、WebGL 等受限环境，均设有专门的防误判跳过规则。

- **🧪 严密的测试保障**
  - 完整的单元测试，严格锁定评分逻辑、分类规则、版本策略和警告文案。
  - 引入 Playwright 跨浏览器回归测试，全面覆盖 Chromium、Firefox 与 WebKit。

<br>

## 🧮 评分规则

| 项目 | 扣分 |
| --- | --- |
| 起始分数 | 100 |
| 每缺少一项现代 Web 功能 | -2 |
| 国产浏览器 | -30 |
| 套壳浏览器 | -20 |
| Chromium 内核版本过低 | 视情况扣分 |

特性扣分、浏览器类别扣分和 Chromium 版本扣分可以叠加；最低分为 0。被标记为「已跳过」的检测项**不计入**扣分与支持率。

<br>

## 🚦 什么时候会「跳过」而不是「不支持」？

为了保证评分的公平与准确，避免在受限环境下误判，遇到以下情况时检测项会被标记为「已跳过」：

- **非安全上下文**：依赖安全上下文的 API（如 Service Worker、Clipboard、WebUSB、WebGPU、Wake Lock 等）在非 HTTPS 或非可信本地来源下将跳过检测；`localhost` 等可信本地来源则照常检测。
- **本地文件打开**：通过 `file://` 直接打开页面时，仅跳过明确依赖网站来源的 API（如 Service Worker、Cookie Store），其他安全上下文 API 仍按实际环境检测（不透明来源同理）。建议通过 HTTPS 或 `localhost` 访问以获取最完整的报告。
- **移动端环境**：当移动端未暴露 EyeDropper、Web Serial、WebHID 等桌面端接口时自动跳过；但新版 Android 浏览器已支持的 Web Serial 会照常检测。
- **iOS / iPadOS 限制**：当 WebUSB、Web Bluetooth、WebXR、Idle Detection、Web MIDI、Speculation Rules 等接口因系统限制不可用时自动跳过；已提供的接口仍按实际能力判断。
- **iOS 通知限制**：普通 iOS 标签页会跳过 Web Notifications 检测；若已将网页添加到主屏幕并以独立 Web App 模式运行，则会进行实际检测。
- **桌面 Linux 环境**：若未暴露 Web Share API 则自动跳过；浏览器已提供时则正常计入。
- **图片解码受限**：测试图片被 CSP 策略拦截或解码超时时跳过；仅在明确解码失败时才判定为不支持。
- **页面权限策略 (Permissions Policy)**：若浏览器提供策略反射 API，且明确禁止了某项检测对应的策略，则自动跳过。若无反射 API、策略未知或查询失败，则照常执行能力检测，不会盲目假定 API 被禁。此过程不查询或申请任何用户权限。
- **API 访问受限**：访问接口时若明确抛出 `SecurityError` 或 `NotAllowedError`，说明受环境策略限制，将标记为无法评估并跳过；但普通的接口报错（如 `TypeError`）仍严格按不支持处理。
- **网站存储受限**：当存储被安全策略禁用或配额耗尽时跳过。检测仅向 `localStorage` / `sessionStorage` 写入并立即清理随机临时键，绝不覆盖已有数据；碰撞重试设有上限，异常的存储实现也不会阻塞页面。
- **IndexedDB 受限**：通过创建临时数据库进行读写验证，完成后立即关闭连接并清理数据库。遇到策略限制、阻塞或 2 秒超时会标记为跳过；仅在 API 缺失或明确读写失败时判定为不支持。
- **GPU / WebGL 环境**：若当前环境连基础的 WebGL 1.0 上下文都无法创建，则会跳过 WebGL 2.0 检测——因为此时无法区分是浏览器能力不足，还是受限于 GPU 硬件、驱动、远程桌面或系统策略。

<br>

## 🚀 现在就试试

### 方式 1 — 打开官网（推荐）

直接访问 [test.92li.uk](https://test.92li.uk)。

### 方式 2 — 打开本地文件

下载仓库后，双击打开 `index.html` 即可。首次打开需要联网从 CDN 加载固定版本的 Vue；如需纯离线使用，请自行下载对应依赖并修改引用路径。

### 方式 3 — 本地启动静态服务

```bash
git clone https://github.com/lingyicute/BrowserChecker.git
cd BrowserChecker
python3 -m http.server 8000
```

随后在浏览器打开 [http://localhost:8000](http://localhost:8000)。

### 运行要求

- **浏览器**：支持现代 Web 能力的浏览器（Chrome、Edge、Firefox、Safari 或移动端等价浏览器）。
- **网络**：首次加载需访问 CDN 获取 Vue 运行时；支持手动改造为纯离线版本。
- **存储**：完全不依赖本地存储即可跑完所有检测。
- **零权限打扰**：全程静默检测，**绝不申请**摄像头、定位、蓝牙等任何敏感权限。

<br>

## 📁 项目结构

- `index.html` — 主 HTML 文件
- `style.css` — 样式表
- `favicon.svg` — 随站点发布的本地图标
- `app.js` — Vue.js 应用与检测逻辑
- `startup.js` — 独立于 Vue 的启动失败提示与超时保护机制
- `templates/app.html` — Vue 页面模板源文件
- `scripts/compile-template.cjs` / `render.js` — 模板预编译脚本及提交到仓库的生成产物
- `tests/` — 单元测试、跨浏览器回归测试及策略锁定基线
- `playwright.config.cjs` — Chromium / Firefox / WebKit 自动化测试配置

<br>

## 🔨 开发与测试

本项目在生产环境下**零构建、直接运行**；Node.js 与 npm 仅用于本地开发与自动化测试。若修改了 `templates/app.html`，请执行 `node scripts/compile-template.cjs` 并一并提交生成的 `render.js`（测试流程会自动校验该产物）。

```sh
# Node.js 20+（CI 使用 22）
npm ci
npm test
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

在浏览器测试中，测试服务会用本地锁定的 Vue npm 文件接管 CDN 请求，同时完整保留浏览器原生的 SRI 完整性校验，确保测试不受外部 CDN 网络波动影响。

回归测试还全面覆盖了不可调用的 API 占位符、安全策略拦截、受限的 `customElements`、禁用 CSS 动画等边缘场景，以及国产／套壳浏览器的警告与扣分逻辑。此外，测试服务器本身也配备了针对畸形 URL、静态文件白名单、请求方法和读取异常的单元测试。

提交 Pull Request 时会自动触发全套回归测试；主分支的 Pages 部署同样必须在测试全部通过后才会放行。最终部署仅发布 `index.html`、`style.css`、`app.js`、`startup.js`、`render.js` 和 `favicon.svg` 六个核心文件，不发布模板源、测试及 npm 依赖。

<br>

## ⚠️ 检测范围与运行说明

- **定位为特性评估**：本项目旨在评估浏览器的**现代特性支持度**，并非性能跑分工具或安全审计工具。页面显示的“支持率”仅代表当前环境下实际评估通过的项目比例，不等同于日常网站的综合兼容率。同时，API 存在仅代表接口可用，不代表已获得用户授权或底层硬件支持。
- **User-Agent 识别机制**：浏览器品牌与内核版本识别基于 User-Agent（若被人为修改或伪装，识别结果也会随之改变）。iOS 端的 Firefox、Chrome、Edge 和 Opera 均采用系统 WebKit 内核，不会因其 UA 兼容性标记而误判为 Chromium；通用的 Android WebView 会独立展示，不会触发特定套壳品牌的额外扣分。
- **纯净的外部依赖**：运行时仅加载固定版本的 Vue 生产环境构建，并强制启用 SRI 校验。除首次打开需请求 Vue CDN 外，全站不请求任何外部图标或第三方资源，且配置了策略以杜绝向 CDN 发送页面 Referer。
- **严格的 CSP 兼容**：运行时直接采用预编译模板，无需在 CSP 中开启不安全的 `unsafe-eval`。托管方只需放行基础脚本、样式及 Vue CDN 即可；若所有脚本均被环境拦截，页面也有静态兜底提示。
- **优雅降级**：当显示模式查询、可选的 Client Hints 或分数动画被环境禁用时，系统会自动平滑降级，绝不影响核心检测流程。在后台标签页或开启“减少动态效果”模式时，将跳过动画直接呈现最终得分。

<br>

## 🤗 Contributing

欢迎参与改进！

- **反馈 Bug 与功能建议**：请直接在 [GitHub Issue Tracker](https://github.com/lingyicute/BrowserChecker/issues) 中提交。
- **提交 Pull Request**：请继续保持本项目“纯静态、零构建”的轻量特性，并确保页面能够极速启动。

> [!tip]
>
> 代码提交前，请务必在本地运行 `npm test`，如涉及界面或兼容性改动，请进一步运行 `npm run test:browser`。

<br>

## 📄 License

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)**。完整文本见 [LICENSE](./LICENSE)。

<br>
<p align="center">Made with ❤️ by <a href="https://github.com/lingyicute">lingyicute</a>.</p>
