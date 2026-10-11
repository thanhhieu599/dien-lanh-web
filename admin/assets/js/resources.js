// Cấu hình các mục quản lý dạng "danh sách + form" (CRUD chung).
window.AD = window.AD || {};

(() => {
  const { esc, money, badge, d, thumb } = AD.ui;
  const yes = (v) => (v ? '<span class="st st-ok">Hiện</span>' : '<span class="st st-muted">Ẩn</span>');
  const catOpts = () => (AD.cache.categories || []).map((c) => [c.id, c.name]);
  const brandOpts = () => (AD.cache.brands || []).map((b) => [b.id, b.name]);
  const catOf = (id) => (AD.cache.categories || []).find((c) => c.id === id);
  const slugRule = (v) => (v && !/^[a-z0-9-]+$/.test(v) ? 'Chỉ dùng chữ thường không dấu, số và dấu -' : null);
  const ICONS = ['snow', 'fridge', 'box', 'washer', 'wind', 'drop', 'fan', 'tool', 'wrench', 'spray', 'building', 'truck', 'gift', 'zap'];
  const ARTS = ['ac', 'ac-cassette', 'ac-floor', 'ac-duct', 'fridge', 'fridge-sbs', 'fridge-multi', 'fridge-mini', 'freezer', 'cooler-cabinet',
    'washer', 'washer-top', 'purifier', 'dehumidifier', 'heater', 'cooler', 'pipe', 'pipe-drain', 'gas', 'bracket', 'gauge', 'generic'];

  AD.resources = {
    // ------------------------------------------------------------------ Sản phẩm
    products: {
      title: 'Sản phẩm', icon: 'box', table: 'products', order: 'id.desc', pageSize: 20,
      search: ['name', 'sku', 'slug'],
      filters: [
        { key: 'cat', label: 'Danh mục', options: catOpts },
        { key: 'brand', label: 'Thương hiệu', options: brandOpts },
        { key: 'active', label: 'Trạng thái', options: [['true', 'Đang bán'], ['false', 'Đã ẩn']] },
        { key: 'flash_sale', label: 'Flash sale', options: [['true', 'Có']] },
        { key: 'stock', label: 'Tồn kho', op: 'lte', options: [['0', 'Hết hàng'], ['5', 'Sắp hết (≤5)']] },
      ],
      columns: [
        { label: '', render: (r) => thumb(r), cls: 'w-thumb' },
        { label: 'Sản phẩm', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.sku)} • ${esc(catOf(r.cat)?.short || r.cat)}</small>` },
        { label: 'Giá bán', render: (r) => `<b class="price">${money(r.price)}</b>${r.old_price ? `<small><del>${money(r.old_price)}</del></small>` : ''}`, cls: 'num' },
        { label: 'Tồn', render: (r) => `<span class="${r.stock <= 0 ? 'txt-danger' : r.stock <= 5 ? 'txt-warn' : ''}">${r.stock}</span>`, cls: 'num' },
        { label: 'Đã bán', key: 'sold', cls: 'num' },
        { label: 'Nhãn', render: (r) => [r.flash_sale && '<span class="st st-danger">Flash</span>', r.free_install && '<span class="st st-info">Free lắp</span>'].filter(Boolean).join(' ') },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      csv: ['id', 'sku', 'name', 'cat', 'sub', 'brand', 'price', 'old_price', 'stock', 'sold', 'active', 'flash_sale', 'free_install', 'warranty'],
      defaults: () => ({ active: true, installment: true, stock: 0, rating: 5, reviews: 0, sold: 0, badges: [], attrs: {}, specs: {}, highlights: [], images: [], art: { type: 'generic', color: 'white' }, cat: AD.cache.categories?.[0]?.id }),
      fields: [
        { key: '_g1', type: 'custom', render: () => '<h4 class="ad-sec">Thông tin cơ bản</h4>', read: () => undefined, col: 'full' },
        { key: 'name', label: 'Tên sản phẩm', required: true, col: 'full' },
        { key: 'sku', label: 'Mã SKU', required: true, col: 'third' },
        { key: 'slug', label: 'Đường dẫn (slug)', col: 'third', validate: slugRule, help: 'Để trống = tự tạo từ tên sản phẩm' },
        { key: 'brand', label: 'Thương hiệu', type: 'select', options: brandOpts, required: true, col: 'third' },
        { key: 'cat', label: 'Danh mục', type: 'select', options: catOpts, required: true, col: 'third', rerender: true },
        { key: 'sub', label: 'Loại', type: 'select', col: 'third', options: (ctx) => (catOf(ctx.values.cat)?.subs || []).map((s) => [s.id, s.name]) },
        { key: 'warranty', label: 'Bảo hành', col: 'third', placeholder: '24 tháng' },
        { key: '_g2', type: 'custom', render: () => '<h4 class="ad-sec">Giá & tồn kho</h4>', read: () => undefined, col: 'full' },
        { key: 'price', label: 'Giá bán (₫)', type: 'money', step: 1, required: true, col: 'quarter', validate: (v) => (v < 0 ? 'Giá không hợp lệ' : null) },
        { key: 'old_price', label: 'Giá gốc (₫)', type: 'money', step: 1, col: 'quarter', validate: (v, o) => (v != null && v < o.price ? 'Giá gốc phải ≥ giá bán' : null) },
        { key: 'stock', label: 'Tồn kho', type: 'number', step: 1, col: 'quarter', required: true, validate: (v) => (v < 0 || !Number.isInteger(v) ? 'Số nguyên ≥ 0' : null) },
        { key: 'sold', label: 'Đã bán', type: 'number', step: 1, col: 'quarter', def: 0 },
        { key: 'active', label: 'Đang bán (hiện trên website)', type: 'bool', col: 'third' },
        { key: 'flash_sale', label: 'Flash sale', type: 'bool', col: 'third' },
        { key: 'free_install', label: 'Miễn phí lắp đặt', type: 'bool', col: 'third' },
        { key: 'installment', label: 'Trả góp 0%', type: 'bool', col: 'third' },
        { key: 'badges', label: 'Nhãn', type: 'tags', col: 'third', help: 'hot, bestseller, new, premium, project, b2b' },
        { key: 'gift', label: 'Quà tặng / khuyến mãi kèm', col: 'third' },
        { key: '_g3', type: 'custom', render: () => '<h4 class="ad-sec">Bộ lọc & thông số</h4>', read: () => undefined, col: 'full' },
        {
          key: 'attrs', label: 'Thuộc tính bộ lọc', type: 'custom', col: 'full',
          help: 'Dùng cho bộ lọc ở trang danh mục (theo cấu hình của danh mục)',
          render: (v, ctx) => {
            const fs = catOf(ctx.values.cat)?.filters || [];
            if (!fs.length) return '<div class="ad-ro">Danh mục chưa cấu hình bộ lọc</div>';
            return `<div class="ad-grid">${fs.map((f) => `<div class="ad-field quarter"><label>${esc(f.label)}</label><select data-attr="${esc(f.key)}"><option value="">--</option>${f.options.map((o) => `<option ${v?.[f.key] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`).join('')}</div>`;
          },
          read: (form) => Object.fromEntries([...form.querySelectorAll('[data-attr]')].filter((s) => s.value).map((s) => [s.dataset.attr, s.value])),
        },
        { key: 'short', label: 'Mô tả ngắn (hiện dưới tên)', col: 'full' },
        { key: 'highlights', label: 'Đặc điểm nổi bật (mỗi dòng 1 ý)', type: 'lines', col: 'half', rows: 6 },
        { key: 'specs', label: 'Thông số kỹ thuật', type: 'kv', col: 'half' },
        { key: '_g4', type: 'custom', render: () => '<h4 class="ad-sec">Hình ảnh</h4>', read: () => undefined, col: 'full' },
        { key: 'images', label: 'Ảnh sản phẩm', type: 'gallery', folder: 'products', max: 10, col: 'full' },
        {
          key: 'art', label: 'Ảnh minh họa (khi chưa có ảnh thật)', type: 'custom', col: 'half',
          render: (v) => `<div class="ad-grid"><div class="ad-field half"><select data-art="type">${ARTS.map((a) => `<option ${v?.type === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            <div class="ad-field half"><select data-art="color">${['white', 'silver', 'black', 'gold'].map((a) => `<option ${v?.color === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div></div>`,
          read: (form) => ({ type: form.querySelector('[data-art=type]').value, color: form.querySelector('[data-art=color]').value }),
        },
      ],
      beforeSave: (row) => { if (!row.slug) row.slug = DT.u.slugify(row.name); },
      // Đường dẫn trùng (vd nhân bản, 2 sản phẩm cùng tên) -> thêm mã SKU vào cuối
      onDuplicate: (row, msg) => (/slug/.test(msg) && row.sku ? { ...row, slug: `${row.slug}-${DT.u.slugify(row.sku)}` } : null),
      preview: (row) => `../frontend/san-pham.html?id=${row.id}`,
      duplicate: true,
    },

    // ------------------------------------------------------------------ Danh mục
    categories: {
      title: 'Danh mục', icon: 'grid', table: 'categories', order: 'sort.asc', search: ['name', 'id'],
      columns: [
        { label: 'Thứ tự', key: 'sort', cls: 'num' },
        { label: 'Danh mục', render: (r) => `${DT.icon(r.icon)} <b>${esc(r.name)}</b><small>${esc(r.id)}</small>` },
        { label: 'Loại con', render: (r) => (r.subs || []).map((s) => esc(s.name)).join(', ') },
        { label: 'Bộ lọc', render: (r) => (r.filters || []).map((f) => esc(f.label)).join(', ') },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, icon: 'box', subs: [], filters: [], sort: (AD.cache.categories?.length || 0) }),
      fields: [
        { key: 'id', label: 'Mã (slug)', required: true, readonlyOnEdit: true, col: 'third', validate: slugRule },
        { key: 'name', label: 'Tên danh mục', required: true, col: 'third' },
        { key: 'short', label: 'Tên ngắn (menu)', required: true, col: 'third' },
        { key: 'icon', label: 'Biểu tượng', type: 'select', options: ICONS, col: 'third', def: 'box' },
        { key: 'art', label: 'Ảnh minh họa', type: 'select', options: ARTS, col: 'third' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'active', label: 'Hiển thị', type: 'bool', col: 'full' },
        { key: 'subs', label: 'Loại con', type: 'json', empty: [], col: 'half', rows: 10, help: '[{"id":"treo-tuong","name":"Máy lạnh treo tường"}]' },
        { key: 'filters', label: 'Bộ lọc', type: 'json', empty: [], col: 'half', rows: 10, help: '[{"key":"capacity","label":"Công suất","options":["1 HP","1.5 HP"]}]' },
      ],
      afterSave: () => AD.loadCache(true),
    },

    brands: {
      title: 'Thương hiệu', icon: 'tag', table: 'brands', order: 'sort.asc', search: ['name', 'id'],
      columns: [
        { label: 'Thứ tự', key: 'sort', cls: 'num' },
        { label: 'Thương hiệu', render: (r) => `<b style="color:${esc(r.color || '#333')}">${esc(r.name)}</b><small>${esc(r.id)}</small>` },
        { label: 'Xuất xứ', key: 'origin' },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, color: '#0b5ed7', sort: (AD.cache.brands?.length || 0) }),
      fields: [
        { key: 'id', label: 'Mã (slug)', required: true, readonlyOnEdit: true, col: 'third', validate: slugRule },
        { key: 'name', label: 'Tên', required: true, col: 'third' },
        { key: 'origin', label: 'Xuất xứ', col: 'third' },
        { key: 'color', label: 'Màu thương hiệu', col: 'third', placeholder: '#0b5ed7' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'active', label: 'Hiển thị', type: 'bool', col: 'third' },
      ],
      afterSave: () => AD.loadCache(true),
    },

    // ------------------------------------------------------------------ Khuyến mãi
    coupons: {
      title: 'Mã giảm giá', icon: 'percent', table: 'coupons', order: 'code.asc', search: ['code', 'description'],
      columns: [
        { label: 'Mã', render: (r) => `<b class="mono">${esc(r.code)}</b><small>${esc(r.description || '')}</small>` },
        { label: 'Mức giảm', render: (r) => (r.type === 'percent' ? `${r.value}%${r.max ? ` (tối đa ${money(r.max)})` : ''}` : r.type === 'fixed' ? money(r.value) : 'Miễn phí ship') },
        { label: 'Đơn tối thiểu', render: (r) => money(r.min), cls: 'num' },
        { label: 'Đã dùng', render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}`, cls: 'num' },
        { label: 'Hiệu lực', render: (r) => `${r.starts_at ? d(r.starts_at) : '…'} → ${r.ends_at ? d(r.ends_at) : '…'}` },
        { label: 'Trạng thái', render: (r) => `${r.active ? '<span class="st st-ok">Bật</span>' : '<span class="st st-muted">Tắt</span>'} ${r.is_public ? '' : '<span class="st st-info">Riêng</span>'}` },
      ],
      defaults: () => ({ type: 'percent', value: 10, min: 0, active: true, is_public: true, used_count: 0 }),
      fields: [
        { key: 'code', label: 'Mã', required: true, readonlyOnEdit: true, col: 'third', validate: (v) => (!/^[A-Z0-9_-]{3,30}$/.test(String(v || '').toUpperCase()) ? 'Chữ không dấu / số, 3-30 ký tự' : null) },
        { key: 'type', label: 'Loại', type: 'select', required: true, options: [['percent', 'Giảm %'], ['fixed', 'Giảm số tiền'], ['ship', 'Miễn phí vận chuyển']], col: 'third' },
        { key: 'value', label: 'Giá trị (% hoặc ₫)', type: 'number', required: true, col: 'third', validate: (v, o) => (v < 0 || (o.type === 'percent' && v > 100) ? 'Giảm % phải từ 0 đến 100' : null) },
        { key: 'max', label: 'Giảm tối đa (₫, cho loại %)', type: 'money', col: 'third' },
        { key: 'min', label: 'Đơn tối thiểu (₫)', type: 'money', required: true, col: 'third' },
        { key: 'usage_limit', label: 'Giới hạn lượt dùng', type: 'number', step: 1, col: 'third' },
        { key: 'starts_at', label: 'Bắt đầu', type: 'datetime', col: 'third' },
        { key: 'ends_at', label: 'Kết thúc', type: 'datetime', col: 'third', validate: (v, o) => (v && o.starts_at && v <= o.starts_at ? 'Phải sau thời điểm bắt đầu' : null) },
        { key: 'used_count', label: 'Đã dùng', type: 'readonly', col: 'third' },
        { key: 'description', label: 'Mô tả (hiện cho khách)', col: 'full' },
        { key: 'active', label: 'Đang bật', type: 'bool', col: 'third' },
        { key: 'is_public', label: 'Công khai (gợi ý ở giỏ hàng)', type: 'bool', col: 'third', help: 'Tắt = mã riêng, gửi cho khách VIP / doanh nghiệp' },
      ],
      beforeSave: (row) => { if (row.code) row.code = row.code.toUpperCase(); },
    },

    banners: {
      title: 'Banner trang chủ', icon: 'zap', table: 'banners', order: 'sort.asc', search: ['title'],
      columns: [
        { label: 'Thứ tự', key: 'sort', cls: 'num' },
        { label: 'Tiêu đề', render: (r) => `<b>${esc(r.title)}</b><small>${esc(r.sub || '')}</small>` },
        { label: 'Liên kết', render: (r) => `<span class="mono">${esc(r.href || '')}</span>` },
        { label: 'Màu', key: 'theme' },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, theme: 'blue', art: 'ac', sort: 0 }),
      fields: [
        { key: 'title', label: 'Tiêu đề', required: true, col: 'full' },
        { key: 'sub', label: 'Dòng phụ', col: 'full' },
        { key: 'cta', label: 'Nút bấm', col: 'third' },
        { key: 'href', label: 'Liên kết', col: 'third', placeholder: 'danh-muc.html?cat=may-lanh' },
        { key: 'theme', label: 'Màu nền', type: 'select', options: ['blue', 'navy', 'teal', 'orange'], col: 'third' },
        { key: 'art', label: 'Ảnh minh họa', type: 'select', options: ARTS, col: 'third' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'active', label: 'Hiển thị', type: 'bool', col: 'third' },
      ],
    },

    // ------------------------------------------------------------------ Nội dung
    posts: {
      title: 'Bài viết', icon: 'file', table: 'posts', order: 'date.desc', search: ['title', 'slug', 'cat'],
      filters: [{ key: 'published', label: 'Trạng thái', options: [['true', 'Đã đăng'], ['false', 'Nháp']] }],
      columns: [
        { label: 'Bài viết', render: (r) => `<b>${esc(r.title)}</b><small>${esc(r.slug)}</small>` },
        { label: 'Chuyên mục', key: 'cat' },
        { label: 'Ngày', render: (r) => d(r.date) },
        { label: 'Trạng thái', render: (r) => (r.published ? '<span class="st st-ok">Đã đăng</span>' : '<span class="st st-muted">Nháp</span>') },
      ],
      defaults: () => ({ published: false, date: new Date().toISOString().slice(0, 10), author: 'Ban biên tập', art: 'ac', cat: 'Tư vấn chọn mua' }),
      fields: [
        { key: 'title', label: 'Tiêu đề (H1, nên 50-65 ký tự, có từ khóa)', required: true, col: 'full' },
        { key: 'slug', label: 'Đường dẫn (slug)', readonlyOnEdit: true, col: 'third', validate: slugRule, help: 'Để trống = tự tạo từ tiêu đề' },
        { key: 'cat', label: 'Chuyên mục', col: 'third', type: 'select', options: ['Tư vấn chọn mua', 'Mẹo sử dụng', 'Kiến thức kỹ thuật', 'Giải pháp doanh nghiệp', 'Tin khuyến mãi'] },
        { key: 'date', label: 'Ngày đăng', type: 'date', col: 'third', def: new Date().toISOString().slice(0, 10) },
        { key: 'author', label: 'Tác giả', col: 'third' },
        { key: 'art', label: 'Ảnh minh họa', type: 'select', options: ARTS, col: 'third' },
        { key: 'published', label: 'Đăng công khai', type: 'bool', col: 'third' },
        { key: 'excerpt', label: 'Mô tả ngắn / meta description (140-160 ký tự)', type: 'textarea', col: 'full', rows: 2 },
        { key: 'content', label: 'Nội dung (HTML: <h2>, <p>, <ul>, <table>…)', type: 'html', col: 'full', rows: 16 },
      ],
      beforeSave: (row, editing) => { if (!editing && !row.slug) row.slug = DT.u.slugify(row.title); },
      preview: (row) => `../frontend/bai-viet.html?slug=${row.slug}`,
      pk: 'slug',
    },

    projects: {
      title: 'Dự án tiêu biểu', icon: 'building', table: 'projects', order: 'sort.asc', search: ['title', 'slug', 'client', 'industry'],
      filters: [{ key: 'published', label: 'Trạng thái', options: [['true', 'Đã đăng'], ['false', 'Nháp']] }],
      columns: [
        { label: 'Dự án', render: (r) => `<b>${esc(r.title)}</b><small>${esc([r.client, r.location].filter(Boolean).join(' • '))}</small>` },
        { label: 'Quy mô', render: (r) => esc([r.units ? `${r.units} máy` : '', r.capacity].filter(Boolean).join(' • ')) },
        { label: 'Năm', key: 'year' },
        { label: 'Trạng thái', render: (r) => `${r.published ? '<span class="st st-ok">Đã đăng</span>' : '<span class="st st-muted">Nháp</span>'}${r.featured ? ' <span class="st st-info">Trang chủ</span>' : ''}` },
      ],
      defaults: () => ({ published: false, featured: false, sort: 0, year: new Date().getFullYear(), images: [] }),
      fields: [
        { key: 'title', label: 'Tên dự án (H1, nên có loại máy + loại công trình)', required: true, col: 'full' },
        { key: 'slug', label: 'Đường dẫn (slug)', readonlyOnEdit: true, col: 'third', validate: slugRule, help: 'Để trống = tự tạo từ tên' },
        { key: 'client', label: 'Khách hàng', col: 'third', help: 'Có thể ghi chung "Nhà máy FDI" nếu khách không muốn công khai' },
        { key: 'industry', label: 'Lĩnh vực', col: 'third', type: 'select', options: ['Nhà máy FDI', 'Nhà xưởng', 'Văn phòng', 'Nhà hàng – F&B', 'Bán lẻ – Showroom', 'Trường học – Bệnh viện', 'Nhà ở – Căn hộ', 'Khác'] },
        { key: 'location', label: 'Địa điểm', col: 'third' },
        { key: 'year', label: 'Năm', type: 'number', col: 'third' },
        { key: 'sort', label: 'Thứ tự', type: 'number', col: 'third', def: 0 },
        { key: 'units', label: 'Số máy / dàn lạnh', type: 'number', col: 'third' },
        { key: 'capacity', label: 'Tổng công suất (vd 144 HP)', col: 'third' },
        { key: 'duration', label: 'Thời gian thi công (vd 15 ngày)', col: 'third' },
        { key: 'published', label: 'Đăng công khai', type: 'bool', col: 'third' },
        { key: 'featured', label: 'Hiện ở trang chủ', type: 'bool', col: 'third' },
        { key: 'summary', label: 'Tóm tắt (hiện ở thẻ dự án & mô tả Google, 140-200 ký tự)', type: 'textarea', col: 'full', rows: 2 },
        { key: 'before_image', label: 'Ảnh TRƯỚC thi công', type: 'image', folder: 'projects', col: 'half' },
        { key: 'after_image', label: 'Ảnh SAU thi công (ảnh đại diện)', type: 'image', folder: 'projects', col: 'half' },
        { key: 'images', label: 'Thư viện ảnh thêm', type: 'gallery', folder: 'projects', max: 12, col: 'full' },
        { key: 'content', label: 'Nội dung (HTML: <h2>Yêu cầu</h2>, <h2>Giải pháp</h2>, <h2>Kết quả</h2>…)', type: 'html', col: 'full', rows: 12 },
        { key: 'testimonial', label: 'Cảm nhận của khách hàng', type: 'textarea', col: 'full', rows: 2 },
        { key: 'testimonial_name', label: 'Người nhận xét', col: 'half' },
        { key: 'testimonial_role', label: 'Chức vụ / đơn vị', col: 'half' },
      ],
      beforeSave: (row, editing) => { if (!editing && !row.slug) row.slug = DT.u.slugify(row.title); },
      preview: (row) => `../frontend/du-an-chi-tiet.html?slug=${row.slug}`,
      pk: 'slug',
    },

    faqs: {
      title: 'Hỏi đáp (FAQ)', icon: 'chat', table: 'faqs', order: 'sort.asc', search: ['question', 'category'],
      filters: [{ key: 'active', label: 'Trạng thái', options: [['true', 'Hiện'], ['false', 'Ẩn']] }],
      columns: [
        { label: 'Câu hỏi', render: (r) => `<b>${esc(r.question)}</b><small>${esc(r.category)}</small>` },
        { label: 'Thứ tự', key: 'sort' },
        { label: 'Trạng thái', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, sort: 0, category: 'Chọn mua máy lạnh' }),
      fields: [
        { key: 'question', label: 'Câu hỏi (viết đúng cách khách hay hỏi / tìm trên Google)', required: true, col: 'full' },
        { key: 'category', label: 'Nhóm', col: 'third', type: 'select', required: true, options: ['Chọn mua máy lạnh', 'Lắp đặt', 'Sử dụng & tiết kiệm điện', 'Bảo trì & sửa chữa', 'Doanh nghiệp & dự án', 'Mua hàng & bảo hành', 'Chung'] },
        { key: 'sort', label: 'Thứ tự', type: 'number', col: 'third', def: 0 },
        { key: 'active', label: 'Hiện trên website', type: 'bool', col: 'third' },
        { key: 'answer', label: 'Trả lời (2-5 câu, trả lời thẳng vào câu hỏi ở câu đầu; cho phép <b>, <a>, <ul>)', type: 'html', required: true, col: 'full', rows: 6 },
      ],
      preview: () => '../frontend/hoi-dap.html',
    },

    stores: {
      title: 'Cửa hàng', icon: 'pin', table: 'stores', order: 'sort.asc', search: ['name', 'address', 'city'],
      columns: [
        { label: 'Cửa hàng', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.address)}, ${esc(r.city)}</small>` },
        { label: 'Điện thoại', key: 'phone' },
        { label: 'Giờ mở cửa', key: 'hours' },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, hours: '8:00 - 21:00', sort: 0 }),
      fields: [
        { key: 'name', label: 'Tên cửa hàng', required: true, col: 'half' },
        { key: 'city', label: 'Tỉnh / Thành phố', required: true, col: 'half' },
        { key: 'address', label: 'Địa chỉ', required: true, col: 'full' },
        { key: 'phone', label: 'Điện thoại', col: 'third' },
        { key: 'hours', label: 'Giờ mở cửa', col: 'third' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'active', label: 'Hiển thị', type: 'bool', col: 'third' },
      ],
    },

    services: {
      title: 'Dịch vụ', icon: 'tool', table: 'services', order: 'sort.asc', search: ['name'],
      columns: [
        { label: 'Dịch vụ', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.description || '')}</small>` },
        { label: 'Giá từ', render: (r) => (r.price ? `${money(r.price)}/${esc(r.unit || '')}` : 'Báo giá') , cls: 'num' },
        { label: 'Hiển thị', render: (r) => yes(r.active) },
      ],
      defaults: () => ({ active: true, price: 0, icon: 'tool', sort: 0 }),
      fields: [
        { key: 'id', label: 'Mã (slug)', required: true, readonlyOnEdit: true, col: 'third', validate: slugRule },
        { key: 'name', label: 'Tên dịch vụ', required: true, col: 'third' },
        { key: 'icon', label: 'Biểu tượng', type: 'select', options: ICONS, col: 'third', def: 'tool' },
        { key: 'price', label: 'Giá từ (₫, 0 = báo giá)', type: 'money', col: 'third', def: 0 },
        { key: 'unit', label: 'Đơn vị', col: 'third', placeholder: 'máy' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'description', label: 'Mô tả', type: 'textarea', col: 'full' },
        { key: 'active', label: 'Hiển thị', type: 'bool', col: 'third' },
      ],
    },

    policies: {
      title: 'Chính sách', icon: 'shield', table: 'policies', order: 'sort.asc', adminOnly: true,
      columns: [
        { label: 'Chính sách', render: (r) => `<b>${esc(r.title)}</b><small>${esc(r.key)}</small>` },
        { label: 'Thứ tự', key: 'sort', cls: 'num' },
      ],
      defaults: () => ({ sort: 0 }),
      fields: [
        { key: 'key', label: 'Mã (slug)', required: true, readonlyOnEdit: true, col: 'third', validate: slugRule },
        { key: 'title', label: 'Tiêu đề', required: true, col: 'third' },
        { key: 'sort', label: 'Thứ tự', type: 'number', step: 1, col: 'third', def: 0 },
        { key: 'body', label: 'Nội dung (HTML)', type: 'html', required: true, col: 'full', rows: 14 },
      ],
      preview: (row) => `../frontend/chinh-sach.html?type=${row.key}`,
    },
  };
})();
