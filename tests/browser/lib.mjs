// Tiện ích kiểm thử trình duyệt: máy chủ tĩnh giống GitHub Pages (trả 404.html gốc khi không có file) + Playwright.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

// Phục vụ thư mục `dir` dưới tiền tố /dien-lanh-web/ (giống https://thanhhieu599.github.io/dien-lanh-web/)
export function pagesServer(dir, prefix = '/dien-lanh-web/') {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = p.startsWith(prefix) ? path.join(dir, p.slice(prefix.length)) : null;
    if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      fs.createReadStream(path.join(dir, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}${prefix}` })));
}

export async function chromium() {
  let pw;
  try { pw = await import('playwright'); } catch {
    pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
  }
  return pw.chromium.launch();
}

let failures = 0;
export function check(cond, msg) {
  if (cond) console.log(`  ✔ ${msg}`);
  else { failures++; console.log(`  ✖ ${msg}`); }
}
export const done = () => { console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTất cả kiểm tra đạt'); process.exit(failures ? 1 : 0); };

// Chặn tài nguyên bên ngoài (font Google...) cho test nhanh & ổn định
export async function blockExternal(context, allow = []) {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => (allow.some((a) => route.request().url().startsWith(a)) ? route.continue() : route.abort()));
}
