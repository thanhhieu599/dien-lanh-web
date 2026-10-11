// Trang danh sách + form dùng chung cho các mục trong AD.resources
window.AD = window.AD || {};
AD.pages = AD.pages || {};

AD.pages.crudList = async (key, params, el) => {
  const R = AD.resources[key];
  const { esc, ic, table, pager } = AD.ui;
  const size = R.pageSize || 25;
  const page = Number(params.page) || 1;
  const filters = (R.filters || []).map((f) => [f.key, f.op || 'eq', params[f.key] || undefined]);
  const opts = { filters, order: params.sort || R.order, limit: size, offset: (page - 1) * size, search: params.q ? { q: params.q, cols: R.search || [] } : null };

  el.innerHTML = `<div class="ad-head"><div><h1>${esc(R.title)}</h1></div><div class="ad-head-actions">
      ${R.csv ? `<button class="btn btn-light" id="csv">${ic('file')} Xuất CSV</button>` : ''}
      ${AD.can(R) ? `<a class="btn btn-primary" href="#/${key}/new">${ic('plus')} Thêm mới</a>` : ''}</div></div>
    <form class="ad-toolbar" id="tb">
      ${R.search ? `<input name="q" type="search" placeholder="Tìm kiếm…" value="${esc(params.q || '')}">` : ''}
      ${(R.filters || []).map((f) => `<select name="${f.key}"><option value="">${esc(f.label)}: tất cả</option>${(typeof f.options === 'function' ? f.options() : f.options).map(([v, l]) => `<option value="${esc(v)}" ${params[f.key] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`).join('')}
      <button class="btn btn-light">${ic('search')} Lọc</button>
    </form>
    <div id="list"><div class="ad-loading">Đang tải…</div></div>`;

  AD.bindToolbar(el.querySelector('#tb'), key, params);
  const { rows, count } = await AD.db.list(R.table, opts);
  const pk = R.pk || AD.PK[R.table];
  el.querySelector('#list').innerHTML = table(R.columns, rows, { rowHref: (r) => `#/${key}/${encodeURIComponent(r[pk])}` }) + pager(page, count, size);
  AD.bindPager(el, key, params);
  el.querySelector('#csv')?.addEventListener('click', async () => {
    const all = await AD.db.list(R.table, { ...opts, limit: 5000, offset: 0 });
    AD.ui.csv(`${key}-${new Date().toISOString().slice(0, 10)}.csv`, R.csv.map((k) => ({ key: k, label: k })), all.rows);
  });
};

AD.pages.crudForm = async (key, id, params, el) => {
  const R = AD.resources[key];
  const { esc, ic, field, read, run, confirm } = AD.ui;
  const editing = id !== 'new';
  const pk = R.pk || AD.PK[R.table];
  let row;
  if (editing) {
    row = await AD.db.get(R.table, id);
    if (!row) { el.innerHTML = `<div class="ad-empty"><p>Không tìm thấy bản ghi.</p><a class="btn btn-light" href="#/${key}">Quay lại</a></div>`; return; }
  } else if (params.from) {
    const src = await AD.db.get(R.table, params.from);
    row = { ...src, [pk]: undefined, name: src?.name ? `${src.name} (bản sao)` : src?.name, sku: src?.sku ? `${src.sku}-COPY` : undefined, slug: undefined, created_at: undefined, updated_at: undefined, sold: 0 };
  } else row = R.defaults ? R.defaults() : {};

  const ctx = { editing, values: row };
  const canEdit = AD.can(R);
  el.innerHTML = `<div class="ad-head"><div><a class="ad-back" href="#/${key}">${ic('left')} ${esc(R.title)}</a>
      <h1>${editing ? esc(row.name || row.title || row[pk]) : 'Thêm mới'}</h1>
      ${editing && row.updated_at ? `<small class="muted">Cập nhật: ${AD.ui.dt(row.updated_at)}</small>` : ''}</div>
    <div class="ad-head-actions">
      ${editing && R.preview ? `<a class="btn btn-light" target="_blank" rel="noopener" href="${R.preview(row)}">${ic('eye')} Xem trên web</a>` : ''}
      ${editing && R.duplicate && canEdit ? `<a class="btn btn-light" href="#/${key}/new?from=${encodeURIComponent(id)}">${ic('refresh')} Nhân bản</a>` : ''}
      ${editing && canEdit ? `<button class="btn btn-light txt-danger" id="del">${ic('trash')} Xóa</button>` : ''}
    </div></div>
    <form class="ad-card ad-form" id="frm" novalidate>
      <div class="ad-grid">${R.fields.map((f) => field(f, row[f.key], ctx)).join('')}</div>
      ${canEdit ? `<div class="ad-form-foot"><a class="btn btn-light" href="#/${key}">Hủy</a><button class="btn btn-primary" id="save">${ic('check')} Lưu</button></div>` : '<p class="muted">Bạn chỉ có quyền xem mục này.</p>'}
    </form>`;

  const form = el.querySelector('#frm');
  // Trường phụ thuộc danh mục (loại con, thuộc tính bộ lọc) vẽ lại khi đổi danh mục
  form.addEventListener('change', (e) => {
    const f = R.fields.find((x) => x.key === e.target.name && x.rerender);
    if (!f) return;
    ctx.values = { ...ctx.values, [f.key]: e.target.value };
    R.fields.filter((x) => typeof x.options === 'function' || x.type === 'custom').forEach((x) => {
      if (x.key === f.key || x.key.startsWith('_') || x.key === 'art') return;
      const node = form.querySelector(`[data-field="${x.key}"]`);
      if (node) node.outerHTML = field(x, x.key === 'attrs' ? {} : ctx.values[x.key], ctx);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = read(form, R.fields, ctx);
    if (!data) { AD.ui.toast('Vui lòng kiểm tra các trường báo lỗi', 'error'); form.querySelector('.invalid')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    Object.keys(data).forEach((k) => k.startsWith('_') && delete data[k]);
    R.beforeSave?.(data, editing);
    const insert = async () => {
      try { return await AD.db.insert(R.table, { ...data }); } catch (err) {
        const retry = R.onDuplicate?.(data, err.raw || '');
        if (retry) return AD.db.insert(R.table, retry);
        throw err;
      }
    };
    const saved = await run(e.submitter || form.querySelector('#save'), () => (editing ? AD.db.update(R.table, id, data) : insert()),
      AD.db.mode === 'supabase' ? 'Đã lưu. Website cập nhật sau tối đa vài phút.' : 'Đã lưu');
    if (!saved) return;
    await R.afterSave?.(saved);
    if (!editing && saved) location.hash = `#/${key}/${encodeURIComponent(saved[pk])}`;
    else AD.route();
  });

  el.querySelector('#del')?.addEventListener('click', async (e) => {
    const hint = 'products' === key ? '<br><small>Gợi ý: bỏ chọn "Đang bán" để ẩn sản phẩm mà vẫn giữ lịch sử đơn hàng.</small>' : '';
    if (!(await confirm(`Xóa vĩnh viễn <b>${esc(row.name || row.title || row[pk])}</b>?${hint}`, { ok: 'Xóa', danger: true }))) return;
    if (!(await run(e.target.closest('button'), () => AD.db.remove(R.table, id), 'Đã xóa'))) return;
    await R.afterSave?.();
    location.hash = `#/${key}`;
  });
};
