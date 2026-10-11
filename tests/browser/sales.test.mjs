// Kiểm thử công cụ tăng chuyển đổi (chế độ DEMO): báo giá doanh nghiệp, khung chat + giờ gọi lại,
// tính công suất máy lạnh, combo mua kèm, gợi ý ở giỏ hàng, giao diện điện thoại.
// Chạy: node tests/browser/sales.test.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { server, base } = await pagesServer(ROOT);
const browser = await chromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
await blockExternal(ctx);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
page.on('dialog', (d) => d.accept());
const fe = `${base}frontend/`;
const money = (n) => `${Math.round(n).toLocaleString('vi-VN')}₫`;
const leads = () => page.evaluate(() => JSON.parse(localStorage.getItem('dt_leads_v1') || '[]'));
const cart = () => page.evaluate(() => DT.store.get().cart);

try {
  console.log('Giờ làm việc & lời hẹn gọi lại');
  await page.goto(`${fe}index.html`);
  await page.waitForSelector('#fl-chat');
  const t = await page.evaluate(() => ({
    day: DT.u.callbackText(new Date('2026-10-12T03:00:00Z')),      // 10:00 VN
    night: DT.u.callbackText(new Date('2026-10-12T16:00:00Z')),    // 23:00 VN
    early: DT.u.callbackText(new Date('2026-10-12T22:00:00Z')),    // 05:00 VN
    open: DT.u.isOpen(new Date('2026-10-12T00:30:00Z')),           // 07:30 VN -> mở
    closed: DT.u.isOpen(new Date('2026-10-12T14:30:00Z')),         // 21:30 VN -> đóng
  }));
  check(/15 phút/.test(t.day), `trong giờ: hẹn gọi lại 15 phút (${t.day})`);
  check(/ngoài giờ.*trước 9h sáng mai/i.test(t.night), `ngoài giờ tối: "trước 9h sáng mai" (${t.night})`);
  check(/trước 9h sáng nay/.test(t.early), `sáng sớm: "trước 9h sáng nay" (${t.early})`);
  check(t.open === true && t.closed === false, 'mở cửa 7:30, đóng 21:30');
  const t2 = await page.evaluate(() => { DT.config.openTime = '08:00'; DT.config.closeTime = '17:30'; const r = DT.u.callbackText(new Date('2026-10-12T11:00:00Z')); DT.config.openTime = '07:30'; DT.config.closeTime = '21:30'; return r; });
  check(/trước 9h30 sáng mai/.test(t2), `giờ mở cửa theo cài đặt (8:00 → hẹn trước 9h30): ${t2}`);

  console.log('Khung chat');
  await page.click('#fl-chat');
  await page.waitForSelector('#chat-panel.show');
  check(await page.locator('#chat-panel .cp-zalo').count() === 1 && await page.locator('#chat-panel .cp-call').count() === 1, 'có nút Zalo & gọi hotline');
  check(await page.locator('#chat-panel .cp-mess').count() === 0, 'chưa cài link Messenger → ẩn nút Messenger');
  check((await page.locator('#chat-panel .cp-status').textContent()).length > 10, 'hiện trạng thái trực tuyến / ngoài giờ');
  await page.fill('#chat-panel [name=phone]', '12345');
  await page.click('#chat-panel [type=submit]');
  check(await page.locator('#chat-panel .field.invalid').count() === 1 && (await leads()).length === 0, 'SĐT sai → báo lỗi, không gửi');
  await page.fill('#chat-panel [name=phone]', '0912 345 678');
  await page.selectOption('#chat-panel [name=topic]', { index: 1 });
  await page.click('#chat-panel [type=submit]');
  await page.waitForSelector('#chat-panel .cp-done');
  const l1 = (await leads())[0];
  check(l1?.type === 'contact' && l1.data.phone === '0912345678' && /doanh nghiệp/.test(l1.data.topic), 'gửi yêu cầu gọi lại → lead "liên hệ" đúng SĐT & nhu cầu');
  check(/gọi lại/.test(await page.locator('#chat-panel .cp-done').textContent()), 'hiện lời hẹn gọi lại sau khi gửi');
  await page.click('#chat-panel .cp-x');
  check(!(await page.locator('#chat-panel').evaluate((el) => el.classList.contains('show'))), 'đóng khung chat');
  await page.evaluate(() => { DT.config.messenger = 'https://m.me/test'; });

  console.log('Trang sản phẩm: báo giá doanh nghiệp & combo mua kèm');
  await page.evaluate(() => { localStorage.removeItem('dt_leads_v1'); DT.store.clearCart(); });
  await page.goto(`${fe}san-pham.html?id=1001`);
  await page.waitForSelector('.btn-b2b');
  check(await page.locator('.calc-hint[href="tinh-cong-suat-may-lanh.html"]').count() === 1, 'máy lạnh có link "Tính công suất"');
  const p = await page.evaluate(() => { const x = DT.api.productById(1001); return { price: x.price, sku: x.sku }; });
  // Combo
  const items = page.locator('#bundle .bundle-item');
  check(await items.count() === 3, `máy 1 HP treo tường: 3 phụ kiện gợi ý (${await items.count()})`);
  check(await page.locator('#bundle-add').isDisabled(), 'chưa chọn phụ kiện → nút combo bị khóa');
  const acc = await page.evaluate(() => [...document.querySelectorAll('#bundle input')].map((i) => DT.api.productById(Number(i.value))).map((x) => ({ id: x.id, price: x.price, sku: x.sku })));
  check(!acc.some((a) => a.sku === 'DT1066'), 'máy 1 HP không gợi ý ống đồng 6/12 (dành cho 2 HP)');
  await items.nth(0).locator('input').check();
  await items.nth(2).locator('input').check();
  await page.fill('#qty', '2');
  await page.locator('#qty').dispatchEvent('input');
  const want = p.price * 2 + acc[0].price + acc[2].price;
  check((await page.locator('#bundle-total').textContent()) === money(want), `tổng combo = 2 máy + 2 phụ kiện (${money(want)})`);
  await page.click('#bundle-add');
  const c1 = await cart();
  check(c1.length === 3 && c1.find((i) => i.id === 1001)?.qty === 2 && c1.some((i) => i.id === acc[0].id) && c1.some((i) => i.id === acc[2].id), 'thêm combo → giỏ có máy (x2) + 2 phụ kiện');
  check(await page.locator('#bundle input:checked').count() === 0 && await page.locator('#bundle-add').isDisabled(), 'sau khi thêm: bỏ chọn, khóa nút');
  // Báo giá doanh nghiệp
  await page.click('.btn-b2b');
  await page.waitForSelector('.quote-form');
  check(await page.locator('.quote-form [name=qty]').inputValue() === '5', 'mặc định số lượng 5 (mua sỉ)');
  check((await page.locator('.quote-form .qi-name').textContent()).includes(p.sku), 'form hiện đúng sản phẩm & mã SKU');
  await page.click('.quote-form [type=submit]');
  check(await page.locator('.quote-form .field.invalid').count() >= 3 && (await leads()).length === 0, 'thiếu thông tin → báo lỗi, không gửi');
  await page.fill('.quote-form [name=company]', 'Cty TNHH Test FDI');
  await page.fill('.quote-form [name=name]', 'Chị Mai');
  await page.fill('.quote-form [name=phone]', '0903111222');
  await page.fill('.quote-form [name=email]', 'sai-email');
  await page.fill('.quote-form [name=qty]', '25');
  await page.click('.quote-form [type=submit]');
  check((await leads()).length === 0, 'chưa tick đồng ý / email sai → không gửi');
  await page.check('.quote-form [name=consent]');
  await page.click('.quote-form [type=submit]');
  check((await leads()).length === 0 && await page.locator('.quote-form [name=email]').evaluate((el) => el.closest('.field').classList.contains('invalid')), 'email sai → báo lỗi');
  await page.fill('.quote-form [name=email]', 'mai@fdi.vn');
  await page.click('.quote-form [type=submit]');
  await page.waitForSelector('.modal .cb-text');
  const q = (await leads())[0];
  check(q?.type === 'b2b-quote' && q.data.sku === p.sku && q.data.qty === '25' && q.data.company === 'Cty TNHH Test FDI' && /Số lượng: 25/.test(q.data.items), 'gửi báo giá → lead B2B có mã SP, số lượng 25, công ty');
  await page.click('.modal [data-close]');
  await page.click('.promo-box [data-quote]');
  check(await page.locator('.quote-form').count() === 1, 'link "nhận báo giá riêng" mở form báo giá');
  await page.keyboard.press('Escape');

  console.log('Máy 2 HP & máy không phải máy lạnh');
  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('.btn-b2b');
  const sk3 = await page.evaluate(() => [...document.querySelectorAll('#bundle input')].map((i) => DT.api.productById(Number(i.value)).sku));
  check(sk3.includes('DT1066') && !sk3.includes('DT1065'), `máy 2 HP gợi ý ống đồng 6/12 (${sk3.join(', ')})`);
  await page.goto(`${fe}san-pham.html?id=1025`);
  await page.waitForSelector('.btn-b2b');
  check(await page.locator('#bundle').count() === 0 && await page.locator('.calc-hint').count() === 0, 'tủ lạnh: không có combo & link tính công suất, vẫn có báo giá DN');

  console.log('Giỏ hàng: gợi ý mua kèm & báo giá sỉ');
  await page.goto(`${fe}gio-hang.html`);
  await page.waitForSelector('.cart-item');
  check(await page.locator('.cart-xsell [data-xsell]').count() === 1, 'gợi ý 1 phụ kiện còn thiếu');
  check(await page.locator('#cart-quote').count() === 1, 'giỏ ≥ 3 sản phẩm → gợi ý báo giá sỉ');
  await page.click('.cart-xsell [data-xsell]');
  await page.waitForFunction(() => DT.store.get().cart.length === 4);
  check(await page.locator('.cart-xsell').count() === 0, 'thêm phụ kiện → giỏ đủ, ẩn gợi ý');
  await page.click('#cart-quote');
  await page.waitForSelector('.quote-form');
  check(await page.locator('.quote-form .qi').count() === 4 && await page.locator('.quote-form [name=qty]').count() === 0, 'báo giá cả giỏ: liệt kê 4 sản phẩm kèm số lượng');
  await page.fill('.quote-form [name=company]', 'Cty Giỏ Hàng');
  await page.fill('.quote-form [name=name]', 'Anh Nam');
  await page.fill('.quote-form [name=phone]', '0903999888');
  await page.check('.quote-form [name=consent]');
  await page.click('.quote-form [type=submit]');
  await page.waitForSelector('.modal .cb-text');
  const q2 = (await leads())[0];
  check(q2?.data.items.split('\n').length === 4 && q2.data.qty === '5' && /giỏ hàng/.test(q2.data.projectType), 'lead báo giá cả giỏ: 4 dòng, tổng 5 sản phẩm');
  await page.click('.modal [data-close]');

  console.log('Tính công suất máy lạnh');
  await page.goto(`${fe}tinh-cong-suat-may-lanh.html`);
  await page.waitForSelector('.calc-hp');
  const hp = () => page.locator('.calc-hp').textContent();
  check((await hp()).trim() === '1.5 HP', `mặc định 18 m² phòng ngủ → 1.5 HP (${(await hp()).trim()})`);
  check(await page.locator('#calc-products-list .pcard').count() > 0 && (await page.locator('#calc-products-title').textContent()).includes('1.5 HP'), 'gợi ý máy 1.5 HP');
  for (const [area, opts, expect] of [[12, {}, '1 HP'], [25, {}, '2 HP'], [30, { sun: '1.2' }, '2.5 HP'], [45, {}, '3 HP'], [100, { room: 'vanphong' }, '2 máy × 4 HP']]) {
    if (opts.sun) await page.check(`[name=sun][value="${opts.sun}"]`, { force: true }); else await page.check('[name=sun][value="1"]', { force: true });
    await page.check(`[name=room][value="${opts.room || 'ngu'}"]`, { force: true });
    await page.fill('#c-area', String(area));
    check((await hp()).trim() === expect, `${area} m²${opts.sun ? ' nắng chiều' : ''}${opts.room ? ' văn phòng' : ''} → ${expect} (${(await hp()).trim()})`);
  }
  await page.fill('#c-area', '1');
  check(await page.locator('#c-area').evaluate((el) => el.closest('.field').classList.contains('invalid')) && await page.locator('.calc-hp').count() === 0, 'diện tích không hợp lệ → báo lỗi');
  await page.fill('#c-area', '20');
  await page.check('[name=room][value="ngu"]', { force: true });
  await page.check('[name=sun][value="1"]', { force: true });
  const bill = await page.locator('.calc-bill b').allTextContents();
  const [inv, std] = bill.map((s) => Number(s.replace(/\D/g, '')));
  check(inv > 0 && std > inv, `ước tính tiền điện: Inverter ${money(inv)} < máy thường ${money(std)}`);
  check(await page.locator('script[type="application/ld+json"][data-ld="FAQPage"]').count() === 1, 'có dữ liệu FAQ cho Google');
  await page.goto(`${fe}tinh-cong-suat-may-lanh.html?dt=35&nang=1.2&phong=khach`);
  await page.waitForSelector('.calc-hp');
  check((await hp()).trim() === '3 HP' && await page.locator('#c-area').inputValue() === '35', `mở link chia sẻ → khôi phục kết quả (35 m² nắng chiều, phòng khách → ${(await hp()).trim()})`);
  await page.fill('#calc-lead-form [name=name]', 'Anh Tính');
  await page.fill('#calc-lead-form [name=phone]', '0904555666');
  await page.click('#calc-lead-form [type=submit]');
  check((await leads()).find((l) => l.data?.phone === '0904555666') === undefined, 'chưa tick đồng ý → không gửi');
  await page.check('#calc-lead-form [name=consent]');
  await page.click('#calc-lead-form [type=submit]');
  await page.waitForSelector('.modal .cb-text');
  const lc = (await leads()).find((l) => l.data?.phone === '0904555666');
  check(lc?.type === 'service' && /35 m².*3 HP/.test(lc.data.note), 'đặt khảo sát → lead dịch vụ kèm kết quả tính');
  await page.click('.modal [data-close]');
  await page.goto(`${fe}danh-muc.html?cat=may-lanh`);
  await page.waitForSelector('.pgrid .pcard');
  check(await page.locator('.calc-hint-cat').count() === 1, 'danh mục máy lạnh có gợi ý tính công suất');

  console.log('Điện thoại');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  await blockExternal(m);
  const mp = await m.newPage();
  mp.on('pageerror', (e) => errors.push(`mobile ${mp.url()}: ${e.message}`));
  for (const u of ['tinh-cong-suat-may-lanh.html', 'san-pham.html?id=1001', 'gio-hang.html', 'index.html']) {
    await mp.goto(`${fe}${u}`);
    await mp.waitForTimeout(500);
    check(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${u}: không tràn ngang`);
  }
  await mp.tap('#fl-chat');
  await mp.waitForSelector('#chat-panel.show');
  const box = await mp.locator('#chat-panel').boundingBox();
  check(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0, 'khung chat nằm gọn trong màn hình điện thoại');
  await mp.goto(`${fe}san-pham.html?id=1001`);
  await mp.waitForSelector('.btn-b2b');
  await mp.locator('.btn-b2b').scrollIntoViewIfNeeded();
  await mp.tap('.btn-b2b');
  await mp.waitForSelector('.quote-form');
  const qb = await mp.locator('.modal.quote-modal').boundingBox();
  check(qb.width <= 390, 'form báo giá vừa màn hình điện thoại');

  check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} catch (e) {
  check(false, `lỗi khi chạy kịch bản: ${e.message}`);
}
await browser.close();
server.close();
done();
