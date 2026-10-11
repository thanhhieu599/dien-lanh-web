// Khung ứng dụng quản trị: đăng nhập, menu, điều hướng (#/route), bộ đếm việc cần xử lý.
window.AD = window.AD || {};

(() => {
  const { esc, ic } = AD.ui;
  const $ = (s) => document.querySelector(s);
  AD.cache = {};

  const NAV = [
    { group: null, items: [['dashboard', 'home', 'Tổng quan']] },
    { group: 'Bán hàng', items: [['orders', 'cart', 'Đơn hàng', 'orders'], ['leads', 'chat', 'Khách hàng tiềm năng', 'leads'], ['customers', 'user', 'Khách hàng']] },
    { group: 'Sản phẩm', items: [['products', 'box', 'Sản phẩm'], ['categories', 'grid', 'Danh mục'], ['brands', 'tag', 'Thương hiệu'], ['reviews', 'star', 'Đánh giá', 'reviews']] },
    { group: 'Marketing', items: [['coupons', 'percent', 'Mã giảm giá'], ['banners', 'zap', 'Banner'], ['posts', 'file', 'Bài viết'], ['vision', 'eye', 'Trang Tầm nhìn'], ['projects', 'building', 'Dự án tiêu biểu'], ['faqs', 'chat', 'Hỏi đáp (FAQ)'], ['trust', 'star', 'Uy tín & đánh giá']] },
    { group: 'Phân tích', items: [['reports', 'grid', 'Báo cáo'], ['notifications', 'mail', 'Nhật ký thông báo']] },
    { group: 'Cấu hình', items: [['settings', 'tool', 'Cài đặt cửa hàng'], ['stores', 'pin', 'Cửa hàng'], ['services', 'wrench', 'Dịch vụ'], ['policies', 'shield', 'Chính sách']] },
  ];

  AD.can = (R) => !R?.adminOnly || AD.me?.role === 'admin';

  // Hết phiên đăng nhập (refresh token hết hạn / bị thu hồi) -> về màn hình đăng nhập
  AD.handleError = (e) => { if (e?.expired) { loginView(e.message); return true; } return false; };

  AD.loadCache = async (force) => {
    if (AD.cache.loaded && !force) return;
    const [c, b, s] = await Promise.all([
      AD.db.list('categories', { order: 'sort.asc' }), AD.db.list('brands', { order: 'sort.asc' }), AD.db.list('services', { order: 'sort.asc' }),
    ]);
    Object.assign(AD.cache, { categories: c.rows, brands: b.rows, services: s.rows, loaded: true });
    // Ảnh minh họa sản phẩm cần danh sách thương hiệu hiện hành
    DT.brands = b.rows;
  };

  // Bộ đếm trên menu: đơn chờ xác nhận, lead mới, đánh giá chờ duyệt
  AD.refreshBadges = async () => {
    try {
      const [o, l, r] = await Promise.all([
        AD.db.list('orders', { select: 'id', filters: [['status', 'eq', 'pending']], limit: 1 }),
        AD.db.list('leads', { select: 'id', filters: [['status', 'eq', 'new']], limit: 1 }),
        AD.db.list('reviews', { select: 'id', filters: [['status', 'eq', 'pending']], limit: 1 }),
      ]);
      const set = (k, n) => { const e = document.querySelector(`[data-badge="${k}"]`); if (e) { e.textContent = n; e.hidden = !n; } };
      set('orders', o.count); set('leads', l.count); set('reviews', r.count);
      document.title = `${o.count + l.count ? `(${o.count + l.count}) ` : ''}Quản trị | ${DT.config.name}`;
    } catch (e) { AD.handleError(e); }
  };

  // Gắn form lọc / phân trang vào URL hash để giữ trạng thái khi quay lại
  AD.bindToolbar = (form, key, params) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = new URLSearchParams();
      new FormData(form).forEach((v, k) => { if (String(v).trim()) p.set(k, String(v).trim()); });
      if (params.sort) p.set('sort', params.sort);
      location.hash = `#/${key}${p.toString() ? `?${p}` : ''}`;
    });
    form.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => form.requestSubmit()));
  };
  AD.bindPager = (el, key, params) => {
    el.querySelectorAll('.ad-pager [data-page]').forEach((b) => b.addEventListener('click', () => {
      const p = new URLSearchParams(params); p.set('page', b.dataset.page);
      location.hash = `#/${key}?${p}`;
    }));
  };

  // ---------- Đăng nhập
  function loginView(err = '') {
    document.body.className = 'ad-login-page';
    const demo = AD.db.mode === 'demo';
    document.body.innerHTML = `<div class="ad-login">
      <div class="ad-login-brand"><span class="logo-mark">${ic('snow')}</span><div><b>Tên thương hiệu</b><small>Trang quản trị</small></div></div>
      ${demo ? `<div class="ad-alert">${ic('alert')}<div><b>Chế độ demo</b><br>Chưa kết nối Supabase. Dữ liệu lưu trên trình duyệt này; đơn hàng và form gửi từ website demo (cùng trình duyệt) sẽ hiện tại đây.</div></div>
        <button class="btn btn-primary btn-block btn-lg" id="demo-enter">Vào trang quản trị (demo)</button>`
      : `<form id="login" novalidate>
        <div class="ad-field"><label>Số điện thoại hoặc email</label><input name="id" required autocomplete="username"></div>
        <div class="ad-field"><label>Mật khẩu</label><input name="password" type="password" required autocomplete="current-password"></div>
        ${err ? `<div class="ad-alert ad-alert-err">${esc(err)}</div>` : ''}
        <button class="btn btn-primary btn-block btn-lg">Đăng nhập</button>
        <p class="muted">Chỉ tài khoản có vai trò <b>nhân viên</b> hoặc <b>quản trị</b> mới truy cập được.</p></form>`}
      <a class="ad-login-back" href="../frontend/index.html">← Về website</a></div>`;
    if (demo) { $('#demo-enter').onclick = () => { sessionStorage.setItem('dt_admin_demo_in', '1'); start(); }; return; }
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!f.id.value.trim() || !f.password.value) return;
      const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
      try {
        const me = await AD.db.login(f.id.value.trim(), f.password.value);
        if (!me || !['staff', 'admin'].includes(me.role)) { await AD.db.logout(); return loginView('Tài khoản không có quyền truy cập trang quản trị.'); }
        start();
      } catch (er) { loginView(er.message); }
    });
  }

  // ---------- Khung
  function shell() {
    document.body.className = 'ad-app';
    document.body.innerHTML = `
      <aside class="ad-side" id="side">
        <div class="ad-brand"><span class="logo-mark">${ic('snow')}</span><div><b>Tên thương hiệu</b><small>Quản trị${AD.db.mode === 'demo' ? ' • demo' : ''}</small></div></div>
        <nav>${NAV.map((g) => `${g.group ? `<div class="ad-nav-group">${g.group}</div>` : ''}${g.items
          .filter(([k]) => AD.can(AD.resources[k]) && (!['settings', 'vision', 'trust'].includes(k) || AD.me.role === 'admin'))
          .map(([k, i, l, b]) => `<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${l}</span>${b ? `<em data-badge="${b}" hidden></em>` : ''}</a>`).join('')}`).join('')}</nav>
        <div class="ad-side-foot"><a href="../frontend/index.html" target="_blank" rel="noopener">${ic('eye')} Xem website</a></div>
      </aside>
      <div class="ad-main">
        <header class="ad-top">
          <button class="ad-burger" id="burger" aria-label="Menu">${ic('menu')}</button>
          <form class="ad-qsearch" id="qs"><input name="q" type="search" placeholder="Tìm mã đơn / số điện thoại…" aria-label="Tìm đơn hàng"></form>
          <div class="ad-user"><span class="avatar">${esc(((AD.me.name || '?').replace(/\(.*\)/, '').trim().split(' ').pop() || '?')[0])}</span>
            <div><b>${esc(AD.me.name || '')}</b><small>${AD.me.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</small></div>
            <button class="btn btn-light btn-sm" id="logout" title="Đăng xuất">${ic('logout')}</button></div>
        </header>
        ${AD.db.mode === 'demo' ? `<div class="ad-demo-bar">${ic('alert')} Chế độ demo: dữ liệu lưu trên trình duyệt. Sửa sản phẩm ở đây chưa đổi website demo. Kết nối Supabase để dùng thật (xem supabase/README.md). <button class="btn btn-link btn-sm" id="reset-demo">Khôi phục dữ liệu mẫu</button></div>` : ''}
        <main id="view" class="ad-view"></main>
      </div>
      <div class="ad-overlay" id="ov"></div>`;
    $('#burger').onclick = () => document.body.classList.toggle('nav-open');
    $('#ov').onclick = () => document.body.classList.remove('nav-open');
    $('#logout').onclick = async () => { clearInterval(AD.badgeTimer); await AD.db.logout(); sessionStorage.removeItem('dt_admin_demo_in'); location.hash = ''; loginView(); };
    $('#qs').addEventListener('submit', (e) => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) location.hash = `#/orders?q=${encodeURIComponent(q)}`; e.target.reset(); });
    $('#reset-demo')?.addEventListener('click', async () => {
      if (await AD.ui.confirm('Khôi phục sản phẩm, danh mục, mã giảm giá… về dữ liệu mẫu ban đầu? (Đơn hàng & form từ website không bị ảnh hưởng)')) { AD.db.reset(); await AD.loadCache(true); AD.route(); AD.ui.toast('Đã khôi phục dữ liệu mẫu'); }
    });
  }

  // ---------- Điều hướng
  AD.route = async () => {
    const root = $('#view');
    if (!root) return;
    // Mỗi lần điều hướng vẽ vào một vùng mới; trang cũ tải xong muộn chỉ ghi vào vùng đã bị gỡ
    const view = document.createElement('div');
    root.replaceChildren(view);
    const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [path, qs] = raw.split('?');
    const [key, id] = path.split('/').map(decodeURIComponent);
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
    document.body.classList.remove('nav-open');
    view.innerHTML = '<div class="ad-loading">Đang tải…</div>';
    window.scrollTo(0, 0);
    try {
      const P = AD.pages;
      if (key === 'dashboard') await P.dashboard(params, view);
      else if (key === 'orders') await (id ? P.orderDetail(id, params, view) : P.orders(params, view));
      else if (key === 'leads') await (id ? P.leadDetail(id, params, view) : P.leads(params, view));
      else if (key === 'reviews') await P.reviews(params, view);
      else if (key === 'customers') await P.customers(params, view);
      else if (key === 'reports') await P.reports(params, view);
      else if (key === 'settings') await P.settings(params, view);
      else if (key === 'vision') await P.vision(params, view);
      else if (key === 'trust') await P.trust(params, view);
      else if (key === 'notifications') await P.notifications(params, view);
      else if (AD.resources[key]) {
        if (!AD.can(AD.resources[key])) throw new Error('Bạn không có quyền truy cập mục này');
        await (id ? P.crudForm(key, id, params, view) : P.crudList(key, params, view));
      } else view.innerHTML = '<div class="ad-empty"><p>Không tìm thấy trang.</p><a class="btn btn-light" href="#/dashboard">Về tổng quan</a></div>';
    } catch (e) {
      if (AD.handleError(e)) return;
      view.innerHTML = `<div class="ad-empty">${ic('alert')}<p>${esc(e.message)}</p><button class="btn btn-light" onclick="AD.route()">Thử lại</button></div>`;
    }
  };

  async function start() {
    try {
      AD.me = await AD.db.me();
    } catch { AD.me = null; }
    if (!AD.me || !['staff', 'admin'].includes(AD.me.role) || (AD.db.mode === 'demo' && !sessionStorage.getItem('dt_admin_demo_in'))) return loginView();
    try { await AD.loadCache(true); } catch (e) { if (AD.handleError(e)) return; throw e; }
    shell();
    window.onhashchange = AD.route;
    AD.route();
    AD.refreshBadges();
    clearInterval(AD.badgeTimer);
    AD.badgeTimer = setInterval(AD.refreshBadges, 60000);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
