import assert from 'node:assert/strict';
import fs from 'node:fs';

const seed = JSON.parse(fs.readFileSync(new URL('../../server/seed-test.json', import.meta.url), 'utf8'));
const pk = {coupons:'code',posts:'slug',projects:'slug',policies:'key',settings:'key'};
for (const [table, rows] of Object.entries(seed)) {
  if (table !== 'settings') assert.ok(rows.length >= 10 && rows.length <= 20, `${table}: 10–20 mẫu`);
  assert.equal(new Set(rows.map(r => String(r[pk[table] || 'id']))).size, rows.length, `${table}: khóa duy nhất`);
}
const find = (table, id) => seed[table].find(row => row[pk[table] || 'id'] === id);
for (const product of seed.products) {
  assert.ok(find('categories',product.cat));
  assert.ok(find('brands',product.brand));
  assert.ok(product.stock >= 0 && product.price >= 0);
}
for (const order of seed.orders) {
  const customer = find('crm_customers', order.customer_id);
  assert.equal(customer.profile_id, order.user_id);
  assert.equal(customer.phone, order.phone);
  const items = seed.order_items.filter(item => item.order_id === order.id);
  assert.ok(items.length > 0);
  for (const item of items) assert.ok(find('products',item.product_id));
  assert.equal(order.subtotal, items.reduce((sum,item)=>sum+item.price*item.qty,0));
  assert.equal(order.total, order.subtotal+order.install_fee+order.shipping_fee-order.discount);
  assert.ok(seed.order_status_history.some(h=>h.order_id===order.id&&h.status===order.status));
  assert.ok(seed.payments.some(p=>p.order_id===order.id&&p.amount===order.total));
}
assert.ok(seed.orders.filter(o=>o.status==='done'&&o.payment_status==='paid').length >= 5);
assert.ok(seed.orders.some(o=>o.status==='cancelled'));
for (const review of seed.reviews) {
  assert.ok(find('products',review.product_id));
  assert.ok(find('profiles',review.user_id));
  assert.ok(review.rating >= 1 && review.rating <= 5);
}
assert.equal(seed.notifications.filter(n=>n.event==='maintenance_reminder').length,10);
assert.ok(seed.notifications.every(n=>n.status!=='done'&&find('orders',n.order_id)));
assert.ok(!('users' in seed), 'Không sinh tài khoản đăng nhập hoặc mật khẩu mẫu');
console.log('PASS: số lượng, khóa duy nhất, quan hệ dữ liệu, tổng tiền và các tình huống thử nghiệm.');
