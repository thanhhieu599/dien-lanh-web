// Sinh supabase/seed.sql từ dữ liệu frontend hiện tại (catalog.js + content.js).
// Chạy: node tools/build-seed.mjs
// Seed dùng "on conflict do nothing" nên chạy lại không ghi đè dữ liệu đã sửa trong admin.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {};
ctx.window = ctx; // file dữ liệu dùng cả window.DT và DT
vm.createContext(ctx);
for (const f of ['catalog.js', 'content.js']) {
  vm.runInContext(readFileSync(join(root, 'frontend/assets/js/data', f), 'utf8'), ctx);
}
const { DT } = ctx;

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const json = (v) => `${lit(JSON.stringify(v ?? {}))}::jsonb`;
const arr = (a) => (a && a.length ? `array[${a.map(lit).join(', ')}]::text[]` : `'{}'::text[]`);

function insert(table, cols, rows, conflict) {
  if (!rows.length) return '';
  const values = rows.map((r) => `  (${r.join(', ')})`).join(',\n');
  return `insert into public.${table} (${cols.join(', ')}) values\n${values}\non conflict (${conflict}) do nothing;\n\n`;
}

let sql = `-- FILE TỰ SINH bởi tools/build-seed.mjs - dữ liệu mẫu ban đầu\n-- Chạy sau các file trong supabase/migrations/\n\n`;

sql += insert('settings', ['key', 'value'], [[lit('store'), json(DT.config)]], 'key');
sql += insert('categories', ['id', 'name', 'short', 'icon', 'art', 'subs', 'filters', 'sort'],
  DT.categories.map((c, i) => [lit(c.id), lit(c.name), lit(c.short), lit(c.icon), lit(c.art), json(c.subs), json(c.filters), i]), 'id');
sql += insert('brands', ['id', 'name', 'origin', 'color', 'sort'],
  DT.brands.map((b, i) => [lit(b.id), lit(b.name), lit(b.origin), lit(b.color), i]), 'id');
sql += insert('products',
  ['id', 'sku', 'slug', 'name', 'cat', 'sub', 'brand', 'price', 'old_price', 'rating', 'reviews', 'sold', 'stock', 'badges', 'gift',
    'installment', 'free_install', 'flash_sale', 'attrs', 'specs', 'highlights', 'short', 'warranty', 'art', 'images', 'created_at'],
  DT.products.map((p) => [p.id, lit(p.sku), lit(p.slug), lit(p.name), lit(p.cat), lit(p.sub), lit(p.brand), p.price, lit(p.oldPrice),
    p.rating, p.reviews, p.sold, p.stock, arr(p.badges), lit(p.gift), lit(p.installment), lit(p.freeInstall), lit(p.flashSale),
    json(p.attrs), json(p.specs), arr(p.highlights), lit(p.short), lit(p.warranty), json(p.art), arr(p.images), lit(p.createdAt)]), 'id');
sql += insert('stores', ['id', 'name', 'city', 'address', 'phone', 'hours', 'map', 'sort'],
  DT.stores.map((s, i) => [s.id, lit(s.name), lit(s.city), lit(s.address), lit(s.phone), lit(s.hours), lit(s.map), i]), 'id');
sql += insert('posts', ['slug', 'title', 'cat', 'date', 'author', 'art', 'excerpt', 'content'],
  DT.posts.map((p) => [lit(p.slug), lit(p.title), lit(p.cat), lit(p.date), lit(p.author), lit(p.art), lit(p.excerpt), lit(p.content)]), 'slug');
sql += insert('banners', ['id', 'title', 'sub', 'cta', 'href', 'theme', 'art', 'sort'],
  DT.banners.map((b, i) => [i + 1, lit(b.title), lit(b.sub), lit(b.cta), lit(b.href), lit(b.theme), lit(b.art), i]), 'id');
sql += insert('services', ['id', 'name', 'price', 'unit', 'icon', 'description', 'sort'],
  DT.services.map((s, i) => [lit(s.id), lit(s.name), s.price, lit(s.unit), lit(s.icon), lit(s.desc), i]), 'id');
sql += insert('policies', ['key', 'title', 'body', 'sort'],
  Object.entries(DT.policies).map(([k, v], i) => [lit(k), lit(v.title), lit(v.body), i]), 'key');
sql += insert('coupons', ['code', 'type', 'value', 'max', 'min', 'description'],
  DT.coupons.map((c) => [lit(c.code), lit(c.type), c.value, lit(c.max ?? null), c.min, lit(c.desc)]), 'code');

// Dự án mẫu: chèn ở trạng thái NHÁP (published = false) - khách không thấy cho tới khi quản trị nhập dự án thật và bật "Đăng"
sql += insert('projects', ['slug', 'title', 'client', 'industry', 'location', 'year', 'units', 'capacity', 'duration', 'summary', 'content',
  'testimonial', 'testimonial_name', 'testimonial_role', 'featured', 'published', 'sort'],
  (DT.projects || []).map((p, i) => [lit(p.slug), lit(p.title), lit(p.client), lit(p.industry), lit(p.location), lit(p.year ?? null), lit(p.units ?? null),
    lit(p.capacity), lit(p.duration), lit(p.summary), lit(p.content), lit(p.testimonial), lit(p.testimonialName), lit(p.testimonialRole), lit(!!p.featured), 'false', i]), 'slug');
// Hỏi đáp: kiến thức chung, hiển thị ngay (chạy lại không tạo trùng câu hỏi)
for (const f of DT.faqs || []) {
  sql += `insert into public.faqs (category, question, answer, sort) select ${lit(f.category)}, ${lit(f.question)}, ${lit(f.answer)}, ${f.sort}
  where not exists (select 1 from public.faqs where question = ${lit(f.question)});
`;
}
sql += '\n';

// Đồng bộ bộ đếm identity sau khi chèn id cố định
sql += `select setval(pg_get_serial_sequence('public.stores', 'id'), greatest((select max(id) from public.stores), 1));\n`;
sql += `select setval(pg_get_serial_sequence('public.banners', 'id'), greatest((select max(id) from public.banners), 1));\n`;

writeFileSync(join(root, 'supabase/seed.sql'), sql);
console.log(`Đã sinh supabase/seed.sql: ${DT.products.length} sản phẩm, ${DT.categories.length} danh mục, ${DT.posts.length} bài viết`);
