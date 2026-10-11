// Kiểm thử Vận hành & quản trị ở chế độ DEMO (chưa kết nối database):
// đo lường qua seo-config.js, nhắc bảo trì khi đặt hàng, đổi vai trò demo (kinh doanh / kế toán),
// lịch bảo trì, xuất Excel MISA, tải ảnh sản phẩm hiện lên website demo, giao diện điện thoại.
// Chạy: node tests/browser/ops-demo.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', acceptDownloads: true });
await blockExternal(ctx);
// Bản tĩnh: mã đo lường đặt trong seo-config.js
await ctx.route(/\/assets\/js\/seo-config\.js(\?.*)?$/, (r) => r.fulfill({ contentType: 'text/javascript', body: "window.DT = window.DT || {}; DT.SEO = { siteUrl: 'https://example.com/', prettyUrls: false, ga4Id: 'G-DEMO1234', metaPixelId: '', cookieConsent: true };" }));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
page.on('dialog', (d) => d.accept());
const fe = `${base}frontend/`;
const admin = `${base}admin/index.html`;
const toast = async (t) => { try { await page.locator('.toast', { hasText: t }).first().waitFor({ timeout: 6000 }); return true; } catch { return false; } finally { await page.evaluate(() => document.querySelectorAll('.toast').forEach((x) => x.remove())); } };
const go = async (hash, sel = '.ad-head h1, .ad-empty') => {
  await page.evaluate(() => document.querySelectorAll('#view > div').forEach((d) => d.setAttribute('data-old', '1'))).catch(() => {});
  await page.goto(`${admin}#/${hash}`);
  await page.waitForFunction((s) => { const v = document.querySelector('#view > div:not([data-old])'); return !!v && !v.querySelector('.ad-loading') && !!v.querySelector(s); }, sel, { timeout: 15000 });
};
const role = async (r) => {
  await page.selectOption('#demo-role', r);
  await page.waitForFunction((x) => document.querySelector('#demo-role')?.value === x && document.querySelector('#view > div') && !document.querySelector('#view .ad-loading'), r);
};
const nav = () => page.locator('.ad-side [data-nav]').evaluateAll((a) => a.map((x) => x.dataset.nav));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

try {
  console.log('Website demo: đo lường từ seo-config.js, nguồn khách, nhắc bảo trì');
  await page.goto(`${fe}index.html?utm_source=google&utm_medium=cpc&utm_campaign=may-lanh-hcm&gclid=G1`);
  await page.waitForSelector('.cookie-bar');
  check(await page.locator('script[src*="gtag/js?id=G-DEMO1234"]').count() === 1, 'bản tĩnh: GA4 lấy mã trong seo-config.js');
  await page.click('[data-consent="granted"]');
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1020, 1, { install: true }); DT.store.addToCart(1025, 1); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('#maintenance');
  await page.fill('[name=name]', 'Anh Demo Bảo Trì');
  await page.fill('[name=phone]', '0377111222');
  await page.check('[name=method][value=pickup]');
  await page.check('#maintenance');
  await page.click('#co-form button[type=submit]');
  await page.waitForURL(/dat-hang-thanh-cong/);
  const order = await page.evaluate(() => DT.store.get().orders[0]);
  check(order.maintenance === true && order.attribution?.source === 'google' && order.attribution?.gclid === 'G1', 'đơn demo lưu đồng ý nhắc bảo trì + nguồn google / cpc');
  check(await page.evaluate(() => DT.analytics.log.some((e) => e[0] === 'purchase')) || JSON.parse(await page.evaluate(() => localStorage.getItem('dt_purchase_sent_v1') || '[]')).includes(order.code), 'ghi nhận Purchase');
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1025, 1); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('#co-form');
  check(await page.locator('#maintenance').count() === 0, 'đơn không có máy lạnh: không hỏi nhắc bảo trì');
  await page.goto(`${fe}lien-he.html`);
  await page.waitForSelector('form[data-lead]');
  const form = page.locator('form[data-lead]').first();
  for (const [n, v] of [['name', 'Chị Nguồn Google'], ['phone', '0377999888'], ['email', 'a@b.vn'], ['message', 'Cần báo giá']]) if (await form.locator(`[name=${n}]`).count()) await form.locator(`[name=${n}]`).fill(v);
  if (await form.locator('[name=consent]').count()) await form.locator('[name=consent]').check();
  await form.locator('button:not([type=button])').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('dt_leads_v1') || '[]').some((l) => l.data?.phone === '0377999888'));
  const lead = await page.evaluate(() => JSON.parse(localStorage.getItem('dt_leads_v1')).find((l) => l.data?.phone === '0377999888'));
  check(lead.data.src === 'google / cpc / may-lanh-hcm', 'lead demo ghi nguồn google / cpc / may-lanh-hcm');

  console.log('Quản trị demo: đơn hoàn thành → lịch bảo trì');
  await page.goto(admin);
  await page.click('#demo-enter');
  await page.waitForSelector('.ad-side');
  check(await page.locator('#demo-role').count() === 1, 'thanh demo có ô đổi vai trò');
  await go(`orders/${order.code}`, '#ops');
  check(await page.locator('#ops [name=maintenance_optin]').isChecked(), 'chi tiết đơn: đã tick nhắc bảo trì (khách chọn)');
  check((await page.locator('.ad-dl').allTextContents()).join(' ').includes('google / cpc / may-lanh-hcm'), 'chi tiết đơn: hiện nguồn khách');
  await page.selectOption('#ops [name=status]', 'done');
  await page.click('#ops button');
  await toast('Đã lưu');
  await go('maintenance', '.kpis');
  check(await page.locator('.ad-table tbody tr', { hasText: 'Anh Demo Bảo Trì' }).count() === 4, 'lịch bảo trì: 4 lần nhắc (6 / 12 / 18 / 24 tháng)');
  check((await page.locator('.ad-table tbody tr').first().textContent()).includes('Lần 1') && (await page.locator('.ad-table tbody tr').first().textContent()).includes('1 x'), 'lần 1, chỉ tính máy lạnh');
  check(await page.locator('.ad-alert', { hasText: 'Bản demo' }).count() === 1, 'ghi chú bản demo');

  console.log('Đổi vai trò demo: kinh doanh, kế toán');
  await go('leads', '.ad-table');
  const leadRow = page.locator('.ad-table tbody tr', { hasText: 'Chị Nguồn Google' });
  check((await leadRow.textContent()).includes('google / cpc'), 'danh sách lead hiện nguồn');
  await leadRow.click();
  await page.waitForSelector('#lf [name=assigned_to]');
  await page.selectOption('#lf [name=assigned_to]', 'demo-sales-1');
  await page.click('#lf button');
  check(await toast('Đã cập nhật'), 'giao lead cho KD Minh (demo)');
  await role('sales');
  check(JSON.stringify(await nav()) === '["leads"]', 'kinh doanh: menu chỉ có khách hàng của tôi');
  await go('leads', '.ad-table');
  check(await page.locator('.ad-table tbody tr').count() === 1 && await page.locator('.ad-table tbody tr', { hasText: 'Chị Nguồn Google' }).count() === 1, 'kinh doanh: chỉ thấy lead được giao');
  await go('dashboard');
  check((await page.locator('.ad-empty').textContent()).includes('không có quyền'), 'kinh doanh: không xem Tổng quan');
  await role('accountant');
  check(JSON.stringify(await nav()) === '["orders","reports","misa"]', 'kế toán: Đơn hàng & thanh toán, Báo cáo, MISA');
  await go(`orders/${order.code}`, '#ops');
  check(await page.locator('#ops [name=status]').count() === 0 && await page.locator('[data-status]').count() === 0, 'kế toán: chỉ sửa thanh toán');
  await page.selectOption('#ops [name=payment_status]', 'paid');
  await page.click('#ops button');
  check(await toast('Đã lưu'), 'kế toán xác nhận đã thu tiền');
  await go('misa', '#pv .kpis');
  check((await page.locator('#pv .kpi').first().textContent()).includes('1'), 'MISA: 1 chứng từ (đơn hoàn thành)');
  check((await page.locator('#pv').textContent()).includes('Khớp tổng tiền đơn hàng'), 'MISA: tổng khớp');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const buf = fs.readFileSync(await dl.path());
  check(buf.readUInt32LE(0) === 0x04034b50 && buf.includes(Buffer.from('Thu tiền ngay - Tiền mặt')) && buf.includes(Buffer.from('DV-LAPDAT')), 'file .xlsx: đơn COD đã thu → tiền mặt, có dòng phí lắp đặt');
  await role('admin');
  check((await nav()).includes('settings'), 'về lại quản trị viên: đủ menu');

  console.log('Ảnh sản phẩm demo → website demo');
  await go('products/1020', '#frm');
  await page.locator('[data-gal="images"] input[type=file]').setInputFiles([{ name: '1.png', mimeType: 'image/png', buffer: PNG }, { name: '2.png', mimeType: 'image/png', buffer: PNG }]);
  await page.waitForFunction(() => document.querySelectorAll('[data-gal="images"] .ad-gal-item').length === 2, null, { timeout: 15000 });
  await page.click('#frm .ad-form-foot .btn-primary');
  check(await toast('Đã lưu'), 'lưu 2 ảnh (nén thành data URL trên trình duyệt)');
  await page.goto(`${fe}san-pham.html?id=1020`);
  await page.waitForSelector('#g-main');
  check(await page.locator('#g-main img[src^="data:image/"]').count() === 1 && await page.locator('.gallery-thumbs button').count() === 2, 'website demo hiện ảnh vừa tải');
  await page.goto(`${fe}danh-muc.html?cat=may-lanh`);
  await page.waitForSelector('.product-card, .p-card, [data-id]');
  check(await page.locator('img[src^="data:image/"]').count() >= 1, 'danh sách sản phẩm hiện ảnh thật');

  console.log('Điện thoại');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const h of ['maintenance', 'misa', 'products/1020', 'reports', 'customers', 'trust', 'vision', 'settings']) {
    await go(h);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(w <= 392, `quản trị #/${h}: không tràn ngang (${w}px)`);
  }
  await page.goto(`${fe}thanh-toan.html`).catch(() => {});

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
