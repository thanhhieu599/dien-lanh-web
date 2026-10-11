// Build website tĩnh chuẩn SEO (pre-render) để đăng lên GitHub Pages / hosting bất kỳ.
//
//   node tools/prerender.mjs [--out dist] [--site https://ten-mien.vn/] [--limit 5]
//
// Cách làm: mở từng trang bằng trình duyệt Chromium (Playwright), chờ JavaScript vẽ xong nội dung
// (dữ liệu lấy từ Supabase nếu đã cấu hình, không thì dữ liệu mẫu), rồi lưu lại HTML hoàn chỉnh.
// Google, Cốc Cốc, Zalo/Facebook (xem trước link) và các công cụ AI đọc được ngay nội dung, giá, thông số
// mà không cần chạy JavaScript. Khi khách mở trang, JavaScript vẫn chạy bình thường (giỏ hàng, bộ lọc…).
//
// Kết quả trong thư mục --out:
//   frontend/sp/<slug>.html                  trang sản phẩm
//   frontend/danh-muc/<cat>[/<sub>].html     trang danh mục
//   frontend/tin-tuc/<slug>.html             bài viết
//   frontend/chinh-sach/<loai>.html          chính sách
//   frontend/*.html                          trang chủ, khuyến mãi, tin tức… (đã có sẵn nội dung)
//   frontend/og/*.png                        ảnh chia sẻ Zalo / Facebook
//   frontend/sitemap.xml, robots.txt, llms.txt (tóm tắt cho công cụ AI)
import { newVersion, stampAssets } from './asset-version.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(ROOT, args.out || 'dist');
const LIMIT = Number(args.limit) || Infinity;  // chạy thử nhanh: --limit 3

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* thử bản cài toàn cục */ }
  const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
  return req('playwright');
}

// ---------------------------------------------------------------- 1. Chép mã nguồn sang thư mục build
function copySite() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of ['index.html', '404.html', '.nojekyll', 'frontend', 'admin']) {
    fs.cpSync(path.join(ROOT, f), path.join(OUT, f), { recursive: true });
  }
}

function siteUrlFromSource() {
  const src = fs.readFileSync(path.join(ROOT, 'frontend/assets/js/seo-config.js'), 'utf8');
  return src.match(/siteUrl:\s*'([^']+)'/)?.[1];
}

function writeSeoConfig(siteUrl) {
  const f = path.join(OUT, 'frontend/assets/js/seo-config.js');
  const src = fs.readFileSync(f, 'utf8')
    .replace(/siteUrl:\s*'[^']*'/, `siteUrl: '${siteUrl}'`)
    .replace(/prettyUrls:\s*false/, 'prettyUrls: true');
  fs.writeFileSync(f, src);
}

// ---------------------------------------------------------------- 2. Máy chủ tĩnh cục bộ
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
function serve(dir) {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, p);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------------------------------------------------------------- 3. Danh sách trang
function routes(data) {
  const r = [];
  // Trang có nội dung cố định: ghi đè tại chỗ
  for (const f of ['index.html', 'khuyen-mai.html', 'tin-tuc.html', 'dich-vu.html', 'bao-gia-du-an.html', 'gioi-thieu.html', 'tam-nhin-su-menh.html', 'tinh-cong-suat-may-lanh.html', 'du-an.html', 'hoi-dap.html', 'lien-he.html', 'he-thong-cua-hang.html']) {
    r.push({ src: f, out: f, priority: f === 'index.html' ? '1.0' : '0.6' });
  }
  for (const c of data.categories) {
    r.push({ src: `danh-muc.html?cat=${c.id}`, out: `danh-muc/${c.id}.html`, data: { qCat: c.id }, priority: '0.9' });
    for (const s of c.subs) r.push({ src: `danh-muc.html?cat=${c.id}&sub=${s.id}`, out: `danh-muc/${c.id}/${s.id}.html`, data: { qCat: c.id, qSub: s.id }, priority: '0.8' });
  }
  for (const p of data.products.slice(0, LIMIT)) {
    r.push({ src: `san-pham.html?id=${p.id}`, out: `sp/${p.slug}.html`, data: { qId: String(p.id) }, og: `og/${p.slug}.png`, ogSelector: '#g-main', priority: '0.8', lastmod: p.updated });
  }
  for (const p of data.posts) r.push({ src: `bai-viet.html?slug=${p.slug}`, out: `tin-tuc/${p.slug}.html`, data: { qSlug: p.slug }, priority: '0.7', lastmod: p.date });
  for (const p of data.projects || []) r.push({ src: `du-an-chi-tiet.html?slug=${p.slug}`, out: `du-an/${p.slug}.html`, data: { qSlug: p.slug }, priority: '0.7', lastmod: p.updated });
  for (const k of data.policies) r.push({ src: `chinh-sach.html?type=${k}`, out: `chinh-sach/${k}.html`, data: { qType: k }, priority: '0.3' });
  return r;
}

// ---------------------------------------------------------------- 4. Chụp trang
async function snapshot(page, base, siteUrl, route) {
  await page.goto(base + route.src, { waitUntil: 'load', timeout: 60000 });
  // Máy chủ dữ liệu lỗi giữa chừng -> trang đang hiện dữ liệu mẫu: dừng build, không xuất bản dữ liệu giả
  const offline = await page.evaluate(() => DT.ready.catch(() => {}).then(() => DT.backend.enabled && DT.backend.offline));
  if (offline) throw new Error(`Không nạp được dữ liệu từ Supabase khi dựng ${route.out} – dừng build để không xuất bản dữ liệu mẫu`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(100);
  if (route.og) {
    const el = page.locator(route.ogSelector);
    if (await el.count()) await el.first().screenshot({ path: path.join(OUT, 'frontend', route.og) }).catch((e) => console.warn('  ! ảnh chia sẻ', route.out, e.message));
  }
  return page.evaluate(({ out, data, siteUrl }) => {
    // Bỏ phần tạm thời (thông báo, cửa sổ bật lên) và trạng thái riêng của trình duyệt build
    document.querySelectorAll('#toasts, .modal-wrap').forEach((e) => e.remove());
    document.body.classList.remove('no-scroll');
    document.documentElement.dataset.prerendered = new Date().toISOString().slice(0, 10);
    Object.entries(data || {}).forEach(([k, v]) => { document.body.dataset[k] = v; });
    const head = document.head;
    const depth = out.split('/').length - 1;
    if (depth) {
      const b = document.createElement('base');
      b.href = '../'.repeat(depth);
      (head.querySelector('meta[charset]') || head.firstChild).after(b);
    }
    const abs = (rel) => new URL(rel, siteUrl).href;
    const meta = (attr, key, val) => {
      let m = head.querySelector(`meta[${attr}="${key}"]`);
      if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); head.appendChild(m); }
      m.content = val;
    };
    if (!head.querySelector('link[rel="canonical"]')) {
      const l = document.createElement('link');
      l.rel = 'canonical';
      l.href = abs(out === 'index.html' ? './' : out);
      head.appendChild(l);
    }
    meta('property', 'og:url', head.querySelector('link[rel="canonical"]').href);
    meta('property', 'og:title', document.title);
    meta('property', 'og:site_name', DT.config.name);
    meta('property', 'og:locale', 'vi_VN');
    if (!head.querySelector('meta[property="og:image"]')) meta('property', 'og:image', abs('og/home.png'));
    meta('name', 'twitter:card', 'summary_large_image');
    return `<!doctype html>\n${document.documentElement.outerHTML}\n`;
  }, { out: route.out, data: route.data, siteUrl });
}

// ---------------------------------------------------------------- 5. sitemap, robots, llms.txt
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function writeSitemap(siteUrl, list) {
  // lastmod chỉ ghi khi biết ngày cập nhật thật (sản phẩm, bài viết, dự án) – không ghi "hôm nay" cho mọi trang
  const urls = list.map((r) => `  <url><loc>${xmlEsc(new URL(r.out === 'index.html' ? './' : r.out, siteUrl).href)}</loc>${r.lastmod ? `<lastmod>${String(r.lastmod).slice(0, 10)}</lastmod>` : ''}<priority>${r.priority}</priority></url>`);
  fs.writeFileSync(path.join(OUT, 'frontend/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /frontend/gio-hang.html\nDisallow: /frontend/thanh-toan.html\nDisallow: /frontend/tai-khoan.html\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`;
  // robots.txt chỉ có hiệu lực ở thư mục gốc tên miền (khi dùng tên miền riêng trỏ vào repo)
  fs.writeFileSync(path.join(OUT, 'robots.txt'), robots);
  fs.writeFileSync(path.join(OUT, 'frontend/robots.txt'), robots);
}

function writeLlms(siteUrl, d) {
  const u = (rel) => new URL(rel, siteUrl).href;
  const money = (n) => `${Math.round(n).toLocaleString('vi-VN')}₫`;
  const c = d.config;
  const lines = [
    `# ${c.name}`, '',
    `> ${c.slogan}. ${c.company} – phân phối máy lạnh, tủ lạnh, tủ đông, máy giặt và vật tư điện lạnh chính hãng; lắp đặt, bảo trì cho gia đình, văn phòng, nhà máy (B2B, xuất hóa đơn VAT).`, '',
    `- Hotline: ${c.hotline} • Doanh nghiệp: ${c.hotlineB2B} • Email: ${c.email}`,
    `- Địa chỉ: ${c.address} • Giờ làm việc: ${c.workingHours}`,
    `- Báo giá dự án B2B: ${u('bao-gia-du-an.html')}`, `- Dịch vụ vệ sinh / lắp đặt / sửa chữa: ${u('dich-vu.html')}`, '',
    '## Danh mục sản phẩm', '',
    ...d.categories.map((cat) => `- [${cat.name}](${u(`danh-muc/${cat.id}.html`)}): ${cat.subs.map((s) => s.name).join(', ')}`), '',
    '## Sản phẩm', '',
    ...d.products.map((p) => `- [${p.name}](${u(`sp/${p.slug}.html`)}): ${money(p.price)}${p.oldPrice ? ` (giá gốc ${money(p.oldPrice)})` : ''}. ${p.short || ''}`), '',
    '## Bài viết tư vấn', '',
    ...d.posts.map((p) => `- [${p.title}](${u(`tin-tuc/${p.slug}.html`)}): ${p.excerpt || ''}`), '',
    ...(d.projects?.length ? ['## Dự án tiêu biểu', '', ...d.projects.map((p) => `- [${p.title}](${u(`du-an/${p.slug}.html`)}): ${p.summary || ''}`), ''] : []),
    ...(d.faqs?.length ? ['## Hỏi đáp thường gặp', '', `Trang hỏi đáp: ${u('hoi-dap.html')}`, '', ...d.faqs.flatMap((f) => [`### ${f.q}`, f.a, '']), ''] : []),
    '## Công cụ', '', `- [Tính công suất máy lạnh theo diện tích phòng](${u('tinh-cong-suat-may-lanh.html')})`, '',
    '## Chính sách', '',
    ...d.policies.map((k) => `- [${d.policyTitles[k]}](${u(`chinh-sach/${k}.html`)})`), '',
  ];
  fs.writeFileSync(path.join(OUT, 'frontend/llms.txt'), lines.join('\n'));
}

// ---------------------------------------------------------------- Chạy
async function main() {
  const t0 = Date.now();
  copySite();
  const siteUrl = String(args.site || process.env.SITE_URL || siteUrlFromSource()).replace(/\/?$/, '/');
  writeSeoConfig(siteUrl);
  fs.mkdirSync(path.join(OUT, 'frontend/og'), { recursive: true });

  const server = await serve(OUT);
  const base = `http://127.0.0.1:${server.address().port}/frontend/`;
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  // Mỗi trang như khách mới: không giỏ hàng, không "sản phẩm đã xem"
  // (giữ sessionStorage: dữ liệu catalog chỉ tải 1 lần cho cả lượt build)
  await context.addInitScript(() => { try { localStorage.clear(); } catch { /* bỏ qua */ } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

  await page.goto(`${base}index.html`, { waitUntil: 'load' });
  const data = await page.evaluate(async () => {
    await DT.ready.catch(() => {});
    return {
      configured: DT.backend.enabled,
      backend: DT.backend.enabled && !DT.backend.offline,
      config: DT.config,
      categories: DT.categories.map((c) => ({ id: c.id, name: c.name, subs: c.subs.map((s) => ({ id: s.id, name: s.name })) })),
      products: DT.products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, price: p.price, oldPrice: p.oldPrice, short: p.short, updated: p.updatedAt || p.createdAt })),
      posts: DT.posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, date: p.date })),
      projects: (DT.projects || []).map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, updated: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined })),
      faqs: (DT.faqs || []).map((f) => ({ q: f.question, a: f.answer.replace(/<[^>]+>/g, '') })),
      policies: Object.keys(DT.policies),
      policyTitles: Object.fromEntries(Object.entries(DT.policies).map(([k, v]) => [k, v.title])),
    };
  });
  if (data.configured && !data.backend) throw new Error('Đã cấu hình Supabase nhưng không nạp được dữ liệu – dừng build để không xuất bản dữ liệu mẫu');
  console.log(`Nguồn dữ liệu: ${data.backend ? 'Supabase' : 'dữ liệu mẫu (chế độ demo)'} – ${data.products.length} sản phẩm, ${data.categories.length} danh mục, ${data.posts.length} bài viết`);

  // Ảnh chia sẻ mặc định (banner trang chủ)
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: '.floating, .mnav { display: none !important; }' });
  await page.screenshot({ path: path.join(OUT, 'frontend/og/home.png') });
  await page.setViewportSize({ width: 1280, height: 900 });

  const list = routes(data);
  let n = 0;
  for (const r of list) {
    const html = await snapshot(page, base, siteUrl, r);
    const file = path.join(OUT, 'frontend', r.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    if (++n % 20 === 0) console.log(`  ${n}/${list.length} trang`);
  }
  writeSitemap(siteUrl, list);
  // Phiên bản CSS/JS mới cho mỗi lần build: khách không bị lẫn HTML mới với CSS cũ trong bộ nhớ đệm
  const version = process.env.GITHUB_SHA?.slice(0, 8) || newVersion();
  console.log(`Gắn phiên bản tài nguyên ?v=${version} cho ${stampAssets(OUT, version)} trang`);
  writeLlms(siteUrl, data);
  await browser.close();
  server.close();
  if (errors.length) {
    console.error(`Lỗi JavaScript khi dựng trang:\n${errors.join('\n')}`);
    process.exit(1);
  }
  console.log(`Xong ${list.length} trang trong ${((Date.now() - t0) / 1000).toFixed(1)}s → ${path.relative(ROOT, OUT)}/ (website: ${siteUrl})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
