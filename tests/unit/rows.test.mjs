// Kiểm thử module Catalog Row (frontend/assets/js/core/rows.js) bằng node, không cần trình duyệt.
// 1) Đối chiếu với ánh xạ cũ (chép nguyên từ backend.js mapProduct/apply và admin db.js seed trước khi gom về rows.js)
// 2) Chuyển đi - chuyển về không làm mất / đổi dữ liệu.
// Chạy: node --test tests/unit
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const context = { console };
context.window = context;
vm.createContext(context);
for (const file of ['frontend/assets/js/data/catalog.js', 'frontend/assets/js/data/content.js', 'frontend/assets/js/core/rows.js']) {
  vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), context, { filename: file });
}
const DT = context.DT;
const plain = (x) => JSON.parse(JSON.stringify(x));

// ---- Ánh xạ cũ (đặc tả hành vi phải giữ nguyên)
const legacyProductToView = (r) => ({
  id: r.id, sku: r.sku, slug: r.slug, name: r.name, cat: r.cat, sub: r.sub, sub2: r.sub2 || '', brand: r.brand,
  price: Number(r.price), oldPrice: r.old_price == null ? null : Number(r.old_price),
  rating: Number(r.rating), reviews: r.reviews, sold: r.sold, stock: r.stock,
  badges: r.badges || [], gift: r.gift, freeInstall: r.free_install, flashSale: r.flash_sale,
  attrs: r.attrs || {}, specs: r.specs || {}, highlights: r.highlights || [], short: r.short || '', warranty: r.warranty || '',
  technology: r.technology || '', origin: r.origin || '',
  description: r.description || '', options: r.options || {}, productTags: r.product_tags || [],
  requiresShipping: r.requires_shipping !== false, weight: Number(r.weight || 0), weightUnit: r.weight_unit || 'g',
  art: r.art || { type: 'generic', color: 'white' }, images: r.images?.length ? r.images : ['art:0'],
  createdAt: String(r.created_at).slice(0, 10),
});
const legacyProductToRow = (p) => ({
  id: p.id, sku: p.sku, slug: p.slug, name: p.name, cat: p.cat, sub: p.sub, sub2: p.sub2 || '', brand: p.brand, price: p.price, old_price: p.oldPrice,
  rating: p.rating, reviews: p.reviews, sold: p.sold, stock: p.stock, badges: p.badges, gift: p.gift,
  free_install: p.freeInstall, flash_sale: p.flashSale, attrs: p.attrs, specs: p.specs, highlights: p.highlights, short: p.short,
  description: p.description || '', options: p.options || {}, product_tags: p.productTags || [], requires_shipping: p.requiresShipping !== false,
  weight: p.weight || 0, weight_unit: p.weightUnit || 'g', warranty: p.warranty, technology: p.technology || '', origin: p.origin || '', art: p.art, images: p.images, created_at: p.createdAt,
});
const legacyServiceToView = (s) => ({ ...s, price: Number(s.price), desc: s.description });
const legacyServiceToRow = (s) => ({ id: s.id, name: s.name, price: s.price, unit: s.unit, icon: s.icon, description: s.desc });
const legacyProjectToView = (r) => ({ ...r, beforeImage: r.before_image, afterImage: r.after_image, images: r.images || [], testimonialName: r.testimonial_name, testimonialRole: r.testimonial_role });
const legacyProjectToRow = (p) => ({
  slug: p.slug, title: p.title, client: p.client, industry: p.industry, location: p.location, year: p.year, units: p.units, capacity: p.capacity,
  duration: p.duration, summary: p.summary, content: p.content, before_image: p.beforeImage || null, after_image: p.afterImage || null,
  images: p.images || [], testimonial: p.testimonial, testimonial_name: p.testimonialName, testimonial_role: p.testimonialRole, featured: !!p.featured,
});
const legacyCouponToView = (c) => ({ ...c, value: Number(c.value), max: c.max == null ? null : Number(c.max), min: Number(c.min), desc: c.description });
const legacyCouponToRow = (c) => ({ code: c.code, type: c.type, value: c.value, max: c.max ?? null, min: c.min, description: c.desc });

const cases = [
  ['product', DT.products, legacyProductToView, legacyProductToRow],
  ['service', DT.services, legacyServiceToView, legacyServiceToRow],
  ['project', DT.projects || [], legacyProjectToView, legacyProjectToRow],
  ['coupon', DT.coupons, legacyCouponToView, legacyCouponToRow],
];

for (const [name, views, legacyToView, legacyToRow] of cases) {
  test(`${name}: có dữ liệu mẫu để kiểm tra`, () => assert.ok(views.length > 0, `${name} rỗng`));
  test(`${name}: toRow giống ánh xạ cũ (db.js seed)`, () => {
    for (const v of views) assert.deepEqual(plain(DT.rows[name].toRow(v)), plain(legacyToRow(v)), `${name} ${v.id || v.slug || v.code}`);
  });
  test(`${name}: toView giống ánh xạ cũ (backend.js)`, () => {
    for (const v of views) {
      const row = legacyToRow(v);
      assert.deepEqual(plain(DT.rows[name].toView(row)), plain(legacyToView(row)), `${name} ${v.id || v.slug || v.code}`);
    }
  });
  test(`${name}: đọc - ghi - đọc lại không đổi dữ liệu`, () => {
    for (const v of views) {
      const once = DT.rows[name].toView(DT.rows[name].toRow(v));
      assert.deepEqual(plain(DT.rows[name].toView(DT.rows[name].toRow(once))), plain(once));
    }
  });
}

test('product: bản ghi thiếu trường dùng giá trị mặc định', () => {
  const v = DT.rows.product.toView({ id: 1, price: '1000', created_at: '2026-01-02T10:00:00Z' });
  assert.equal(v.price, 1000);
  assert.equal(v.oldPrice, null);
  assert.deepEqual(plain(v.images), ['art:0']);
  assert.equal(v.requiresShipping, true);
  assert.equal(v.weightUnit, 'g');
  assert.equal(v.createdAt, '2026-01-02');
});

test('service: cột select= giữ nguyên danh sách cũ', () => {
  assert.equal(DT.rows.service.columns, 'id,name,price,unit,icon,description,image');
});

test('product: giữ danh mục cấp hai, công nghệ và xuất xứ khi chuyển hai chiều', () => {
  const row = { id: 1, price: '123000', sub2: 'inverter', technology: 'Inverter', origin: 'Thái Lan' };
  const view = DT.rows.product.toView(row);
  const saved = DT.rows.product.toRow(view);
  for (const key of ['sub2', 'technology', 'origin']) assert.equal(saved[key], row[key]);
});

test('service: giữ ảnh và các thuộc tính quản trị khi chuyển hai chiều', () => {
  const row = { id: 'lap-dat', price: '200000', description: 'Lắp đặt tại nhà', image: '/assets/service.webp', active: true };
  const view = DT.rows.service.toView(row);
  assert.equal(view.desc, row.description);
  assert.equal(view.price, 200000);
  const saved = DT.rows.service.toRow(view);
  assert.equal(saved.image, row.image);
  assert.equal(saved.active, true);
  assert.equal(saved.description, row.description);
  assert.equal(Object.hasOwn(saved, 'desc'), false);
});

test('product: các bản ghi không dùng chung mảng hoặc đối tượng mặc định', () => {
  const first = DT.rows.product.toView({});
  const second = DT.rows.product.toView({});
  first.badges.push('new');
  first.attrs.capacity = '1 HP';
  first.art.color = 'black';
  assert.deepEqual(plain(second.badges), []);
  assert.deepEqual(plain(second.attrs), {});
  assert.equal(second.art.color, 'white');
});

test('product: trường chuỗi rỗng vẫn nhận mặc định như trước', () => {
  const view = DT.rows.product.toView({ weight_unit: '', description: null });
  assert.equal(view.weightUnit, 'g');
  assert.equal(view.description, '');
});
