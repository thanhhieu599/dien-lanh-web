// Kiểm thử các lỗi tìm thấy khi rà soát toàn bộ dự án (chế độ DEMO):
// link thương hiệu, SĐT +84 trong link tra cứu, giới hạn số lượng, phí lắp đặt không áp nhầm, giỏ hàng có sản phẩm ngừng bán,
// dữ liệu quản trị chứa mã độc (XSS / javascript:), trang Tầm nhìn không dò file 404, xuất CSV chống chèn công thức, MISA phân bổ chiết khấu.
// Chạy: node tests/browser/audit.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const fe = `${base}frontend/`;
const admin = `${base}admin/index.html`;
const errors = [];
const newPage = async (viewport = { width: 1280, height: 900 }) => {
  const ctx = await browser.newContext({ viewport, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', acceptDownloads: true });
  await blockExternal(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  return page;
};

try {
  const page = await newPage();
  const http404 = [];
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() === 404) http404.push(r.url()); });

  console.log('Website');
  await page.goto(`${fe}index.html`);
  await page.click('.topbar-left a.brand-link');
  await page.waitForSelector('.brand-tile');
  const brandHref = await page.locator('a.brand-tile').first().getAttribute('href');
  check(/^thuong-hieu\.html\?id=/.test(brandHref), `thương hiệu trỏ tới trang thương hiệu (${brandHref})`);
  await page.click('a.brand-tile');
  await page.waitForSelector('.product-card, .p-card, .pcard, [data-id]');
  check(!/404/.test(page.url()) && await page.locator('[data-action="add-cart"]').count() > 0, 'bấm logo thương hiệu → danh sách sản phẩm (không 404)');

  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1001, 150); });
  check(await page.evaluate(() => DT.store.get().cart[0].qty) === 99, 'số lượng tối đa 99 cho dòng mới');

  await page.goto(`${fe}san-pham.html?id=1020`);
  await page.waitForSelector('#pd [data-action="add-cart"]');
  await page.evaluate(() => DT.store.clearCart());
  const related = page.locator('.product-card [data-action="add-cart"], .pcard [data-action="add-cart"]').first();
  if (await related.count()) {
    const rid = Number(await related.getAttribute('data-id'));
    await related.click();
    check(await page.evaluate((id) => DT.store.get().cart.find((i) => i.id === id)?.install === false, rid), 'thêm sản phẩm liên quan: không tự áp phí lắp đặt của sản phẩm chính');
  } else check(true, '(không có thẻ sản phẩm liên quan để thử)');
  await page.evaluate(() => document.querySelectorAll('.modal-wrap').forEach((x) => x.remove()));
  await page.locator('#pd [data-action="add-cart"]').first().click();
  check(await page.evaluate(() => DT.store.get().cart.find((i) => i.id === 1020)?.install === false), 'trang sản phẩm không còn ô lắp đặt: mặc định chưa tính phí, khách chọn lắp đặt trong giỏ hàng');
  check(await page.locator('#opt-install').count() === 0 && await page.locator('.buy-btns .btn').count() === 2, 'khối nút chỉ còn Mua ngay + Thêm vào giỏ');

  // Sản phẩm ngừng bán còn trong giỏ: tự bỏ, không treo nút đặt hàng
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dt_shop_v1')); s.cart = [{ id: 987654, qty: 1 }]; localStorage.setItem('dt_shop_v1', JSON.stringify(s)); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForURL(/gio-hang/);
  check(await page.evaluate(() => DT.store.get().cart.length) === 0, 'giỏ chỉ có sản phẩm ngừng bán → tự dọn, chuyển về giỏ hàng');

  // Đặt đơn bằng SĐT +84: link tra cứu mã hóa đúng
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1025, 1); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.fill('[name=name]', 'Khách Quốc Tế');
  await page.fill('[name=phone]', '+84912345678');
  await page.check('[name=method][value=pickup]');
  await page.click('#co-form button[type=submit]');
  await page.waitForURL(/dat-hang-thanh-cong/);
  await page.waitForSelector('.success-ic');
  check(await page.locator('h1').count() === 1, 'trang đặt hàng thành công có 1 thẻ h1');
  await page.click('a:has-text("Theo dõi đơn hàng")');
  await page.waitForSelector('#track-result .order-info, #track-result .empty');
  check(await page.locator('#track-result .order-info').count() > 0, 'SĐT +84: bấm "Theo dõi đơn hàng" tìm thấy đơn');

  // Trang Tầm nhìn: không dò file ảnh không tồn tại
  http404.length = 0;
  await page.goto(`${fe}tam-nhin-su-menh.html`);
  await page.waitForSelector('.vm-ph');
  await page.waitForTimeout(500);
  check(http404.length === 0, `trang Tầm nhìn không gây lỗi 404 (${http404.length})`);
  for (const u of ['gio-hang.html', 'thanh-toan.html', 'tai-khoan.html']) {
    await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1025, 1); });
    await page.goto(fe + u);
    await page.waitForTimeout(300);
    check(await page.locator('h1').count() === 1, `${u}: có 1 thẻ h1`);
  }

  console.log('Dữ liệu quản trị chứa mã độc');
  const evil = await newPage();
  await evil.addInitScript(() => {
    window.__xss = 0;
    const set = () => {
      if (!window.DT?.config) return;
      Object.assign(DT.config, { hotline: '<img src=x onerror="window.__xss++">', workingHours: '<b id=wh>x</b>', taxCode: '<i id=tc>1</i>', facebook: 'javascript:alert(1)', zalo: 'javascript:window.__xss++' });
    };
    document.addEventListener('DOMContentLoaded', set);
  });
  await evil.goto(`${fe}index.html`);
  await evil.waitForSelector('#site-footer .socials, #site-footer footer');
  await evil.waitForTimeout(300);
  check(await evil.evaluate(() => window.__xss) === 0 && await evil.locator('#wh, #tc').count() === 0 && (await evil.locator('#site-footer').textContent()).includes('<b id=wh>x</b>'), 'hotline / giờ làm việc / MST chứa HTML → hiện dạng chữ');
  check(await evil.locator('a[href^="javascript:"]').count() === 0, 'link javascript: bị chặn');
  await evil.evaluate(() => DT.u.toast('<img src=x onerror="window.__xss++">'));
  await evil.waitForTimeout(200);
  check(await evil.evaluate(() => window.__xss) === 0 && (await evil.locator('.toast').last().textContent()).includes('<img'), 'thông báo hiển thị dạng chữ');

  console.log('Quản trị');
  const a = await newPage();
  await a.goto(`${fe}index.html`);
  await a.evaluate(() => {
    localStorage.setItem('dt_leads_v1', JSON.stringify([{ id: 'L1', type: 'contact', status: 'new', createdAt: new Date().toISOString(), data: { name: '=HYPERLINK("http://evil","x")', phone: '0901234567', message: '@SUM(1)' } }]));
  });
  await a.goto(admin);
  await a.click('#demo-enter');
  await a.waitForSelector('.ad-side');
  await a.goto(`${admin}#/leads`);
  await a.waitForSelector('#csv');
  const [dl] = await Promise.all([a.waitForEvent('download'), a.click('#csv')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  check(csv.includes(`"'=HYPERLINK(""http://evil"",""x"")"`) && !/,=HYPERLINK/.test(csv), 'xuất CSV: ô bắt đầu bằng = được vô hiệu hóa');
  const lines = await a.evaluate(() => AD.misa.voucherLines({ order_items: [1, 2, 3].map((k) => ({ product_id: 1025, sku: `SP${k}`, name: `Hàng ${k}`, price: 1000000, qty: 1 })), install_fee: 300000, shipping_fee: 0, discount: 200000 }, { vatRate: 10, misaRevenueAcc: '5111', misaServiceAcc: '5113' }));
  check(lines.find((l) => l.code === 'DV-LAPDAT').ck === 0 && lines.every((l) => l.ck >= 0), 'MISA: chiết khấu không phân bổ âm vào dòng phí lắp đặt');
  check(lines.reduce((s, l) => s + l.total, 0) === 3000000 + 300000 - 200000, 'MISA: tổng vẫn khớp đơn');
  await a.goto(`${admin}#/posts/new`);
  await a.waitForSelector('#frm [name=date]');
  check(await a.locator('#frm [name=date]').inputValue() === await a.evaluate(() => AD.today()), 'bài viết mới: ngày đăng theo giờ Việt Nam');

  const m = await newPage({ width: 390, height: 844 });
  await m.goto(`${fe}san-pham.html?id=1001`);
  await m.waitForSelector('#sticky-buy .btn');
  const top = await m.evaluate(() => { const b = document.querySelector('.floating'); const r = b.getBoundingClientRect(); const s = document.querySelector('#sticky-buy').getBoundingClientRect(); return r.bottom <= s.top + 1; });
  check(top, 'điện thoại: nút nổi không bị thanh "Mua ngay" che');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
