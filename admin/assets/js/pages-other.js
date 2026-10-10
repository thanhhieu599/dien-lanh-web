// Đánh giá, Khách hàng, Cài đặt cửa hàng
window.AD = window.AD || {};
AD.pages = AD.pages || {};

(() => {
  const { esc, money, dt, badge, ic, table, pager, run, confirm } = AD.ui;

  // ======================================================================= Đánh giá
  AD.pages.reviews = async (params, el) => {
    const size = 25; const page = Number(params.page) || 1;
    const status = params.status ?? 'pending';
    el.innerHTML = `<div class="ad-head"><div><h1>Đánh giá sản phẩm</h1><small class="muted">Đánh giá khách gửi chỉ hiện trên website sau khi được duyệt</small></div></div>
      <div class="ad-tabs">${[['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Từ chối'], ['', 'Tất cả']].map(([k, l]) => `<a href="#/reviews?status=${k}" class="${status === k ? 'active' : ''}">${l}</a>`).join('')}</div>
      <div id="list"><div class="ad-loading">Đang tải…</div></div>`;
    const { rows, count } = await AD.db.list('reviews', { filters: [['status', 'eq', status || undefined]], order: 'created_at.desc', limit: size, offset: (page - 1) * size });
    const pname = (id) => DT.api.productById(id)?.name || (AD.cache.productNames || {})[id] || `#${id}`;
    el.querySelector('#list').innerHTML = table([
      { label: 'Khách', render: (r) => `<b>${esc(r.name)}</b><small>${dt(r.created_at)}${r.verified ? ' • đã mua hàng' : ''}</small>` },
      { label: 'Sản phẩm', render: (r) => `<a href="../frontend/san-pham.html?id=${r.product_id}" target="_blank" rel="noopener">${esc(pname(r.product_id))}</a>` },
      { label: 'Đánh giá', render: (r) => `${DT.u.stars(r.rating)}<div class="clamp">${esc(r.text)}</div>` },
      { label: 'Trạng thái', render: (r) => badge(AD.REVIEW_STATUS, r.status) },
      { label: '', cls: 'actions', render: (r) => `${r.status !== 'approved' ? `<button class="btn btn-sm btn-primary" data-rv="approved" data-id="${esc(r.id)}">Duyệt</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn btn-sm btn-light" data-rv="rejected" data-id="${esc(r.id)}">Từ chối</button>` : ''}
          <button class="btn btn-sm btn-light txt-danger" data-rv="delete" data-id="${esc(r.id)}" aria-label="Xóa">${ic('trash')}</button>` },
    ], rows, { empty: status === 'pending' ? 'Không có đánh giá chờ duyệt' : 'Chưa có đánh giá' }) + pager(page, count, size);
    AD.bindPager(el, 'reviews', { ...params, status });
    el.querySelectorAll('[data-rv]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.dataset.id; const act = b.dataset.rv;
      if (act === 'delete') {
        if (!(await confirm('Xóa đánh giá này?', { ok: 'Xóa', danger: true }))) return;
        if (await run(b, () => AD.db.remove('reviews', id), 'Đã xóa')) { AD.refreshBadges(); AD.route(); }
        return;
      }
      if (await run(b, () => AD.db.update('reviews', id, { status: act }), act === 'approved' ? 'Đã duyệt' : 'Đã từ chối')) { AD.refreshBadges(); AD.route(); }
    }));
  };

  // ======================================================================= Khách hàng
  const ROLE = { customer: ['Khách hàng', 'muted'], staff: ['Nhân viên', 'info'], admin: ['Quản trị', 'ok'] };
  AD.pages.customers = async (params, el) => {
    const size = 25; const page = Number(params.page) || 1;
    const search = params.q ? { q: params.q, cols: ['name', 'phone', 'email'] } : null;
    el.innerHTML = `<div class="ad-head"><div><h1>Khách hàng</h1><small class="muted">Tài khoản đăng ký trên website. Đơn của khách vãng lai xem ở mục Đơn hàng.</small></div>
        <div class="ad-head-actions"><button class="btn btn-light" id="csv">${ic('file')} Xuất CSV</button></div></div>
      <form class="ad-toolbar" id="tb"><input name="q" type="search" placeholder="Tên, SĐT, email…" value="${esc(params.q || '')}">
        <select name="role"><option value="">Vai trò: tất cả</option>${Object.entries(ROLE).map(([k, [l]]) => `<option value="${k}" ${params.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn btn-light">${ic('search')} Lọc</button></form>
      <div id="list"><div class="ad-loading">Đang tải…</div></div>`;
    AD.bindToolbar(el.querySelector('#tb'), 'customers', params);
    const filters = [['role', 'eq', params.role]];
    const { rows, count } = await AD.db.list('profiles', { filters, search, order: 'created_at.desc', limit: size, offset: (page - 1) * size });
    const isAdmin = AD.me.role === 'admin';
    el.querySelector('#list').innerHTML = table([
      { label: 'Khách hàng', render: (r) => `<b>${esc(r.name || '(chưa đặt tên)')}</b><small>Đăng ký ${AD.ui.d(r.created_at)}</small>` },
      { label: 'Liên hệ', render: (r) => `${esc(r.phone || '')}<small>${esc(r.email || '')}</small>` },
      { label: 'Địa chỉ', render: (r) => { const a = (r.addresses || []).find((x) => x.default) || (r.addresses || [])[0]; return a ? esc([a.address, a.district, a.province].filter(Boolean).join(', ')) : '-'; } },
      { label: 'Vai trò', render: (r) => (isAdmin && AD.db.mode === 'supabase' && r.id !== AD.me.id
        ? `<select data-role="${esc(r.id)}">${Object.entries(ROLE).map(([k, [l]]) => `<option value="${k}" ${r.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`
        : badge(ROLE, r.role)) },
      { label: '', cls: 'actions', render: (r) => `<button class="btn btn-sm btn-light" data-orders="${esc(r.id)}" data-name="${esc(r.name || '')}">Đơn hàng</button>` },
    ], rows, { empty: 'Chưa có khách hàng đăng ký' }) + pager(page, count, size);
    AD.bindPager(el, 'customers', params);
    el.querySelectorAll('[data-role]').forEach((s) => s.addEventListener('change', async () => {
      const prev = rows.find((r) => r.id === s.dataset.role).role;
      const label = ROLE[s.value][0];
      if (!(await confirm(`Đổi vai trò tài khoản này thành <b>${label}</b>?${s.value !== 'customer' ? '<br><small>Nhân viên / quản trị được truy cập trang quản trị và dữ liệu khách hàng.</small>' : ''}`))) { s.value = prev; return; }
      if (!(await run(s, () => AD.db.update('profiles', s.dataset.role, { role: s.value }), 'Đã cập nhật vai trò'))) s.value = prev;
    }));
    el.querySelectorAll('[data-orders]').forEach((b) => b.addEventListener('click', async () => {
      const uid = b.dataset.orders;
      const u = rows.find((r) => String(r.id) === uid);
      const filtersO = AD.db.mode === 'supabase' ? [['user_id', 'eq', uid]] : [['phone', 'eq', u.phone]];
      const { rows: os } = await AD.db.list('orders', { select: 'id,code,created_at,status,total', filters: filtersO, order: 'created_at.desc', limit: 100 });
      AD.ui.modal(`<h3>Đơn hàng của ${esc(b.dataset.name)}</h3>${table([
        { label: 'Mã đơn', render: (o) => `<a href="#/orders/${encodeURIComponent(o.id)}" data-close>${esc(o.code)}</a>` }, { label: 'Ngày', render: (o) => dt(o.created_at) },
        { label: 'Tổng', render: (o) => money(o.total), cls: 'num' }, { label: 'Trạng thái', render: (o) => badge(AD.ORDER_STATUS, o.status) }], os, { empty: 'Chưa có đơn hàng' })}
        <p class="muted">Tổng chi tiêu: <b>${money(os.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0))}</b></p>`, { wide: true });
    }));
    el.querySelector('#csv').onclick = async () => {
      const all = (await AD.db.list('profiles', { filters, search, order: 'created_at.desc', limit: 5000 })).rows;
      AD.ui.csv('khach-hang.csv', [{ label: 'Họ tên', key: 'name' }, { label: 'SĐT', key: 'phone' }, { label: 'Email', key: 'email' }, { label: 'Vai trò', key: 'role' }, { label: 'Ngày đăng ký', value: (r) => AD.ui.d(r.created_at) }], all);
    };
  };

  // ======================================================================= Cài đặt cửa hàng
  const SETTINGS_FIELDS = [
    { key: '_a', type: 'custom', render: () => '<h4 class="ad-sec">Thông tin doanh nghiệp</h4>', read: () => undefined, col: 'full' },
    { key: 'name', label: 'Tên cửa hàng', required: true, col: 'third' },
    { key: 'slogan', label: 'Slogan', col: 'third' },
    { key: 'company', label: 'Tên công ty (pháp lý)', col: 'third' },
    { key: 'taxCode', label: 'Mã số thuế', col: 'third' },
    { key: 'address', label: 'Địa chỉ', col: 'third' },
    { key: 'workingHours', label: 'Giờ làm việc', col: 'third' },
    { key: '_b', type: 'custom', render: () => '<h4 class="ad-sec">Liên hệ</h4>', read: () => undefined, col: 'full' },
    { key: 'hotline', label: 'Hotline', required: true, col: 'third' },
    { key: 'hotlineB2B', label: 'Hotline doanh nghiệp', col: 'third' },
    { key: 'email', label: 'Email', col: 'third' },
    { key: 'zalo', label: 'Link Zalo', col: 'third' },
    { key: 'facebook', label: 'Link Facebook', col: 'third' },
    { key: 'youtube', label: 'Link YouTube', col: 'third' },
    { key: '_c', type: 'custom', render: () => '<h4 class="ad-sec">Phí & chính sách giá</h4><p class="muted">Áp dụng ngay cho tính tiền phía máy chủ khi khách đặt hàng.</p>', read: () => undefined, col: 'full' },
    { key: 'freeShipThreshold', label: 'Miễn phí ship cho đơn từ (₫)', type: 'money', required: true, col: 'third' },
    { key: 'shippingFee', label: 'Phí vận chuyển (₫)', type: 'money', required: true, col: 'third' },
    { key: 'installFee', label: 'Phí lắp đặt máy lạnh / bộ (₫)', type: 'money', required: true, col: 'third' },
  ];

  AD.pages.settings = async (params, el) => {
    const row = await AD.db.get('settings', 'store');
    const v = row?.value || {};
    const canEdit = AD.me.role === 'admin';
    el.innerHTML = `<div class="ad-head"><div><h1>Cài đặt cửa hàng</h1><small class="muted">Thông tin hiển thị trên website và phí dùng khi tính tiền đơn hàng</small></div></div>
      <form class="ad-card ad-form" id="frm" novalidate><div class="ad-grid">${SETTINGS_FIELDS.map((f) => AD.ui.field(f, v[f.key], {})).join('')}</div>
      ${canEdit ? `<div class="ad-form-foot"><button class="btn btn-primary">${ic('check')} Lưu cài đặt</button></div>` : '<p class="muted">Chỉ quản trị viên được sửa cài đặt.</p>'}</form>
      <div class="ad-links">
        <a class="ad-card ad-link" href="#/stores">${ic('pin')}<b>Hệ thống cửa hàng</b><small>Địa chỉ showroom, giờ mở cửa</small></a>
        <a class="ad-card ad-link" href="#/services">${ic('tool')}<b>Dịch vụ</b><small>Bảng giá vệ sinh, lắp đặt, sửa chữa</small></a>
        <a class="ad-card ad-link" href="#/policies">${ic('shield')}<b>Chính sách</b><small>Bảo hành, đổi trả, vận chuyển…</small></a>
        <a class="ad-card ad-link" href="#/banners">${ic('zap')}<b>Banner trang chủ</b><small>Slider khuyến mãi</small></a>
      </div>`;
    el.querySelector('#frm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = AD.ui.read(e.target, SETTINGS_FIELDS, {});
      if (!data) return;
      Object.keys(data).forEach((k) => k.startsWith('_') && delete data[k]);
      const value = { ...v, ...data };
      await run(e.target.querySelector('button'), () => (row ? AD.db.update('settings', 'store', { value }) : AD.db.insert('settings', { key: 'store', value })), 'Đã lưu cài đặt');
    });
  };
})();
