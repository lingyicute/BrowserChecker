# 浏览器检测器

这是一个简单的网页应用，用于检测访问者浏览器的现代化程度并给出评分。

## 功能特点

- 检测 Chromium 内核版本
- 检测超过 30 项现代 Web API 和特性
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
- 如果是套壳浏览器，扣 15 分
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
- **GPU / WebGL 环境**：若当前环境连 WebGL 1.0 上下文也无法创建，则跳过 WebGL 2.0 检测，因为无法区分浏览器能力与 GPU、驱动、远程桌面或系统策略的影响。

## 使用方法

直接在本地打开 index.html 或访问 [官方网站](https://test.92li.uk) 即可使用。

## 文件结构

- `index.html` - 主HTML文件
- `style.css` - 样式表
- `app.js` - Vue.js 应用和检测逻辑
