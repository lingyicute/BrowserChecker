<br>
<br>
<br>
<h1 align="center">Browser Checker</h1>
<h3 align="center">你的浏览器，现在有几分？</h3>

<p align="center">一个轻量、无需构建的网页小工具：打开页面，它就会检查你的浏览器支持多少现代 Web 能力，并给出一个友好、直观的分数。</p>
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

点开页面，它就会：识别你的浏览器类型与内核版本，检查 60 项现代 Web 能力，分辨国产浏览器、套壳浏览器和应用内 WebView，并把结果整理成一个 0–100 的分数和几条可读的建议。

这个项目仍然是一个**无需构建的静态网站**：`index.html`、`style.css`、`app.js` 和 `startup.js` 就是运行时的全部。没有后端、没有账号、没有追踪，部署到任意静态托管即可。你也可以直接打开 `index.html`，或访问官方站点 [test.92li.uk](https://test.92li.uk)。

<br>

## ✨ Features

- **🔍 60 项现代 Web 能力检测**
  - 覆盖 ES6、Fetch API、WebAssembly 等常见现代特性。
  - 每项结果都会显示为「支持 / 不支持 / 已跳过」，并附上跳过原因。

- **🧭 浏览器与内核信息**
  - 显示浏览器类型、Chromium 内核版本（如适用）和 User-Agent。
  - 根据版本给出升级建议。

- **🚩 国产 / 套壳浏览器识别**
  - 识别中国厂商浏览器与套壳浏览器，并给出切换建议。

- **📊 友好评分**
  - 起始 100 分，缺一项现代能力扣 2 分。
  - 国产浏览器扣 30 分，套壳浏览器扣 20 分，Chromium 版本过低也会扣分。
  - 各类扣分可以叠加，最低为 0 分。

- **📱 响应式与可访问**
  - 适合手机、平板和桌面端访问。
  - 窄屏下特性名称自动换行，详情区域支持键盘聚焦与滚动。
  - 尊重「减少动态效果」设置，后台页面直接给出最终分数。

- **🛡️ 尽量避免假阳性**
  - 在非安全上下文、`file://`、移动端、iOS / iPadOS、桌面 Linux 等场景下，不适用的检测项会被标记为「已跳过」，不计入扣分与支持率。
  - 权限策略、存储限制、IndexedDB、WebGL 等受限环境也有专门的跳过规则。

- **🧪 有测试兜底**
  - 单元测试锁定评分、分类、版本策略和警告文案。
  - Playwright 跨浏览器回归测试覆盖 Chromium、Firefox、WebKit。

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

为了避免在受限环境下误报，以下情况的检测项会被标记为「已跳过」：

- **非安全上下文**：依赖安全上下文的 API（例如 Service Worker、Clipboard、WebUSB、WebGPU、Wake Lock 等）在非 HTTPS 或非可信本地来源下不检测；`localhost` 等可信本地来源仍可参与检测。
- **本地文件**：通过 `file://` 直接打开页面时，依赖网站来源的 API 会被跳过；建议通过 HTTPS 或 `localhost` 访问以获得完整结果。
- **移动端**：EyeDropper API 等明确仅桌面端提供的功能在移动端跳过。
- **iOS / iPadOS**：在常见 WebKit 环境下，WebUSB、Web Bluetooth、WebXR、Idle Detection、Web MIDI、Speculation Rules 等不可用的功能会被跳过。
- **iOS 通知**：普通 iOS 标签页不检测 Web Notifications；已添加到主屏幕并以独立 Web App 运行时可进行实际检测。
- **桌面 Linux**：Web Share API 在该平台的浏览器实现受操作系统能力限制，因此不计入评分。
- **图片解码受限**：图片样本被 CSP 拦截或解码超时时跳过；明确解码失败才视为不支持。
- **页面权限策略**：对已配置策略映射的检测项，如果浏览器提供 Permissions Policy 反射 API，且明确认识并禁止对应策略，则跳过。没有反射 API、未知策略或策略查询失败时仍执行原能力检测，不会据此假定 API 被禁止。此检查不查询或申请用户权限。
- **网站存储受限**：存储被安全策略限制或配额耗尽时跳过。检测会对 localStorage / sessionStorage 写入并清理随机临时键，不覆盖已有键；碰撞重试有上限，避免异常存储实现阻塞页面。
- **IndexedDB 受限**：通过临时数据库的写入和读取验证可用性，结束时关闭连接并请求删除本次创建的数据库。策略限制、阻塞或 2 秒超时标记为跳过；API 缺失或明确读写失败仍为不支持。
- **GPU / WebGL 环境**：若当前环境连 WebGL 1.0 上下文也无法创建，则跳过 WebGL 2.0 检测，因为无法区分浏览器能力与 GPU、驱动、远程桌面或系统策略的影响。

<br>

## 🚀 现在就试试

### 方式 1 — 打开官网

直接访问 [test.92li.uk](https://test.92li.uk)。

### 方式 2 — 打开本地文件

下载仓库后直接打开 `index.html`。首次打开（包括 `file://`）仍需网络访问 CDN 加载固定版本的 Vue；若要离线使用，请自行保存对应依赖并调整引用。

### 方式 3 — 本地启动静态服务

```bash
git clone https://github.com/lingyicute/BrowserChecker.git
cd BrowserChecker
python3 -m http.server 8000
```

然后打开 [http://localhost:8000](http://localhost:8000)。

### 运行要求

- **浏览器**：支持现代 Web 能力的浏览器（Chrome、Edge、Firefox、Safari 或移动端等价浏览器）。
- **网络**：首次加载需要访问 CDN；离线使用需自行保存依赖。
- **存储**：不依赖本地存储即可完成检测。
- **权限**：检测不会申请摄像头、定位、蓝牙等权限。

<br>

## 📁 项目结构

- `index.html` — 主 HTML 文件
- `style.css` — 样式表
- `app.js` — Vue.js 应用与检测逻辑
- `startup.js` — 不依赖 Vue 的启动失败提示与超时保护
- `tests/` — 单元测试、跨浏览器回归测试及策略锁定基线
- `playwright.config.cjs` — Chromium / Firefox / WebKit 测试配置

<br>

## 🔨 开发与测试

页面是无需构建的静态网站；Node.js / npm 仅用于开发测试。

```sh
# Node.js 20+（CI 使用 22）
npm ci
npm test
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

浏览器测试会用本地锁定的 Vue npm 文件替代 CDN 响应，保留浏览器原生 SRI 校验，不依赖 CDN 在线状态。真实 CDN 的可达性仍需部署后检查。

Pull Request 会自动运行回归测试；主分支 Pages 部署也必须先通过相同测试。部署只发布 `index.html`、`style.css`、`app.js`、`startup.js`，不发布测试及 npm 依赖。

<br>

## ⚠️ 检测范围与运行限制

- 分数是本站规则下的特性可用性评估，不是性能基准测试，也不是完整安全审计。API 存在不等于已经授权、具有硬件支持，或所有调用都能成功；检测不会申请摄像头、定位、蓝牙等权限。
- 浏览器识别依赖 User-Agent。品牌和版本可被伪装，iOS Firefox 的 `FxiOS` 会被识别为 Firefox，但不会因此标记为 Gecko 内核。
- 运行时使用固定版本的 Vue 生产构建并启用 SRI。首次打开（包括 `file://`）仍需网络访问 CDN；离线使用需自行保存对应依赖并调整引用。更新 Vue 时请同步 URL、`package.json` / lockfile、SRI 和测试中的 URL。
- 当前使用 Vue 的 DOM 模板运行时编译器，严格禁止 `unsafe-eval` 的 CSP 无法启动完整页面。
- 显示模式查询、可选 Client Hints 或分数动画被禁用时会降级，不应导致整个检测失败。后台页面和减少动态效果模式直接提供最终分数。
- 详细结果区域可通过 Tab 聚焦，再用方向键、Page Down / End 等按键滚动；窄屏下特性名称自动换行。

<br>

## 🤗 Contributing

欢迎参与改进！

- **Bug 报告与功能建议**：在 [GitHub Issue Tracker](https://github.com/lingyicute/BrowserChecker/issues) 中提交。
- **Pull Request**：请保持静态站点、无构建的特性，并尽量让页面快速启动。
- **提交前**：运行 `npm test`，必要时运行 `npm run test:browser`。

<br>

## 📄 License

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)**。完整文本见 [LICENSE](./LICENSE)。

<br>
<p align="center">Made with ❤️ by <a href="https://github.com/lingyicute">lingyicute</a>.</p>
