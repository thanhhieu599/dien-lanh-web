// Chèn mã độc (XSS) qua form đặt hàng / liên hệ / đường dẫn, rồi mở website + trang quản trị trên trình duyệt thật.
// Đạt khi: không đoạn mã nào chạy (window.__xss không đổi, không hộp thoại), trang không lỗi, dữ liệu hiện ra dạng chữ thường.
// Chạy: HOSTING_BASE=... API_BASE=http://127.0.0.1:8080/server/api.php TEST_ADMIN_PHONE=... TEST_ADMIN_PASSWORD=... node tests/server/xss-browser.test.mjs
import assert from 'node:assert/strict';
import { chromium, blockExternal } from '../browser/lib.mjs';
const base = process.env.HOSTING_BASE || 'http://127.0.0.1:8080/';
const api = process.env.API_BASE || 'http://127.0.0.1:8080/server/api.php';
const phone = process.env.TEST_ADMIN_PHONE, password = process.env.TEST_ADMIN_PASSWORD;
assert.ok(phone && password, 'Set TEST_ADMIN_PHONE and TEST_ADMIN_PASSWORD');
const X = `"><img src=x onerror="window.__xss=1"><script>window.__xss=1</script><svg onload="window.__xss=1">`;
const rpc = async (fn, body) => {
  const res = await fetch(`${api}?route=rpc/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-DT-Request': '1' }, body: JSON.stringify(body) });
  const data = await res.json(); assert.equal(res.status, 200, JSON.stringify(data)); return data;
};
const pick = await (await fetch(`${api}?route=data/products&select=id&stock=gt.2&active=eq.true&order=stock.desc&limit=1`)).json();
assert.ok(pick[0], 'Cần một sản phẩm còn hàng');
const buyer = `09${String(Date.now()).slice(-8)}`;
const order = await rpc('place_order', { p_items: [{ id: pick[0].id, qty: 1 }], p_customer: { name: `Khách ${X}`, phone: buyer, email: `a${X}@x.vn` }, p_shipping: { method: 'delivery', address: `Địa chỉ ${X}`, district: X, province: X }, p_payment: 'cod', p_note: `Ghi chú ${X}`, p_invoice: { company: X, tax_code: X, address: X, email: X } });
await rpc('order_extras', { p_code: order.code, p_phone: buyer, p_maintenance: false, p_attribution: { source: X, medium: X, campaign: X } });
const lead = await rpc('submit_lead', { p_type: 'contact', p_data: { name: `Liên hệ ${X}`, phone: buyer, company: X, message: X, extra: { nested: X } }, p_source_url: `javascript:window.__xss=1//${X}` });
console.log(`  · Đã gửi đơn ${order.code} và liên hệ ${lead.code} chứa mã độc`);

const browser = await chromium();
let checks = 0;
try {
  const context = await browser.newContext(); await blockExternal(context);
  await context.addInitScript(() => { window.__xss = 0; });
  const page = await context.newPage();
  const errors = [], dialogs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  const clean = async (label) => {
    await page.waitForTimeout(400);
    const fired = await page.evaluate(() => window.__xss);
    assert.equal(fired, 0, `Mã độc đã chạy ở ${label}`);
    assert.deepEqual(dialogs, [], `Có hộp thoại lạ ở ${label}`);
    assert.deepEqual(errors, [], `Lỗi trang ở ${label}: ${errors.join(' | ')}`);
    checks++; console.log(`  ✓ ${label}: mã độc không chạy, trang không lỗi`);
  };

  // Website: ô tìm kiếm, đường dẫn sản phẩm, tra cứu đơn có tên/địa chỉ chứa mã độc
  for (const [label, path] of [
    ['Website – tìm kiếm', `tim-kiem.html?q=${encodeURIComponent(X)}`],
    ['Website – sản phẩm với đường dẫn lạ', `san-pham.html?slug=${encodeURIComponent(X)}`],
    ['Website – danh mục với tham số lạ', `danh-muc.html?cat=${encodeURIComponent(X)}&brand=${encodeURIComponent(X)}&sort=${encodeURIComponent(X)}`],
    ['Website – tra cứu đơn hàng', `tra-cuu-don-hang.html?code=${order.code}&phone=${buyer}`],
    ['Website – đặt hàng thành công', `dat-hang-thanh-cong.html?code=${encodeURIComponent(X)}`],
  ]) {
    await page.goto(`${base}frontend/${path}`);
    await page.waitForLoadState('networkidle');
    await clean(label);
  }
  await page.goto(`${base}frontend/tra-cuu-don-hang.html?code=${order.code}&phone=${buyer}`);
  await page.waitForLoadState('networkidle');
  const tracked = await page.locator('body').innerText();
  if (tracked.includes(order.code)) assert.ok(!(await page.locator('img[src="x"], svg[onload]').count()), 'Thẻ ảnh độc hại không được tạo');

  // Quản trị: danh sách và chi tiết đơn / liên hệ / khách hàng / hóa đơn / phiếu xuất
  await page.goto(`${base}admin/`);
  await page.locator('#login [name=id]').fill(phone);
  await page.locator('#login [name=password]').fill(password);
  await page.locator('#login button').click();
  await page.waitForSelector('.ad-side');
  const ids = await page.evaluate(async ({ code, leadCode }) => ({
    order: (await AD.db.list('orders', { filters: [['code', 'eq', code]] })).rows[0],
    lead: (await AD.db.list('leads', { filters: [['code', 'eq', leadCode]] })).rows[0],
  }), { code: order.code, leadCode: lead.code });
  assert.ok(ids.order && ids.lead, 'Tìm thấy đơn và liên hệ thử nghiệm');
  for (const [label, route] of [
    ['Admin – tổng quan', 'dashboard'],
    ['Admin – danh sách đơn', 'orders'],
    ['Admin – chi tiết đơn', `orders/${encodeURIComponent(ids.order.id)}`],
    ['Admin – hóa đơn bán hàng', `invoice/${encodeURIComponent(ids.order.id)}`],
    ['Admin – phiếu xuất kho', `voucher/ban/${encodeURIComponent(ids.order.id)}`],
    ['Admin – danh sách liên hệ', 'leads'],
    ['Admin – chi tiết liên hệ', `leads/${encodeURIComponent(ids.lead.id)}`],
    ['Admin – danh sách khách hàng', 'customers'],
    ['Admin – hồ sơ khách hàng', `customers/${encodeURIComponent(ids.order.customer_id)}`],
    ['Admin – thông báo', 'notifications'],
  ]) {
    await page.goto(`${base}admin/#/${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !document.querySelector('#view [role="status"], .ad-loading'));
    await clean(label);
  }
  await page.goto(`${base}admin/#/orders/${encodeURIComponent(ids.order.id)}`);
  await page.waitForLoadState('networkidle');
  await page.locator('#view').getByText('Ghi chú', { exact: false }).first().waitFor();
assert.ok((await page.locator('#view').innerText()).includes('<img src=x onerror='), 'Mã độc hiện ra dạng chữ thường để nhân viên nhận biết');
  checks++; console.log('  ✓ Admin hiển thị nội dung độc hại dưới dạng chữ, không thực thi');
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0, 'Không có liên kết javascript:');
  await page.goto(`${base}admin/#/leads/${encodeURIComponent(ids.lead.id)}`);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0, 'Đường dẫn nguồn javascript: không thành liên kết bấm được');
  checks++; console.log('  ✓ Đường dẫn "javascript:" không thành liên kết bấm được');
} finally {
  await browser.close();
}
console.log(`PASS chống chèn mã độc (XSS): ${checks} kiểm tra.`);
