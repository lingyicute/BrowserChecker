const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function serverHarness(readFileSync = fs.readFileSync) {
  let handler;
  vm.runInNewContext(fs.readFileSync('tests/server.cjs', 'utf8'), {
    URL,
    __dirname: path.resolve('tests'),
    require(name) {
      if (name === 'node:http') return { createServer(fn) { handler = fn; return { listen() {} }; } };
      if (name === 'node:fs') return { readFileSync };
      return require(name);
    }
  });
  return (url, method = 'GET') => {
    const response = { status: 200, headers: {}, body: undefined };
    handler({ url, method }, {
      setHeader(name, value) { response.headers[name] = value; },
      writeHead(status) { response.status = status; },
      end(body) { response.body = body; }
    });
    return response;
  };
}

test('test server rejects inherited property names and non-public paths without crashing', () => {
  const request = serverHarness();
  for (const url of ['/constructor', '/__proto__', '/toString', '/hasOwnProperty',
    '/package.json', '/.git/config', '/tests/app.test.cjs', '/node_modules/vue/package.json']) {
    assert.equal(request(url).status, 404, url);
  }
  assert.equal(request('/').status, 200);
});

test('test server handles malformed URL input without terminating the process', () => {
  const request = serverHarness();
  assert.equal(request('http://[').status, 400);
  assert.equal(request('/app.js?version=1').status, 200);
});

test('test server supports HEAD and refuses write methods', () => {
  const request = serverHarness();
  const head = request('/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(head.body, undefined);
  const post = request('/', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.Allow, 'GET, HEAD');
});

test('test server file read failures return a generic error rather than crashing', () => {
  const request = serverHarness(() => { throw new Error('/private/path must not leak'); });
  const response = request('/');
  assert.equal(response.status, 500);
  assert.doesNotMatch(String(response.body), /private/);
});

test('test server preserves the CSP and permissions regression fixtures', () => {
  const request = serverHarness();
  assert.equal(request('/?csp=images').headers['Content-Security-Policy'], "img-src 'none'");
  assert.match(request('/?csp=strict').headers['Content-Security-Policy'], /script-src/);
  assert.match(request('/?permissions=deny').headers['Permissions-Policy'], /geolocation=\(\)/);
});
