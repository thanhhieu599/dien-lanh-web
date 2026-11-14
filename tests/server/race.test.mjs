// Tranh chấp khi nhiều khách đặt cùng lúc (PHP + MySQL thật, gửi song song qua HTTP):
// - 6 khách cùng mua món hàng cuối cùng -> đúng 1 đơn thành công, tồn kho không âm
// - Mã giảm giá giới hạn 1 lượt, 4 khách dùng cùng lúc -> đúng 1 đơn được giảm
// - Khách bấm "Đặt hàng" 2 lần (cùng mã yêu cầu) -> chỉ 1 đơn, kho trừ 1 lần
// Chạy: API_BASE=http://127.0.0.1:8080/server/api.php TEST_ADMIN_PHONE=... TEST_ADMIN_PASSWORD=... node tests/server/race.test.mjs
import assert from 'node:assert/strict';
const base = process.env.API_BASE || 'http://127.0.0.1:8080/server/api.php';
const phone = process.env.TEST_ADMIN_PHONE, password = process.env.TEST_ADMIN_PASSWORD;
assert.ok(phone && password, 'Set TEST_ADMIN_PHONE and TEST_ADMIN_PASSWORD');
function client() {
  let cookie = '';
  return async (route, { method = 'GET', body } = {}) => {
    const [name, query = ''] = route.split('?');
    const url = new URL(base); url.search = query; url.searchParams.set('route', name);
    const headers = { 'Content-Type': 'application/json', 'X-DT-Request': '1', 'X-DT-Admin': '1' };
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.getSetCookie().filter((c) => /^dt_(session|admin)=/.test(c)).pop();
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
}
const admin = client();
assert.equal((await admin('/auth/login', { method: 'POST', body: { phone, password } })).status, 200);
const tag = `race-${Date.now()}`;
const cat = (await admin('/data/categories?limit=1')).data[0].id;
const brand = (await admin('/data/brands?limit=1')).data[0].id;
const product = (await admin('/data/products', { method: 'POST', body: { id: tag, sku: tag, slug: tag, name: '[QA] Hàng cuối', cat, brand, price: 1000000, stock: 1, active: true } })).data[0];
const order = (i, extra = {}) => client()('/rpc/place_order', { method: 'POST', body: { p_items: [{ id: product.id, qty: 1 }], p_customer: { name: `Khách ${i}`, phone: `09${String(10000000 + i).slice(-8)}` }, p_shipping: { method: 'delivery', address: 'QA' }, p_payment: 'cod', ...extra } });
const get = async () => (await admin(`/data/products?id=eq.${product.id}`)).data[0];

// 1) 6 khách cùng mua món cuối
let results = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => order(i)));
assert.equal(results.filter((r) => r.status === 200).length, 1, 'Chỉ 1 khách mua được món cuối');
assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 400));
assert.equal((await get()).stock, 0, 'Tồn kho về 0, không âm');
console.log('  ✓ 6 khách cùng mua món hàng cuối: đúng 1 đơn, tồn kho 0');

// 2) Mã giới hạn 1 lượt, 4 khách dùng cùng lúc
await admin(`/data/products?id=eq.${product.id}`, { method: 'PATCH', body: { stock: 10 } });
const code = `RACE${Date.now()}`.slice(0, 20);
assert.equal((await admin('/data/coupons', { method: 'POST', body: { code, type: 'fixed', value: 100000, min: 0, usage_limit: 1, used_count: 0, active: true, description: 'QA' } })).status, 200);
results = await Promise.all([11, 12, 13, 14].map((i) => order(i, { p_coupon: code })));
assert.equal(results.filter((r) => r.status === 200).length, 1, 'Chỉ 1 đơn được dùng mã 1 lượt');
assert.equal((await admin(`/data/coupons?code=eq.${code}`)).data[0].used_count, 1);
console.log('  ✓ Mã giảm giá 1 lượt bị 4 khách dùng cùng lúc: đúng 1 đơn được giảm');

// 3) Bấm "Đặt hàng" 2 lần / gửi lại cùng mã yêu cầu
const before = (await get()).stock;
const rid = `req-${Date.now()}-abcdef`;
results = await Promise.all([order(21, { p_request_id: rid }), order(21, { p_request_id: rid })]);
assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.data)));
assert.equal(results[0].data.code, results[1].data.code, 'Cùng 1 mã đơn');
const again = await order(21, { p_request_id: rid });
assert.equal(again.data.code, results[0].data.code, 'Gửi lại sau đó vẫn trả đúng đơn cũ');
assert.equal((await get()).stock, before - 1, 'Kho chỉ trừ 1 lần');
console.log('  ✓ Bấm đặt hàng 2 lần / gửi lại: chỉ 1 đơn, kho trừ 1 lần');

await admin(`/data/coupons?code=eq.${code}`, { method: 'DELETE' });
await admin(`/data/products?id=eq.${product.id}`, { method: 'PATCH', body: { active: false } });
console.log('PASS tranh chấp đặt hàng đồng thời trên PHP/MySQL.');
