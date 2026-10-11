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
    { key: 'workingHours', label: 'Giờ làm việc (hiển thị)', col: 'third' },
    { key: 'openTime', label: 'Giờ mở cửa (vd 07:30)', col: 'third', help: 'Khung chat & form hẹn giờ gọi lại theo giờ này' },
    { key: 'closeTime', label: 'Giờ đóng cửa (vd 21:30)', col: 'third', help: 'Ngoài giờ: hẹn "gọi lại trước 9h sáng mai"' },
    { key: '_b', type: 'custom', render: () => '<h4 class="ad-sec">Liên hệ</h4>', read: () => undefined, col: 'full' },
    { key: 'hotline', label: 'Hotline', required: true, col: 'third' },
    { key: 'hotlineB2B', label: 'Hotline doanh nghiệp', col: 'third' },
    { key: 'email', label: 'Email', col: 'third' },
    { key: 'zalo', label: 'Link Zalo (OA hoặc cá nhân)', col: 'third' },
    { key: 'messenger', label: 'Link Messenger (vd https://m.me/ten-fanpage)', col: 'third' },
    { key: 'facebook', label: 'Link Facebook', col: 'third' },
    { key: 'youtube', label: 'Link YouTube', col: 'third' },
    { key: 'googleVerification', label: 'Mã xác minh Google Search Console', col: 'third', help: 'Chỉ dán phần content của thẻ meta google-site-verification' },
    { key: '_c', type: 'custom', render: () => '<h4 class="ad-sec">Phí & chính sách giá</h4><p class="muted">Áp dụng ngay cho tính tiền phía máy chủ khi khách đặt hàng.</p>', read: () => undefined, col: 'full' },
    { key: 'freeShipThreshold', label: 'Miễn phí ship cho đơn từ (₫)', type: 'money', required: true, col: 'third' },
    { key: 'shippingFee', label: 'Phí vận chuyển (₫)', type: 'money', required: true, col: 'third' },
    { key: 'installFee', label: 'Phí lắp đặt máy lạnh / bộ (₫)', type: 'money', required: true, col: 'third' },
    { key: '_d', type: 'custom', render: () => '<h4 class="ad-sec">Tài khoản nhận chuyển khoản</h4><p class="muted">Dùng để tạo mã QR VietQR trên trang đơn hàng và email gửi khách. Mã ngân hàng (BIN): Vietcombank 970436, Techcombank 970407, MB 970422, ACB 970416, BIDV 970418, VietinBank 970415, VPBank 970432.</p>', read: () => undefined, col: 'full' },
    { key: 'bankName', label: 'Ngân hàng (hiển thị)', col: 'third' },
    { key: 'bankBin', label: 'Mã ngân hàng (BIN VietQR)', col: 'third' },
    { key: 'bankAccount', label: 'Số tài khoản', col: 'third' },
    { key: 'bankOwner', label: 'Chủ tài khoản (không dấu, như trên app ngân hàng)', col: 'full' },
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
      const badTime = ['openTime', 'closeTime'].find((k) => data[k] && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(data[k]).trim()));
      if (badTime) { AD.ui.toast('Giờ mở / đóng cửa phải có dạng HH:MM, ví dụ 07:30', 'error'); return; }
      const value = { ...v, ...data };
      await run(e.target.querySelector('button'), () => (row ? AD.db.update('settings', 'store', { value }) : AD.db.insert('settings', { key: 'store', value })), 'Đã lưu cài đặt');
    });
  };

  // ======================================================================= Ảnh trang Tầm nhìn & Sứ mệnh
  // Nén ảnh ngay trên trình duyệt (giảm dung lượng, trang tải nhanh) rồi lưu:
  //  - Supabase: file lên Storage (bucket 'media'), link vào settings 'vision'
  //  - Demo: ảnh dạng data URL trong localStorage (website demo cùng tên miền đọc được)
  const { compress, toDataUrl } = AD.media;

  AD.pages.vision = async (params, el) => {
    if (AD.me.role !== 'admin') throw new Error('Chỉ quản trị viên được sửa ảnh trang Tầm nhìn & Sứ mệnh');
    const supa = AD.db.mode === 'supabase';
    const loadImages = async () => {
      if (!supa) { try { return JSON.parse(localStorage.getItem(DT.VISION_DEMO_KEY) || '{}').images || {}; } catch { return {}; } }
      return (await AD.db.get('settings', 'vision'))?.value?.images || {};
    };
    const saveImages = async (images) => {
      if (!supa) {
        try { localStorage.setItem(DT.VISION_DEMO_KEY, JSON.stringify({ images })); } catch { throw new Error('Bộ nhớ trình duyệt đã đầy (chế độ demo). Hãy dùng ảnh nhỏ hơn hoặc xóa bớt ảnh.'); }
        return;
      }
      const row = await AD.db.get('settings', 'vision');
      const value = { ...(row?.value || {}), images };
      await (row ? AD.db.update('settings', 'vision', { value }) : AD.db.insert('settings', { key: 'vision', value }));
    };
    let images = await loadImages();

    const card = (s) => {
      const url = images[s.key];
      return `<div class="ad-card vs-card" data-key="${s.key}">
        <label class="vs-drop ${url ? 'has' : ''}" title="Bấm hoặc kéo thả ảnh vào đây">
          ${url ? `<img src="${esc(url)}" alt="${esc(s.label)}">` : `<span>${ic('plus')}<b>Chọn ảnh</b><small>hoặc kéo thả vào đây</small></span>`}
          <input type="file" accept="image/*" hidden>
        </label>
        <div class="vs-info"><b>${esc(s.label)}</b><small class="muted">${esc(s.hint)} • ${esc(s.size)}</small>
          <div class="vs-actions">
            <button type="button" class="btn btn-light btn-sm" data-pick>${ic('plus')} ${url ? 'Thay ảnh' : 'Tải ảnh lên'}</button>
            ${url ? `<button type="button" class="btn btn-light btn-sm" data-del>${ic('trash')} Xóa</button>` : ''}
          </div>
        </div>
      </div>`;
    };
    const render = () => {
      el.innerHTML = `<div class="ad-head"><div><h1>Ảnh trang Tầm nhìn & Sứ mệnh</h1><small class="muted">Tải ảnh lên là trang hiển thị ngay, không cần sửa code. Ảnh tự nén để trang tải nhanh.${supa ? '' : ' <b>Chế độ demo:</b> ảnh chỉ lưu trên trình duyệt này.'}</small></div>
        <div class="ad-head-actions"><a class="btn btn-light" href="../frontend/tam-nhin-su-menh.html" target="_blank" rel="noopener">${ic('eye')} Xem trang</a></div></div>
        <div class="vs-grid">${DT.visionSlots.map(card).join('')}</div>`;
    };
    render();

    const upload = async (key, file) => {
      const box = el.querySelector(`.vs-card[data-key="${key}"]`);
      box.classList.add('busy');
      try {
        const blob = await compress(file, supa ? 2000 : 1400, supa ? 0.85 : 0.78);
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
        const old = images[key];
        const url = supa ? await AD.db.upload(`vision/${key}-${Date.now()}.${ext}`, blob) : await toDataUrl(blob);
        await saveImages({ ...images, [key]: url });
        images = { ...images, [key]: url };
        if (supa) AD.db.removeFile(old);
        AD.ui.toast('Đã cập nhật ảnh. Khách thấy ảnh mới trong vài phút.');
        render();
      } catch (e) {
        if (!AD.handleError(e)) AD.ui.toast(e.message, 'error');
        box.classList.remove('busy');
      }
    };

    el.addEventListener('change', (e) => {
      const input = e.target.closest('input[type=file]');
      const file = input?.files?.[0];
      if (file) upload(input.closest('.vs-card').dataset.key, file);
    });
    el.addEventListener('click', async (e) => {
      const card = e.target.closest('.vs-card');
      if (!card) return;
      if (e.target.closest('[data-pick]')) card.querySelector('input[type=file]').click();
      if (e.target.closest('[data-del]')) {
        if (!(await confirm('Xóa ảnh này? Trang sẽ hiện lại khung chờ ảnh.', { ok: 'Xóa ảnh', danger: true }))) return;
        const key = card.dataset.key;
        const { [key]: old, ...rest } = images;
        if (await run(e.target.closest('button'), () => saveImages(rest), 'Đã xóa ảnh')) {
          images = rest;
          if (supa) AD.db.removeFile(old);
          render();
        }
      }
    });
    el.addEventListener('dragover', (e) => { const d = e.target.closest('.vs-drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
    el.addEventListener('dragleave', (e) => e.target.closest('.vs-drop')?.classList.remove('over'));
    el.addEventListener('drop', (e) => {
      const d = e.target.closest('.vs-drop');
      if (!d) return;
      e.preventDefault();
      d.classList.remove('over');
      const file = e.dataTransfer.files?.[0];
      if (file) upload(d.closest('.vs-card').dataset.key, file);
    });
  };

  // ======================================================================= Uy tín & đánh giá
  // Logo khách hàng / đối tác, giấy chứng nhận, liên kết & đánh giá Google (settings 'trust')
  AD.pages.trust = async (params, el) => {
    if (AD.me.role !== 'admin') throw new Error('Chỉ quản trị viên được sửa mục Uy tín & đánh giá');
    const supa = AD.db.mode === 'supabase';
    const empty = { logos: [], certs: [], reviews: [], google: {} };
    let data;
    if (supa) data = (await AD.db.get('settings', 'trust'))?.value;
    else { try { data = JSON.parse(localStorage.getItem(DT.TRUST_DEMO_KEY) || 'null'); } catch { data = null; } }
    data = { ...empty, ...(data || (supa ? {} : DT.trust)) };
    const g = data.google || {};
    const img = (k, v, folder) => AD.ui.imageInput(k, v, folder);
    const LISTS = {
      logos: { title: 'Logo khách hàng & đối tác', hint: 'Logo nền trong suốt hoặc nền trắng, tối thiểu 300 px chiều ngang. Chỉ đăng logo khi khách hàng / đối tác đồng ý.', add: 'Thêm logo',
        row: (x) => `<div class="tr-row">${img('image', x.image, 'trust')}<div class="tr-f"><input data-k="name" placeholder="Tên khách hàng / đối tác *" value="${esc(x.name || '')}"><input data-k="url" placeholder="Website (không bắt buộc)" value="${esc(x.url || '')}"></div>${rowBtns}</div>` },
      certs: { title: 'Giấy chứng nhận & chứng chỉ', hint: 'Giấy chứng nhận đại lý ủy quyền, ISO, chứng chỉ kỹ thuật viên… (ảnh chụp / scan rõ nét).', add: 'Thêm chứng nhận',
        row: (x) => `<div class="tr-row">${img('image', x.image, 'trust')}<div class="tr-f"><input data-k="title" placeholder="Tên chứng nhận *" value="${esc(x.title || '')}"><input data-k="issuer" placeholder="Đơn vị cấp" value="${esc(x.issuer || '')}"><input data-k="year" placeholder="Năm / hiệu lực" value="${esc(x.year || '')}"></div>${rowBtns}</div>` },
      reviews: { title: 'Đánh giá chọn lọc của khách hàng', hint: 'Chép nguyên văn đánh giá THẬT từ Google Maps (hoặc Facebook, Zalo). Không sửa nội dung, không tự tạo đánh giá.', add: 'Thêm đánh giá',
        row: (x) => `<div class="tr-row tr-review"><div class="tr-f"><input data-k="name" placeholder="Tên người đánh giá *" value="${esc(x.name || '')}">
          <select data-k="rating">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${Number(x.rating || 5) === n ? 'selected' : ''}>${'★'.repeat(n)} (${n})</option>`).join('')}</select>
          <select data-k="source">${['Google', 'Facebook', 'Zalo'].map((n) => `<option ${x.source === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <input data-k="date" type="date" value="${esc(String(x.date || '').slice(0, 10))}">
          <textarea data-k="text" rows="2" placeholder="Nội dung đánh giá *">${esc(x.text || '')}</textarea></div>${rowBtns}</div>` },
    };
    const rowBtns = `<span class="tr-btns"><button type="button" class="btn btn-light btn-sm" data-up aria-label="Lên">${ic('up')}</button><button type="button" class="btn btn-light btn-sm" data-del aria-label="Xóa">${ic('trash')}</button></span>`;
    el.innerHTML = `<div class="ad-head"><div><h1>Uy tín & đánh giá</h1><small class="muted">Hiển thị ở trang chủ, Giới thiệu, Dự án tiêu biểu, Hệ thống cửa hàng.${supa ? '' : ' <b>Chế độ demo:</b> lưu trên trình duyệt này.'}</small></div></div>
      <form id="trust-form" novalidate>
        <section class="ad-card"><h3>Google Maps / Google Business Profile</h3>
          <div class="ad-grid">
            <div class="ad-field half"><label>Link trang Google Maps của doanh nghiệp</label><input name="g_url" value="${esc(g.url || '')}" placeholder="https://maps.app.goo.gl/..."></div>
            <div class="ad-field half"><label>Place ID (để tạo link "Viết đánh giá")</label><input name="g_placeId" value="${esc(g.placeId || '')}" placeholder="ChIJ..."><small class="help">Tra Place ID tại developers.google.com/maps/documentation/places/web-service/place-id</small></div>
            <div class="ad-field third"><label>Điểm đánh giá trên Google</label><input name="g_rating" type="number" min="1" max="5" step="0.1" value="${g.rating ?? ''}" placeholder="vd 4.8"></div>
            <div class="ad-field third"><label>Số lượt đánh giá</label><input name="g_count" type="number" min="0" step="1" value="${g.count ?? ''}" placeholder="vd 126"></div>
            <div class="ad-field third"><label>Cập nhật lúc</label><input name="g_updated" type="date" value="${esc(String(g.updated || '').slice(0, 10))}"><small class="help">Nhập đúng số đang hiện trên Google Maps</small></div>
          </div>
        </section>
        ${Object.entries(LISTS).map(([k, L]) => `<section class="ad-card"><div class="ad-card-head"><h3>${L.title}</h3><button type="button" class="btn btn-light btn-sm" data-add="${k}">${ic('plus')} ${L.add}</button></div>
          <p class="muted">${L.hint}</p><div class="tr-list" data-list="${k}">${(data[k] || []).map(L.row).join('')}</div></section>`).join('')}
        <div class="ad-form-foot"><button class="btn btn-primary">${ic('check')} Lưu</button><a class="btn btn-light" href="../frontend/du-an.html" target="_blank" rel="noopener">${ic('eye')} Xem trang Dự án</a></div>
      </form>`;
    const form = el.querySelector('#trust-form');
    form.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) form.querySelector(`[data-list="${add.dataset.add}"]`).insertAdjacentHTML('beforeend', LISTS[add.dataset.add].row({}));
      const row = e.target.closest('.tr-row');
      if (row && e.target.closest('[data-del]')) row.remove();
      if (row && e.target.closest('[data-up]') && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
    });
    const collect = (k, required) => [...form.querySelectorAll(`[data-list="${k}"] .tr-row`)].map((r) => {
      const o = {};
      r.querySelectorAll('[data-k]').forEach((x) => { o[x.dataset.k] = x.value.trim(); });
      const im = r.querySelector('input[type=hidden][name=image]');
      if (im) o.image = im.value;
      if (o.rating) o.rating = Number(o.rating);
      return o;
    }).filter((o) => o[required]);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const num = (n) => (form[n].value === '' ? null : Number(form[n].value));
      const rating = num('g_rating'); const count = num('g_count');
      if (rating != null && (rating < 1 || rating > 5)) { AD.ui.toast('Điểm đánh giá phải từ 1 đến 5', 'error'); return; }
      const value = {
        google: { url: form.g_url.value.trim(), placeId: form.g_placeId.value.trim(), rating, count, updated: form.g_updated.value || null },
        logos: collect('logos', 'name'), certs: collect('certs', 'title'), reviews: collect('reviews', 'text').filter((r) => r.name),
      };
      if (value.google.url && !/^https?:\/\//.test(value.google.url)) { AD.ui.toast('Link Google Maps phải bắt đầu bằng https://', 'error'); return; }
      await run(form.querySelector('.ad-form-foot .btn-primary'), async () => {
        if (!supa) {
          try { localStorage.setItem(DT.TRUST_DEMO_KEY, JSON.stringify(value)); } catch { throw new Error('Bộ nhớ trình duyệt đã đầy (chế độ demo). Hãy dùng ảnh nhỏ hơn.'); }
          return;
        }
        const row = await AD.db.get('settings', 'trust');
        await (row ? AD.db.update('settings', 'trust', { value }) : AD.db.insert('settings', { key: 'trust', value }));
      }, 'Đã lưu mục Uy tín & đánh giá');
    });
  };

  // ======================================================================= Nhật ký thông báo (email / Zalo / ZNS)
  AD.pages.notifications = async (params, el) => {
    el.innerHTML = `<div class="ad-head"><div><h1>Nhật ký thông báo</h1><small class="muted">Thông báo tự động gửi nhân viên (Zalo, Telegram, email) và khách hàng (email, Zalo ZNS) khi có đơn mới, thanh toán, đổi trạng thái, yêu cầu báo giá</small></div></div>
      <div id="list"><div class="ad-loading">Đang tải…</div></div>`;
    if (AD.db.mode !== 'supabase') {
      el.querySelector('#list').innerHTML = '<div class="ad-card"><p>Chế độ demo không gửi thông báo. Kết nối Supabase và cấu hình kênh gửi theo <b>docs/PHASE4.md</b> để bật tính năng này.</p></div>';
      return;
    }
    const size = 30; const page = Number(params.page) || 1;
    const status = params.status ?? '';
    el.querySelector('.ad-head').insertAdjacentHTML('afterend', `<div class="ad-tabs">${[['', 'Tất cả'], ['failed', 'Lỗi'], ['pending', 'Chờ gửi'], ['done', 'Đã gửi']].map(([k, l]) => `<a href="#/notifications${k ? `?status=${k}` : ''}" class="${status === k ? 'active' : ''}">${l}</a>`).join('')}</div>`);
    const { rows, count } = await AD.db.list('notifications', {
      select: 'id,event,status,attempts,results,data,created_at,processed_at,order_id,lead_id,orders(code),leads(code)',
      filters: [['status', 'eq', status || undefined]], order: 'id.desc', limit: size, offset: (page - 1) * size,
    });
    const channels = (r) => Object.entries(r.results || {}).map(([k, v]) => `<span class="st st-${v.ok ? 'ok' : 'danger'}" title="${esc(v.error || v.at || '')}">${esc(AD.NOTIFY_CHANNEL[k] || k)}</span>`).join(' ') || '<small class="muted">Chưa có kênh nào được cấu hình</small>';
    el.querySelector('#list').innerHTML = table([
      { label: 'Sự kiện', render: (r) => `<b>${esc(AD.NOTIFY_EVENT[r.event] || r.event)}${r.data?.status ? `: ${esc(AD.ORDER_STATUS[r.data.status]?.[0] || r.data.status)}` : ''}</b><small>${dt(r.created_at)}</small>` },
      { label: 'Liên quan', render: (r) => (r.order_id ? `<a href="#/orders/${encodeURIComponent(r.order_id)}">${esc(r.orders?.code || `Đơn #${r.order_id}`)}</a>` : r.lead_id ? `<a href="#/leads/${encodeURIComponent(r.lead_id)}">${esc(r.leads?.code || `Lead #${r.lead_id}`)}</a>` : '-') },
      { label: 'Kênh', render: channels },
      { label: 'Trạng thái', render: (r) => `${badge(AD.NOTIFY_STATUS, r.status)}<small>${r.attempts} lần gửi</small>` },
      { label: '', cls: 'actions', render: (r) => (r.status === 'failed' ? `<button class="btn btn-sm btn-light" data-retry="${esc(r.id)}">${ic('refresh')} Gửi lại</button>` : '') },
    ], rows, { empty: 'Chưa có thông báo' }) + pager(page, count, size)
      + '<p class="muted" style="margin-top:12px">Di chuột lên tên kênh để xem lỗi. Lỗi thường gặp: khóa API sai/hết hạn, khách không có email, mẫu ZNS chưa được duyệt. Hệ thống tự thử lại 6 lần (2 → 64 phút).</p>';
    AD.bindPager(el, 'notifications', { ...params, status });
    el.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', async () => {
      if (await run(b, () => AD.db.update('notifications', b.dataset.retry, { status: 'pending', next_at: new Date().toISOString() }), 'Đã đưa vào hàng đợi, sẽ gửi trong 1 phút')) AD.route();
    }));
  };
})();
