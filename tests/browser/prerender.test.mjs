// Kiểm thử bản build pre-render: node tests/browser/prerender.test.mjs <thư mục build>
import fs from 'node:fs';
import path from 'node:path';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const dist = path.resolve(process.argv[2] || 'dist');
const { server, base } = await pagesServer(dist);
const browser = await chromium();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await blockExternal(context);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
const fe = `${base}frontend/`;
const slugs = fs.readdirSync(path.join(dist, 'frontend/sp')).map((f) => f.replace(/\.html$/, ''));

console.log('Trang sản phẩm pre-render');
const raw = fs.readFileSync(path.join(dist, 'frontend/sp', `${slugs[0]}.html`), 'utf8');
check(/<h1>[^<]+<\/h1>/.test(raw) && /<table|class="specs/.test(raw), 'HTML tĩnh có sẵn tên & thông số sản phẩm (không cần JS)');
await page.goto(`${fe}sp/${slugs[0]}.html`);
await page.waitForFunction(() => document.querySelectorAll('.pd-title h1').length === 1);
check(await page.locator('.pd-title h1').count() === 1, 'chỉ 1 tiêu đề sản phẩm sau khi JS chạy lại');
check(await page.locator('nav.breadcrumb').count() === 1, 'breadcrumb không bị nhân đôi');
check(await page.locator('.mnav').count() === 1 && await page.locator('.floating').count() === 1, 'header/footer/nút nổi không bị nhân đôi');
check(await page.locator('script[type="application/ld+json"][data-ld="Product"]').count() === 1, 'JSON-LD Product chỉ 1 thẻ');
const firstLink = await page.locator('.pgrid a[href^="sp/"], .carousel a[href^="sp/"]').first().getAttribute('href');
check(!!firstLink, `link sản phẩm liên quan dạng thân thiện (${firstLink})`);
await page.locator('a[href="#reviews"]').first().click();
await page.waitForTimeout(300);
check(page.url().endsWith(`sp/${slugs[0]}.html`), 'bấm "đánh giá" cuộn trong trang, không chuyển trang');
await page.locator('[data-action="add-cart"], .btn-cart, #add-cart').first().click().catch(() => {});
await page.waitForTimeout(300);
check(Number(await page.locator('#cart-count').textContent().catch(() => '0')) >= 1, 'thêm vào giỏ hàng hoạt động');
await page.goto(`${fe}gio-hang.html`);
check(await page.locator('.ci-name').count() >= 1, 'giỏ hàng nhận sản phẩm từ trang pre-render');

console.log('Danh mục, bài viết, chính sách');
await page.goto(`${fe}danh-muc/may-lanh.html`);
await page.waitForSelector('.pgrid .pcard');
check(await page.locator('#cat-title').textContent() === 'Máy lạnh - Điều hòa', 'trang danh mục hiển thị đúng');
await page.locator('#filters .fopt[data-group="brand"]').first().click();
await page.waitForTimeout(300);
const fu = new URL(page.url());
check(fu.pathname.endsWith('/danh-muc/may-lanh.html') && fu.search.length > 1 && !fu.search.includes('cat='), `lọc giữ URL thân thiện (${page.url().split('/frontend/')[1]})`);
const sub = fs.readdirSync(path.join(dist, 'frontend/danh-muc/may-lanh'))[0].replace('.html', '');
await page.goto(`${fe}danh-muc/may-lanh/${sub}.html`);
await page.waitForSelector('.pgrid .pcard');
check(await page.locator('.sub-cat.active').count() === 1, `danh mục con ${sub}`);
const post = fs.readdirSync(path.join(dist, 'frontend/tin-tuc'))[0].replace('.html', '');
await page.goto(`${fe}tin-tuc/${post}.html`);
check(await page.locator('article.article h1').count() === 1, 'bài viết pre-render');
await page.goto(`${fe}chinh-sach/doi-tra.html`);
check((await page.locator('.policy-nav a.active').textContent())?.length > 3, 'trang chính sách');

console.log('Link chưa được build (sản phẩm mới thêm) -> trang động');
// Giả lập sản phẩm vừa thêm trong quản trị: có trong dữ liệu nhưng chưa có file sp/<slug>.html
const hidden = path.join(dist, 'frontend/sp', `${slugs[1]}.html`);
fs.renameSync(hidden, `${hidden}.bak`);
try {
  await page.goto(`${fe}sp/${slugs[1]}.html`);
  await page.waitForSelector('.pd-title h1');
  check(page.url().includes(`san-pham.html?slug=${slugs[1]}`), '404 chuyển về san-pham.html?slug=... và hiển thị sản phẩm');
} finally { fs.renameSync(`${hidden}.bak`, hidden); }
await page.goto(`${fe}sp/khong-ton-tai.html`);
await page.waitForURL(/frontend\/404\.html$/);
check(true, 'slug không tồn tại -> trang 404');
await page.goto(`${base}danh-muc.html?cat=tu-lanh`);
await page.waitForURL(/frontend\/danh-muc\.html\?cat=tu-lanh/);
check(true, 'link cũ không có /frontend/ vẫn chuyển đúng');

check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
done();
