// 仅用于回归测试的静态服务器；不发布仓库、依赖或任意文件。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/startup.js': ['startup.js', 'application/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8']
};
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = files[url.pathname];
  if (!file) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file[1]);
  if (url.searchParams.get('permissions') === 'deny') res.setHeader('Permissions-Policy', 'geolocation=(), usb=(), payment=(), gamepad=()');
  if (url.searchParams.get('csp') === 'images') res.setHeader('Content-Security-Policy', "img-src 'none'");
  if (url.searchParams.get('csp') === 'strict') res.setHeader('Content-Security-Policy', "script-src 'self' https://cdn.jsdelivr.net");
  res.end(fs.readFileSync(path.join(__dirname, '..', file[0])));
}).listen(4173, '0.0.0.0');
