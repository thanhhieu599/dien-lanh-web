// Kiểm thử menu chính: Trang chủ · Sản phẩm ▾ · Khuyến mãi · Dịch vụ ▾ · Doanh nghiệp ▾ · Tin tức ▾ · Giới thiệu ▾ · Liên hệ
// Chạy: node tests/browser/menu.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
await blockExternal(ctx);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
const fe = `${base}frontend/`;
const active = async () => (await page.locator('.mainnav li > a.active').allTextContents()).map((t) => t.trim()).join();
const sub = (k) => page.locator(`[data-mm="${k}"] + .mm-sub a`);

try {
  console.log('Menu chính');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('.mainnav');
  const labels = (await page.locator('.mainnav li > a').allTextContents()).map((t) => t.trim().toUpperCase());
  check(labels.join('|') === 'TRANG CHỦ|SẢN PHẨM|KHUYẾN MÃI|DỊCH VỤ|DOANH NGHIỆP|TIN TỨC|GIỚI THIỆU|LIÊN HỆ', `8 mục đúng thứ tự (${labels.join(' · ')})`);
  check(await page.locator('.mainnav li > a').first().evaluate((a) => getComputedStyle(a).textTransform) === 'uppercase', 'chữ in hoa');
  check(await active() === 'Trang chủ', 'trang chủ: tô sáng "Trang chủ"');
  check(await page.locator('.catnav, .cn-vision').count() === 0, 'đã bỏ hàng danh mục cũ');
  check((await page.locator('.topbar-right').textContent()).includes('Tra cứu đơn hàng') && !(await page.locator('.topbar-right').textContent()).includes('Tin tức'), 'thanh trên cùng chỉ giữ tiện ích, không trùng menu');

  const cats = await page.evaluate(() => DT.categories.length);
  check(await sub('products').count() === cats + 1, `Sản phẩm ▾: ${cats} danh mục + Thương hiệu`);
  const svcs = await page.evaluate(() => DT.services.length);
  check(await sub('services').count() === svcs + 1, `Dịch vụ ▾: ${svcs} dịch vụ (từ quản trị) + Tính công suất`);
  check((await sub('b2b').allTextContents()).join('|') === 'Báo giá dự án|Dự án tiêu biểu', 'Doanh nghiệp ▾: Báo giá dự án, Dự án tiêu biểu');
  check((await sub('news').allTextContents()).join('|') === 'Tin tức & kinh nghiệm|Hỏi đáp thường gặp', 'Tin tức ▾: Tin tức, Hỏi đáp');
  check((await sub('about').allTextContents()).join('|') === 'Giới thiệu công ty|Tầm nhìn & Sứ mệnh|Hệ thống cửa hàng|Chính sách', 'Giới thiệu ▾: Công ty, Tầm nhìn, Cửa hàng, Chính sách');

  // Mọi link trong menu mở được (không 404)
  const hrefs = [...new Set(await page.$$eval('.mainnav a', (a) => a.map((x) => x.getAttribute('href'))))];
  const bad = [];
  for (const h of hrefs) { const r = await page.request.get(`${fe}${h.split('?')[0]}`); if (!r.ok()) bad.push(h); }
  check(bad.length === 0, `${hrefs.length} link trong menu đều mở được${bad.length ? `: lỗi ${bad.join(', ')}` : ''}`);

  check(!(await sub('products').first().isVisible()), 'menu con ẩn khi chưa rê chuột');
  await page.hover('[data-mm="products"]');
  await page.waitForTimeout(250);
  check(await sub('products').first().isVisible(), 'rê chuột vào Sản phẩm → hiện menu con');
  await sub('products').first().click();
  await page.waitForSelector('.pcard');
  check(/danh-muc\.html\?cat=/.test(page.url()) && await active() === 'Sản phẩm', 'mở danh mục từ menu, tô sáng "Sản phẩm"');
  // Bàn phím: Tab vào mục có menu con cũng mở menu con
  await page.focus('[data-mm="about"]');
  await page.waitForTimeout(250);
  check(await sub('about').first().isVisible(), 'dùng phím Tab cũng mở được menu con');

  for (const [u, want] of [['khuyen-mai.html', 'Khuyến mãi'], ['dich-vu.html', 'Dịch vụ'], ['tinh-cong-suat-may-lanh.html', 'Dịch vụ'], ['bao-gia-du-an.html', 'Doanh nghiệp'], ['du-an.html', 'Doanh nghiệp'],
    ['tin-tuc.html', 'Tin tức'], ['hoi-dap.html', 'Tin tức'], ['gioi-thieu.html', 'Giới thiệu'], ['tam-nhin-su-menh.html', 'Giới thiệu'], ['he-thong-cua-hang.html', 'Giới thiệu'],
    ['chinh-sach.html?type=bao-hanh', 'Giới thiệu'], ['lien-he.html', 'Liên hệ'], ['thuong-hieu.html', 'Sản phẩm'], ['san-pham.html?id=1001', 'Sản phẩm']]) {
    await page.goto(`${fe}${u}`);
    await page.waitForSelector('.mainnav');
    check(await active() === want, `${u}: tô sáng "${want}"`);
  }

  console.log('Kích thước màn hình');
  for (const w of [1280, 1024, 900]) {
    await page.setViewportSize({ width: w, height: 700 });
    await page.goto(`${fe}index.html`);
    await page.waitForSelector('.mainnav');
    check(await page.evaluate(() => { const u = document.querySelector('.mainnav ul'); return u.scrollWidth <= u.clientWidth && document.documentElement.scrollWidth <= innerWidth; }), `${w}px: menu không tràn`);
  }
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', (e) => errors.push(`${m.url()}: ${e.message}`));
  await m.goto(`${fe}index.html`);
  await m.waitForSelector('#burger');
  check(await m.locator('.mainnav').isHidden() && await m.locator('#drawer a[href="du-an.html"]').count() === 1, 'điện thoại: dùng menu ngăn kéo');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
