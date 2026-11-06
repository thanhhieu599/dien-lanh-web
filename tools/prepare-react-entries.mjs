import fs from 'node:fs';
import path from 'node:path';
// Chuyển HTML entry sang mount point React, giữ nguyên tên file và metadata.
for(const entry of fs.readdirSync('frontend').filter(f=>f.endsWith('.html'))) {
  const file=path.join('frontend',entry);const source=fs.readFileSync(file,'utf8');
  if(source.includes('src/main.tsx'))continue;
  const next=source.replace(/<body([^>]*)>[\s\S]*?<\/body>/i, `<body$1>\n  <div id="root"><p class="container" role="status">Đang tải website…</p></div>\n  <noscript>Vui lòng bật JavaScript để sử dụng giỏ hàng, tìm kiếm và đặt hàng.</noscript>\n  <script type="module" src="src/main.tsx"></script>\n</body>`);
  if(next===source)throw new Error(`Không tìm thấy body: ${file}`);
  fs.writeFileSync(file,next);
}
