// Catalog Row: nơi DUY NHẤT chuyển bản ghi database (snake_case) <-> dữ liệu website (camelCase).
// Dùng chung cho: website (core/backend.js), quản trị demo (admin/assets/js/db.js), quản trị React
// (admin/src/services/runtime.ts) và công cụ tạo dữ liệu mẫu MySQL (tools/build-mysql-seed.mjs).
// Thêm một trường mới: thêm MỘT dòng vào danh sách fields của loại dữ liệu đó.
window.DT = window.DT || {};
DT.rows = (() => {
  const num = (v) => Number(v);
  const numOr0 = (v) => Number(v || 0);
  const numOrNull = (v) => (v == null ? null : Number(v));
  const or = (fallback) => (v) => v || (
    Array.isArray(fallback) ? [...fallback] :
    fallback && typeof fallback === 'object' ? { ...fallback } : fallback
  );

  // fields: [tên trên website, tên trong database, chuyển khi đọc (database -> website), chuyển khi ghi (website -> database)]
  // keepView: giữ thêm các trường khác khi đọc; keepRow: giữ thêm các trường khác khi ghi
  function resource(fields, { columns, keepView = false, keepRow = false } = {}) {
    const list = fields.map(([view, row = view, read = (v) => v, write = (v) => v]) => ({ view, row, read, write }));
    return {
      // Danh sách cột cho truy vấn select= (mặc định: đúng các trường đã khai báo)
      columns: columns || list.map((f) => f.row).join(','),
      toView(row = {}) {
        const out = keepView ? { ...row } : {};
        for (const f of list) out[f.view] = f.read(row[f.row], row);
        return out;
      },
      toRow(view = {}) {
        const out = keepRow ? { ...view } : {};
        for (const f of list) {
          if (keepRow && f.view !== f.row) delete out[f.view];
          out[f.row] = f.write(view[f.view], view);
        }
        return out;
      },
    };
  }

  const product = resource([
    ['id'], ['sku'], ['slug'], ['name'], ['cat'], ['sub'],
    ['sub2', 'sub2', (v) => v || '', (v) => v || ''], ['brand'],
    ['price', 'price', num],
    ['oldPrice', 'old_price', numOrNull],
    ['rating', 'rating', num],
    ['reviews'], ['sold'], ['stock'],
    ['badges', 'badges', or([]), or([])],
    ['gift'], ['installment'],
    ['freeInstall', 'free_install'],
    ['flashSale', 'flash_sale'],
    ['attrs', 'attrs', or({})],
    ['specs', 'specs', or({})],
    ['highlights', 'highlights', or([])],
    ['short', 'short', or('')],
    ['warranty', 'warranty', or('')],
    ['technology', 'technology', (v) => v || '', (v) => v || ''],
    ['origin', 'origin', (v) => v || '', (v) => v || ''],
    ['description', 'description', or(''), or('')],
    ['options', 'options', or({}), or({})],
    ['productTags', 'product_tags', or([]), or([])],
    ['requiresShipping', 'requires_shipping', (v) => v !== false, (v) => v !== false],
    ['weight', 'weight', numOr0, numOr0],
    ['weightUnit', 'weight_unit', or('g'), or('g')],
    ['art', 'art', or({ type: 'generic', color: 'white' })],
    ['images', 'images', (v) => (v?.length ? v : ['art:0'])],
    ['createdAt', 'created_at', (v) => String(v).slice(0, 10)],
  ], { columns: '*' });

  // Dịch vụ: website dùng desc, database lưu description
  const service = resource([
    ['id'], ['name'],
    ['price', 'price', num],
    ['unit'], ['icon'],
    ['desc', 'description'],
  ], { keepView: true, keepRow: true, columns: 'id,name,price,unit,icon,description,image' });

  const project = resource([
    ['slug'], ['title'], ['client'], ['industry'], ['location'], ['year'], ['units'], ['capacity'], ['duration'],
    ['summary'], ['content'], ['testimonial'],
    ['featured', 'featured', (v) => v, (v) => !!v],
    ['beforeImage', 'before_image', (v) => v, (v) => v || null],
    ['afterImage', 'after_image', (v) => v, (v) => v || null],
    ['images', 'images', or([]), or([])],
    ['testimonialName', 'testimonial_name'],
    ['testimonialRole', 'testimonial_role'],
  ], { keepView: true, columns: '*' });

  const coupon = resource([
    ['code'], ['type'],
    ['value', 'value', num],
    ['max', 'max', numOrNull, (v) => v ?? null],
    ['min', 'min', num],
    ['desc', 'description'],
  ], { keepView: true, columns: '*' });

  return { product, service, project, coupon };
})();
