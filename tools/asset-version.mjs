// Gắn phiên bản (?v=...) cho file CSS/JS trong mọi trang HTML để trình duyệt khách luôn tải bản mới
// sau mỗi lần cập nhật (tránh lỗi: HTML mới + CSS cũ còn trong bộ nhớ đệm -> vỡ giao diện).
//   node tools/asset-version.mjs            -> gắn cho mã nguồn (frontend/, admin/, trang gốc)
//   (tools/prerender.mjs tự gọi stampAssets cho bản build)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function stampAssets(dir, version) {
  let files = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name)) walk(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const src = fs.readFileSync(p, 'utf8');
      // chỉ file nội bộ (không phải http://, https://, //)
      const out = src.replace(/(\s(?:href|src)=")(?!https?:|\/\/)([^"?#]+\.(?:css|js))(?:\?v=[^"]*)?"/g, `$1$2?v=${version}"`);
      if (out !== src) { fs.writeFileSync(p, out); files++; }
    }
  };
  walk(dir);
  return files;
}

export const newVersion = () => new Date().toISOString().replace(/\D/g, '').slice(0, 12);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const v = process.argv[2] || newVersion();
  let n = 0;
  for (const d of ['frontend', 'admin']) n += stampAssets(path.join(root, d), v);
  for (const f of ['index.html', '404.html']) {
    const tmp = fs.mkdtempSync(path.join(root, '.tmp-'));
    fs.copyFileSync(path.join(root, f), path.join(tmp, f));
    n += stampAssets(tmp, v);
    fs.copyFileSync(path.join(tmp, f), path.join(root, f));
    fs.rmSync(tmp, { recursive: true });
  }
  console.log(`Đã gắn phiên bản ?v=${v} cho ${n} trang`);
}
