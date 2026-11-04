window.AD = window.AD || {};
AD.pages = AD.pages || {};
AD.pages.couponForm = async (id, params, el) => {
  const { esc, field, read, run, confirm, money } = AD.ui;
  const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
  const editing = id !== 'new';
  const row = editing ? await AD.db.get('coupons', id) : params.from ? await AD.db.get('coupons', params.from) : {};
  if (!row) { el.innerHTML = '<p>Không tìm thấy mã khuyến mãi.</p>'; return; }
  if (!editing) Object.assign(row, { code: randomCode(), used_count: 0 });
  const canEdit = AD.can(AD.resources.coupons);
  const values = { type: 'percent', value: 10, min: 0, active: true, is_public: true, combine_discounts: true, scope: 'all', condition_type: Number(row.min) > 0 ? 'order_min' : 'none', condition_value: 0, ...row };
  if (Number(values.min) > 0 && values.condition_type === 'none') values.condition_type = 'order_min';
  const baseFields = AD.resources.coupons.fields.filter((f) => !['type', 'min', 'usage_limit', 'used_count'].includes(f.key)).map((f) => ({ ...f, col: ['value', 'max', 'starts_at', 'ends_at'].includes(f.key) ? 'half' : 'full' }));
  const nonnegative = (v) => v != null && v < 0 ? 'Giá trị phải từ 0 trở lên' : null;
  const fields = [...baseFields,
    { key: 'min', type: 'money', def: 0, validate: nonnegative },
    { key: 'condition_value', type: 'number', def: 0, validate: nonnegative },
    { key: 'usage_limit', type: 'number', validate: (v) => v != null && (!Number.isInteger(v) || v < 1) ? 'Nhập số nguyên từ 1 trở lên' : null },
  ];
  const renderField = (key) => {
    const f = baseFields.find((f) => f.key === key);
    return field(f, values[key], { editing, values });
  };
  const radios = (name, options, value) => `<div class="coupon-radios">${options.map(([key, label]) => `<label><input type="radio" name="${name}" value="${key}" ${key === value ? 'checked' : ''}> ${label}</label>`).join('')}</div>`;
  const numeric = (name, label, value, extra = '') => `<div class="ad-field full" data-field="${name}"><label for="coupon-${name}">${label}</label><input id="coupon-${name}" name="${name}" type="number" min="0" step="1" value="${esc(value ?? '')}" ${extra}><div class="err"></div></div>`;
  const card = (title, body) => `<section class="ad-card coupon-card"><h2>${title}</h2>${body}</section>`;
  el.innerHTML = `<div class="ad-head"><div><a class="ad-back" href="#/coupons">← Khuyến mãi</a><h1>${editing ? esc(row.code) : 'Tạo mã khuyến mãi'}</h1></div>${editing && canEdit ? `<div class="ad-head-actions"><button type="button" class="btn btn-light" id="coupon-toggle">${row.active ? 'Tạm dừng khuyến mãi' : 'Tiếp tục khuyến mãi'}</button><a class="btn btn-light" href="#/coupons/new?from=${encodeURIComponent(id)}">Sao chép khuyến mãi</a></div>` : ''}</div>
    <form id="frm" class="coupon-form-editor" novalidate><div class="coupon-layout"><div class="coupon-main">
      ${card('Mã khuyến mãi', `<div class="ad-grid">${renderField('code')}</div>${!editing ? '<button type="button" class="btn btn-light btn-sm" id="coupon-generate">Sinh mã ngẫu nhiên</button>' : ''}<p class="muted">Khách hàng nhập mã này ở giỏ hàng hoặc màn hình thanh toán.</p><label class="ad-check"><input type="checkbox" name="combine_discounts" ${values.combine_discounts !== false ? 'checked' : ''}> Áp dụng cùng với chương trình khuyến mãi</label>`)}
      ${card('Loại khuyến mãi', radios('type', [['percent', 'Theo phần trăm'], ['fixed', 'Theo số tiền'], ['ship', 'Miễn phí vận chuyển']], values.type))}
      ${card('Giá trị & phạm vi áp dụng', `<div class="ad-grid">${renderField('value')}${renderField('max')}</div><h3>Áp dụng cho</h3>${radios('scope', [['all', 'Tất cả sản phẩm'], ['categories', 'Danh mục sản phẩm'], ['products', 'Sản phẩm']], values.scope)}<div id="coupon-categories">${(AD.cache.categories || []).map((c) => `<label class="ad-check"><input type="checkbox" data-coupon-category="${esc(c.id)}" ${(values.category_ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div><div id="coupon-products"><div class="ad-field full"><label for="coupon-product-search">Tìm sản phẩm theo tên, SKU, loại hoặc nhà sản xuất</label><input id="coupon-product-search" type="search" placeholder="Nhập từ cần tìm"></div><div id="coupon-picked-products"></div><div class="category-picker-actions"><button type="button" class="btn btn-light btn-sm" id="coupon-pick-all">Chọn tất cả kết quả</button><span id="coupon-match-count"></span></div><div id="coupon-product-results"></div><button type="button" class="btn btn-light btn-sm" id="coupon-more" hidden>Hiển thị thêm</button></div>`)}
      ${card('Điều kiện áp dụng', `${radios('condition_type', [['none', 'Không có'], ['order_min', 'Tổng giá trị đơn hàng tối thiểu'], ['eligible_min', 'Tổng giá trị sản phẩm được khuyến mãi tối thiểu'], ['eligible_qty', 'Tổng số lượng sản phẩm được khuyến mãi tối thiểu']], values.condition_type)}<div id="coupon-order-min">${numeric('min', 'Giá trị đơn hàng tối thiểu (₫)', values.min)}</div><div id="coupon-condition-value">${numeric('condition_value', 'Giá trị / số lượng tối thiểu', values.condition_value)}</div>`)}
      ${card('Nhóm khách hàng', `${radios('customer_scope', [['all', 'Tất cả'], ['saved', 'Nhóm khách hàng đã lưu']], values.customer_groups?.length ? 'saved' : 'all')}<div id="coupon-customer-groups"><label class="ad-check"><input type="checkbox" value="vip" data-customer-group ${(values.customer_groups || []).includes('vip') ? 'checked' : ''}> Khách hàng thân thiết (VIP)</label><label class="ad-check"><input type="checkbox" value="marketing" data-customer-group ${(values.customer_groups || []).includes('marketing') ? 'checked' : ''}> Khách đồng ý nhận quảng cáo</label><div id="coupon-saved-tags"></div></div>`)}
      ${card('Giới hạn sử dụng', `<label class="ad-check"><input type="checkbox" id="coupon-limit-toggle" ${values.usage_limit != null ? 'checked' : ''}> Giới hạn số lần mã giảm giá được áp dụng</label><div id="coupon-usage-limit">${numeric('usage_limit', 'Số lượt sử dụng tối đa', values.usage_limit)}</div><label class="ad-check"><input type="checkbox" name="once_per_customer" ${values.once_per_customer ? 'checked' : ''}> Mỗi khách hàng chỉ được sử dụng mã này 1 lần</label>`)}
      ${card('Thời gian', `<div class="ad-grid">${renderField('starts_at')}</div><label class="ad-check"><input type="checkbox" id="coupon-end-toggle" ${values.ends_at ? 'checked' : ''}> Có thời gian kết thúc</label><div class="ad-grid" id="coupon-end">${renderField('ends_at')}</div>`)}
      ${card('Hiển thị & mô tả', `<div class="ad-grid">${renderField('description')}${renderField('active')}${renderField('is_public')}</div>`)}
    </div><aside class="ad-card coupon-overview"><h2>Tổng quan khuyến mãi</h2><div id="coupon-overview" aria-live="polite"></div><hr><h3>Hiệu suất</h3><p>${Number(row.used_count || 0)} lượt sử dụng</p></aside></div>
    <div class="ad-form-foot">${editing && canEdit ? '<button type="button" class="btn btn-light txt-danger" id="coupon-delete">Xóa khuyến mãi</button>' : ''}<a class="btn btn-light" href="#/coupons">Hủy</a>${canEdit ? '<button type="submit" class="btn btn-primary" id="save">Lưu</button>' : ''}</div></form>`;
  const form = el.querySelector('#frm');
  el.querySelector('#coupon-toggle')?.addEventListener('click', async (event) => {
    if (await run(event.currentTarget, () => AD.db.update('coupons', row.code, { active: !row.active }), 'Đã cập nhật trạng thái')) AD.route();
  });
  const selected = new Set((values.product_ids || []).map(String));
  const products = [];
  if (form.elements.code) form.elements.code.addEventListener('input', () => { form.elements.code.value = form.elements.code.value.toUpperCase().replace(/\s/g, ''); });
  let shown = 20;
  const saveButton = form.querySelector('#save');
  if (saveButton) saveButton.disabled = true;
  for (let offset = 0; ; offset += 1000) {
    const { rows, count } = await AD.db.list('products', { order: 'name.asc,id.asc', limit: 1000, offset });
    products.push(...rows);
    if (rows.length < 1000 || products.length >= count) break;
  }
  const tags = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { rows, count } = await AD.db.list('crm_customers', { limit: 1000, offset });
    rows.forEach((c) => (c.tags || []).forEach((tag) => { if (tag !== 'VIP') tags.add(tag); }));
    if (rows.length < 1000 || offset + rows.length >= count) break;
  }
  (values.customer_groups || []).filter((g) => g.startsWith('tag:')).forEach((g) => tags.add(g.slice(4)));
  form.querySelector('#coupon-saved-tags').innerHTML = [...tags].map((tag) => `<label class="ad-check"><input type="checkbox" data-customer-group value="${esc('tag:' + tag)}" ${(values.customer_groups || []).includes('tag:' + tag) ? 'checked' : ''}> ${esc(tag)}</label>`).join('');
  const matches = () => {
    const q = DT.u.norm(form.querySelector('#coupon-product-search').value);
    return products.filter((p) => {
      const cat = AD.cache.categories.find((c) => c.id === p.cat);
      const type = cat?.subs?.find((s) => s.id === p.sub)?.name || p.sub;
      const brand = AD.cache.brands.find((b) => b.id === p.brand)?.name || p.brand;
      return DT.u.norm(`${p.name} ${p.sku} ${type} ${brand}`).includes(q);
    });
  };
  function renderProducts() {
    const results = matches();
    form.querySelector('#coupon-match-count').textContent = `${results.length} kết quả · ${selected.size} đã chọn`;
    form.querySelector('#coupon-picked-products').innerHTML = products.filter((p) => selected.has(String(p.id))).map((p) => `<button type="button" class="btn btn-light btn-sm" data-unpick="${p.id}">${esc(p.name)} ×</button>`).join('');
    form.querySelector('#coupon-product-results').innerHTML = results.slice(0, shown).map((p) => `<label class="coupon-product-result"><input type="checkbox" data-pick="${p.id}" ${selected.has(String(p.id)) ? 'checked' : ''}>${AD.ui.thumb(p)}<span>${esc(p.name)}<small>${esc(p.sku)}</small></span></label>`).join('') || '<p>Không có sản phẩm phù hợp.</p>';
    form.querySelector('#coupon-more').hidden = results.length <= shown;
  }
  function update() {
    const f = form.elements;
    const toggle = (id, on) => { form.querySelector(id).hidden = !on; };
    toggle('#coupon-categories', f.scope.value === 'categories'); toggle('#coupon-products', f.scope.value === 'products');
    toggle('#coupon-order-min', f.condition_type.value === 'order_min');
    toggle('#coupon-condition-value', ['eligible_min', 'eligible_qty'].includes(f.condition_type.value));
    toggle('#coupon-customer-groups', f.customer_scope.value === 'saved');
    toggle('#coupon-usage-limit', form.querySelector('#coupon-limit-toggle').checked);
    toggle('#coupon-end', form.querySelector('#coupon-end-toggle').checked);
    form.querySelector('[data-field=value]').hidden = f.type.value === 'ship';
    form.querySelector('[data-field=max]').hidden = f.type.value !== 'percent';
    const now = new Date();
    const status = !f.active.checked ? 'Ngừng áp dụng'
      : form.querySelector('#coupon-end-toggle').checked && f.ends_at.value && new Date(f.ends_at.value) <= now ? 'Đã kết thúc'
      : f.starts_at.value && new Date(f.starts_at.value) > now ? 'Sắp áp dụng' : 'Đang áp dụng';
    const condition = f.condition_type.value === 'order_min' ? `Đơn hàng tối thiểu ${money(f.min.value)}`
      : f.condition_type.value === 'eligible_min' ? `Hàng được giảm tối thiểu ${money(f.condition_value.value)}`
      : f.condition_type.value === 'eligible_qty' ? `Ít nhất ${Number(f.condition_value.value)} sản phẩm đủ điều kiện` : 'Không có điều kiện tối thiểu';
    form.querySelector('#coupon-overview').innerHTML = `<b>${esc(f.code.value)}</b><ul>
      <li>${status}</li>
      <li>${f.type.value === 'ship' ? 'Miễn phí vận chuyển' : `Giảm ${f.type.value === 'percent' ? esc(f.value.value) + '%' : money(f.value.value)}`}</li>
      <li>${f.scope.value === 'all' ? 'Tất cả sản phẩm' : f.scope.value === 'products' ? `${selected.size} sản phẩm` : `${form.querySelectorAll('[data-coupon-category]:checked').length} danh mục`}</li>
      <li>${condition}</li>
      <li>${f.customer_scope.value === 'all' ? 'Tất cả khách hàng' : `${form.querySelectorAll('[data-customer-group]:checked').length} nhóm khách hàng đã chọn`}</li>
      ${f.max.value && f.type.value === 'percent' ? `<li>Giảm tối đa ${money(f.max.value)}</li>` : ''}
      ${form.querySelector('#coupon-limit-toggle').checked ? `<li>Tối đa ${Number(f.usage_limit.value || 0)} lượt sử dụng</li>` : ''}
      ${f.once_per_customer.checked ? '<li>Mỗi số điện thoại được dùng một lần</li>' : ''}
      ${f.starts_at.value ? `<li>Từ ${esc(new Date(f.starts_at.value).toLocaleString('vi-VN'))}</li>` : ''}
      ${form.querySelector('#coupon-end-toggle').checked && f.ends_at.value ? `<li>Đến ${esc(new Date(f.ends_at.value).toLocaleString('vi-VN'))}</li>` : ''}</ul>`;
  }
  form.addEventListener('input', (event) => { if (event.target.id === 'coupon-product-search') { shown = 20; renderProducts(); } update(); });
  form.addEventListener('change', (event) => { if (event.target.dataset.pick) { event.target.checked ? selected.add(event.target.dataset.pick) : selected.delete(event.target.dataset.pick); renderProducts(); } update(); });
  form.addEventListener('click', (event) => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.id === 'coupon-generate') form.elements.code.value = randomCode();
    if (b.id === 'coupon-pick-all') { matches().forEach((p) => selected.add(String(p.id))); renderProducts(); }
    if (b.id === 'coupon-more') { shown += 20; renderProducts(); }
    if (b.dataset.unpick) { selected.delete(b.dataset.unpick); renderProducts(); }
    update();
  });
  form.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.id === 'coupon-product-search') event.preventDefault(); });
  form.onsubmit = async (event) => {
    event.preventDefault(); if (!canEdit) return;
    const f = form.elements;
    if (!form.querySelector('#coupon-end-toggle').checked) f.ends_at.value = '';
    if (!form.querySelector('#coupon-limit-toggle').checked) f.usage_limit.value = '';
    if (f.type.value === 'ship') f.value.value = '0';
    if (f.type.value !== 'percent') f.max.value = '';
    if (f.condition_type.value !== 'order_min') f.min.value = '0';
    if (!['eligible_min', 'eligible_qty'].includes(f.condition_type.value)) f.condition_value.value = '0';
    const data = read(form, fields, { editing, values });
    if (!data) { AD.ui.toast('Vui lòng kiểm tra các trường báo lỗi', 'error'); return; }
    data.code = editing ? row.code : f.code.value.trim().toUpperCase();
    data.type = f.type.value; data.scope = f.scope.value;
    if (['value', 'max', 'min', 'condition_value'].some((key) => data[key] != null && (!Number.isInteger(data[key]) || data[key] < 0))) { AD.ui.toast('Giá trị khuyến mãi phải là số nguyên từ 0 trở lên', 'error'); return; }
    if (data.type === 'percent' && data.value > 100) { AD.ui.toast('Phần trăm giảm phải từ 0 đến 100', 'error'); return; }
    if (!editing) data.used_count = 0;
    data.product_ids = data.scope === 'products' ? [...selected].map(Number) : [];
    data.category_ids = data.scope === 'categories' ? [...form.querySelectorAll('[data-coupon-category]:checked')].map((input) => input.dataset.couponCategory) : [];
    data.condition_type = f.condition_type.value;
    if (data.condition_type === 'eligible_qty' && !Number.isInteger(data.condition_value)) { AD.ui.toast('Số lượng tối thiểu phải là số nguyên', 'error'); return; }
    if (data.condition_type !== 'order_min') data.min = 0;
    if (!['eligible_min', 'eligible_qty'].includes(data.condition_type)) data.condition_value = 0;
    data.customer_groups = f.customer_scope.value === 'saved' ? [...form.querySelectorAll('[data-customer-group]:checked')].map((input) => input.value) : [];
    data.combine_discounts = f.combine_discounts.checked; data.once_per_customer = f.once_per_customer.checked;
    if ((data.scope === 'products' && !data.product_ids.length) || (data.scope === 'categories' && !data.category_ids.length) || (f.customer_scope.value === 'saved' && !data.customer_groups.length)) { AD.ui.toast('Vui lòng chọn phạm vi sản phẩm và nhóm khách hàng áp dụng', 'error'); return; }
    if (form.querySelector('#coupon-limit-toggle').checked && !data.usage_limit) { AD.ui.toast('Vui lòng nhập số lượt sử dụng tối đa', 'error'); return; }
    if (form.querySelector('#coupon-end-toggle').checked && !data.ends_at) { AD.ui.toast('Vui lòng chọn thời gian kết thúc', 'error'); return; }
    if (data.type !== 'percent') data.max = null;
    const saved = await run(saveButton, () => editing ? AD.db.update('coupons', row.code, data) : AD.db.insert('coupons', data), 'Đã lưu khuyến mãi');
    if (saved) { if (editing) AD.route(); else location.hash = `#/coupons/${encodeURIComponent(saved.code)}`; }
  };
  form.querySelector('#coupon-delete')?.addEventListener('click', async (event) => {
    if (await confirm('Xóa mã khuyến mãi này?', { danger: true, ok: 'Xóa' })) {
      if (await run(event.currentTarget, () => AD.db.remove('coupons', row.code), 'Đã xóa')) location.hash = '#/coupons';
    }
  });
  renderProducts(); update();
  if (saveButton) saveButton.disabled = false;
  if (!canEdit) form.querySelectorAll('input,button,select').forEach((input) => { input.disabled = true; });
};
