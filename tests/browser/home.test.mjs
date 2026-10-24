// Kiểm thử: banner chính chỉ hiển thị hình; khối danh mục trang chủ 1 hàng (tối đa 10 sản phẩm + "Xem tất cả");
// website không còn thông tin "Trả góp" và "Miễn phí lắp đặt". Chạy: node tests/browser/home.test.mjs
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

try {
  console.log('Banner chính');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#slider .slide');
  const n = await page.evaluate(() => DT.banners.length);
  check(await page.locator('#slider .slide').count() === n, `${n} banner`);
  check(await page.locator('#slider .slide h2, #slider .slide p, #slider .slide .btn, #slider .slide-tag').count() === 0, 'banner không còn chữ, nhãn, nút bấm');
  check(await page.locator('#slider .slide.active .slide-ph').count() === 1, 'chưa có ảnh → khung chờ ghi kích thước ảnh nên dùng');
  check(await page.locator('#slider .slide').first().evaluate((a) => a.tagName === 'A' && !!a.getAttribute('href')), 'bấm vào banner mở liên kết của banner');
  await page.click('#slider .slider-nav.next');
  check(await page.locator('#slider .slide').nth(1).evaluate((s) => s.classList.contains('active')), 'nút chuyển banner hoạt động');

  console.log('Khối danh mục trang chủ');
  const blocks = page.locator('#cat-sections [data-block]');
  const nb = await blocks.count();
  let ok = true; const info = [];
  for (let i = 0; i < nb; i++) {
    const r = await blocks.nth(i).evaluate((s) => {
      const t = s.querySelector('.car-track');
      const cards = t.querySelectorAll('.pcard').length;
      const tops = new Set([...t.children].map((c) => Math.round(c.getBoundingClientRect().top)));
      const total = DT.products.filter((p) => p.cat === s.dataset.block).length;
      return { id: s.dataset.block, cards, rows: tops.size, total, more: !!t.querySelector('.car-more'), arrows: s.querySelectorAll('.car-btn').length };
    });
    info.push(`${r.id}: ${r.cards}/${r.total}`);
    if (r.rows !== 1 || r.cards !== Math.min(10, r.total) || r.more !== (r.total > 10) || r.arrows !== 2) ok = false;
  }
  check(nb > 0 && ok, `mỗi khối 1 hàng, tối đa 10 sản phẩm, có mũi tên, "Xem tất cả" khi nhiều hơn 10 (${info.join(', ')})`);
  const ac = page.locator('[data-block="may-lanh"]');
  const x0 = await ac.locator('.car-track').evaluate((t) => t.scrollLeft);
  await ac.locator('.car-btn.next').click();
  await page.waitForTimeout(700);
  check(await ac.locator('.car-track').evaluate((t) => t.scrollLeft) > x0, 'bấm mũi tên → kéo sang phải');
  await ac.locator('.tab[data-sub]').nth(1).click();
  const sub = await ac.locator('.tab[data-sub]').nth(1).getAttribute('data-sub');
  const subOk = await ac.evaluate((s, sb) => [...s.querySelectorAll('.car-track .pcard')].every((c) => DT.api.productById(Number(c.dataset.id)).sub === sb), sub);
  check(await ac.locator('.car-track').count() === 1 && subOk, 'bấm tab loại con → hàng sản phẩm đúng loại');
  const more = ac.locator('.car-more');
  if (await more.count()) { await more.click(); await page.waitForURL(/danh-muc\.html\?cat=may-lanh/); check(true, '"Xem tất cả" cuối hàng mở trang danh mục'); }

  console.log('Không còn "Trả góp" / "Miễn phí lắp đặt"');
  for (const u of ['index.html', 'danh-muc.html?cat=may-lanh', 'khuyen-mai.html', 'san-pham.html?id=1001', 'so-sanh.html', 'hoi-dap.html', 'chinh-sach.html?type=van-chuyen']) {
    await page.goto(`${fe}${u}`);
    await page.waitForSelector('#site-footer footer, footer');
    await page.waitForTimeout(300);
    const t = (await page.locator('body').innerText()).toLowerCase();
    check(!t.includes('trả góp') && !t.includes('miễn phí lắp đặt') && !t.includes('miễn phí công lắp đặt'), `${u}: không có "Trả góp" / "Miễn phí lắp đặt"`);
  }
  check(!(await page.locator('meta[name=description]').getAttribute('content')).toLowerCase().includes('trả góp'), 'mô tả SEO không còn "trả góp"');
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1001, 1); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('[name=payment]');
  check(await page.locator('[name=payment][value=installment]').count() === 0 && !(await page.locator('main').innerText()).toLowerCase().includes('trả góp'), 'thanh toán: không còn lựa chọn trả góp');

  console.log('Điện thoại');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', (e) => errors.push(`${m.url()}: ${e.message}`));
  await m.goto(`${fe}index.html`);
  await m.waitForSelector('#slider .slide');
  check(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'trang chủ không tràn ngang');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
