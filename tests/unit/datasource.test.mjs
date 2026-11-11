// Nguồn dữ liệu website (frontend/assets/js/core/datasource.js): cùng một interface, hai adapter.
// Test đi qua DT.store (đúng chỗ trang React gọi), không cần trình duyệt hay máy chủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
function boot({ backend } = {}) {
  const storage = new Map();
  const localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
  const context = { console, localStorage, sessionStorage: localStorage, location: { href: 'http://test/frontend/' }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, document: { dispatchEvent() {} } };
  context.window = context;
  vm.createContext(context);
  for (const file of ['data/catalog', 'data/content', 'core/rows', 'core/utils', 'core/api', 'core/promotions', 'core/datasource', 'core/store']) {
    vm.runInContext(fs.readFileSync(new URL(`frontend/assets/js/${file}.js`, root), 'utf8'), context, { filename: file });
  }
  const DT = context.DT;
  DT.backend = backend || { enabled: false };
  const product = DT.products.find((p) => p.price < 1000000 && !DT.api.optionGroups(p).length);
  const loadAdmin = () => {
    vm.runInContext(fs.readFileSync(new URL('admin/assets/js/db.js', root), 'utf8'), context, { filename: 'admin/db' });
    return context.AD.db;
  };
  return { DT, storage, product, loadAdmin, json: (k) => JSON.parse(storage.get(k) || 'null') };
}
const customer = { name: 'Khách Test', phone: '0901234567', email: '' };

test('demo: đặt hàng nhận tại cửa hàng, tra cứu, hủy đơn', async () => {
  const { DT, product } = boot();
  DT.store.addToCart(product.id, 2);
  const order = await DT.store.placeOrder({ customer, shipping: { method: 'pickup', store: 'Q7' }, payment: 'cod' });
  assert.equal(order.shippingFee, 0);
  assert.equal(order.total, product.price * 2);
  assert.equal(DT.store.cartCount(), 0);
  assert.equal((await DT.store.trackOrder(order.code, customer.phone)).code, order.code);
  assert.equal((await DT.store.cancelOrder(order.code, customer.phone)).status, 'cancelled');
});

test('demo: mã giảm giá của quản trị demo, tăng / giảm lượt dùng', async () => {
  const { DT, storage, product, json } = boot();
  storage.set('dt_admin_demo_v1', JSON.stringify({ touched: { coupons: true }, coupons: [{ code: 'QA10', type: 'percent', value: 10, min: 0, active: true, used_count: 0, description: 'Giảm 10%' }] }));
  DT.store.addToCart(product.id, 1);
  const applied = await DT.store.applyCoupon('qa10', customer.phone);
  assert.deepEqual({ ...applied }, { ok: true, msg: 'Đã áp dụng: Giảm 10%' });
  const order = await DT.store.placeOrder({ customer, shipping: { method: 'delivery', address: 'x' }, payment: 'cod' });
  assert.equal(order.discount, Math.floor(product.price * 0.1));
  assert.equal(json('dt_admin_demo_v1').coupons[0].used_count, 1);
  await DT.store.cancelOrder(order.code, customer.phone);
  assert.equal(json('dt_admin_demo_v1').coupons[0].used_count, 0);
  assert.equal((await DT.store.applyCoupon('KHONGCO')).ok, false);
});

test('demo: đơn của tôi, yêu cầu tư vấn, đánh giá', async () => {
  const { DT, product, json, loadAdmin } = boot();
  DT.store.get().user = { id: 7, name: 'A', phone: customer.phone };
  DT.store.addToCart(product.id, 1);
  await DT.store.placeOrder({ customer, shipping: { method: 'pickup', store: 'Q7' }, payment: 'cod' });
  assert.equal((await DT.store.syncMyOrders()).length, 1);
  const lead = await DT.dataSource.current().submitLead('contact', { phone: customer.phone });
  assert.equal(json('dt_leads_v1')[0].type, 'contact');
  assert.equal(json('dt_leads_v1')[0].data.phone, customer.phone, 'quản trị đọc thông tin trong data');
  assert.ok(lead.id && lead.createdAt);
  assert.equal(lead.status, 'new');
  const r = await DT.dataSource.current().submitReview(product.id, { name: 'A', rating: 5, text: 'Tốt' });
  assert.equal(r.pending, false);
  assert.equal(r.review.text, 'Tốt', 'React dùng review trả về để hiển thị ngay');
  assert.equal(json('dt_reviews_v1')[product.id][0].text, 'Tốt', 'quản trị đọc đánh giá theo mã sản phẩm');
  assert.ok(r.review.date);
  assert.equal(DT.dataSource.current().localReviews(product.id)[0].text, 'Tốt');
  const admin = loadAdmin();
  const leads = await admin.list('leads');
  assert.equal(leads.rows[0].phone, customer.phone, 'adapter quản trị thực đọc được yêu cầu tư vấn');
  const reviews = await admin.list('reviews');
  assert.equal(reviews.rows[0].product_id, product.id);
  assert.equal(reviews.rows[0].text, 'Tốt', 'adapter quản trị thực đọc được đánh giá');
});

test('mysql: mọi thao tác đi qua API máy chủ, không ghi localStorage', async () => {
  const calls = [];
  const backend = {
    enabled: true,
    clearCache: () => calls.push(['clearCache']),
    insert: async (table, row) => { calls.push(['insert', table, row]); return null; },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === 'validate_coupon_cart') return { ok: true, coupon: { code: 'VIP', type: 'fixed', value: '50000', min: '0', description: 'Riêng VIP' } };
      if (name === 'place_order') return { code: 'DTX', customer: args.p_customer, total: 1 };
      if (name === 'my_orders') return [{ code: 'DTX' }];
      return { ok: true };
    },
  };
  const { DT, storage, product } = boot({ backend });
  DT.store.get().user = { id: 7, phone: customer.phone };
  DT.store.addToCart(product.id, 1);
  assert.equal((await DT.store.applyCoupon('vip', customer.phone)).msg, 'Đã áp dụng: Riêng VIP');
  assert.equal(DT.store.totals(customer.phone).discount, 50000, 'mã riêng máy chủ xác nhận được dùng để tính tổng');
  const order = await DT.store.placeOrder({ customer, shipping: { method: 'delivery', address: 'x' }, payment: 'cod', maintenance: true });
  assert.equal(order.code, 'DTX');
  const place = calls.find(([n]) => n === 'place_order')[1];
  assert.deepEqual(JSON.parse(JSON.stringify(place.p_items)), [{ id: product.id, qty: 1, install: false, options: {} }]);
  assert.equal(place.p_coupon, 'VIP');
  assert.ok(calls.some(([n]) => n === 'order_extras'), 'gửi đồng ý nhắc bảo trì');
  await DT.store.cancelOrder('DTX', customer.phone);
  assert.equal((await DT.store.syncMyOrders()).length, 1);
  await DT.dataSource.current().submitLead('newsletter', { email: 'a@b.c' });
  assert.equal((await DT.dataSource.current().submitReview(product.id, { name: 'A', rating: 5, text: 'x' })).pending, true);
  assert.deepEqual(calls.map(([n]) => n).filter((n) => n !== 'clearCache'), ['validate_coupon_cart', 'place_order', 'order_extras', 'cancel_order', 'my_orders', 'submit_lead', 'insert']);
  assert.equal(storage.get('dt_leads_v1'), undefined);
  assert.equal(storage.get('dt_reviews_v1'), undefined);
  assert.equal(calls.find(([name]) => name === 'submit_lead')[1].p_source_url, 'http://test/frontend/');
});

test('hai adapter cung cấp đầy đủ các thao tác mà website sử dụng', () => {
  const { DT } = boot();
  for (const adapter of [DT.dataSource.demo, DT.dataSource.mysql]) {
    for (const method of ['findCoupon', 'couponContext', 'validateCoupon', 'placeOrder', 'trackOrder', 'cancelOrder', 'myOrders', 'submitLead', 'submitReview', 'localReviews']) {
      assert.equal(typeof adapter[method], 'function', method);
    }
  }
});

test('demo: sai số điện thoại không tra cứu/hủy được, hủy hai lần không trừ thêm lượt mã', async () => {
  const { DT, storage, product, json } = boot();
  storage.set('dt_admin_demo_v1', JSON.stringify({ touched: { coupons: true }, coupons: [{ code: 'ONCE', type: 'fixed', value: 1000, active: true, used_count: 0 }] }));
  DT.store.addToCart(product.id);
  await DT.store.applyCoupon('ONCE', customer.phone);
  const order = await DT.store.placeOrder({ customer, shipping: { method: 'pickup' }, payment: 'cod' });
  assert.equal(await DT.store.trackOrder(order.code, '0909999999'), null);
  assert.equal(await DT.store.trackOrder(order.code, ''), null);
  await assert.rejects(DT.store.cancelOrder(order.code, '0909999999'));
  assert.equal(order.status, 'pending');
  await DT.store.cancelOrder(order.code.toLowerCase(), '+84 901 234 567');
  assert.equal(json('dt_shop_v1').orders[0].status, 'cancelled');
  await assert.rejects(DT.store.cancelOrder(order.code, customer.phone));
  assert.equal(json('dt_admin_demo_v1').coupons[0].used_count, 0);
});

test('mysql: đặt hàng thất bại giữ nguyên giỏ, không lưu đơn giả', async () => {
  const { DT, product } = boot({ backend: { enabled: true, rpc: async () => { throw new Error('Hết hàng'); } } });
  DT.store.addToCart(product.id, 2);
  await assert.rejects(DT.store.placeOrder({ customer, shipping: { method: 'pickup' }, payment: 'cod' }), /Hết hàng/);
  assert.equal(DT.store.cartCount(), 2);
  assert.equal(DT.store.get().orders.length, 0);
});

test('mysql: lỗi thông tin phụ không làm mất đơn đã tạo', async () => {
  const calls = [];
  const backend = { enabled: true, clearCache() {}, async rpc(name) {
    calls.push(name);
    if (name === 'place_order') return { code: 'DTOK', customer };
    throw new Error('Không lưu được thông tin phụ');
  } };
  const { DT, product } = boot({ backend });
  DT.store.addToCart(product.id);
  const order = await DT.store.placeOrder({ customer, shipping: { method: 'pickup' }, payment: 'cod', maintenance: true });
  assert.equal(order.code, 'DTOK');
  assert.equal(DT.store.cartCount(), 0);
  assert.deepEqual(calls, ['place_order', 'order_extras']);
});

test('demo: giữ đánh giá cũ khi thêm đánh giá mới và đổi từ danh sách phẳng', async () => {
  const { DT, storage, product, json } = boot();
  storage.set('dt_reviews_v1', JSON.stringify([{ product_id: product.id, name: 'Cũ', text: 'Đánh giá cũ', created_at: '2026-01-01', rating: 4 }]));
  await DT.dataSource.current().submitReview(product.id, { name: 'Mới', text: 'Đánh giá mới', rating: 5 });
  assert.equal(json('dt_reviews_v1')[product.id].length, 2);
  assert.equal(DT.dataSource.current().localReviews(product.id)[1].date, '2026-01-01');
});
