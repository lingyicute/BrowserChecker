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
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.writeHead(405);
    res.end();
    return;
  }
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch (e) { res.writeHead(400); res.end(); return; }
  const file = files[url.pathname];
  if (!file) { res.writeHead(404); res.end(); return; }
  let body;
  try { body = fs.readFileSync(path.join(__dirname, '..', file[0])); }
  catch (e) { res.writeHead(500); res.end(); return; }
  res.setHeader('Content-Type', file[1]);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.searchParams.get('permissions') === 'deny') res.setHeader('Permissions-Policy', 'geolocation=(), usb=(), payment=(), gamepad=()');
  if (url.searchParams.get('csp') === 'images') res.setHeader('Content-Security-Policy', "img-src 'none'");
  if (url.searchParams.get('csp') === 'strict') res.setHeader('Content-Security-Policy', "script-src 'self' https://cdn.jsdelivr.net");
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(4173, '0.0.0.0');
