const fs = require('node:fs');
const path = require('node:path');
const { compile } = require('@vue/compiler-dom');

const root = path.join(__dirname, '..');
const templateFile = path.join(root, 'templates', 'app.html');
const outputFile = path.join(root, 'render.js');

function generate() {
  const template = fs.readFileSync(templateFile, 'utf8').trim();
  const { code } = compile(template, {
    mode: 'function', prefixIdentifiers: true, comments: false, isProd: true
  });
  const indented = code.split('\n').map(line => line ? `  ${line}` : '').join('\n');
  return `// 由 node scripts/compile-template.cjs 生成，请修改 templates/app.html。\nwindow.browserCheckerRender = (function () {\n${indented}\n}());\n`;
}

if (require.main === module) fs.writeFileSync(outputFile, generate());
module.exports = { generate, outputFile };
