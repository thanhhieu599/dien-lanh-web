// Header, mega menu, tìm kiếm gợi ý, footer, thanh điều hướng mobile, nút liên hệ nổi.
window.DT = window.DT || {};

DT.layout = (() => {
  const { $, $$, esc, money } = DT.u;
  const cfg = DT.config;

  const logo = `<a href="index.html" class="logo" aria-label="${esc(cfg.name)} - Trang chủ">
    <span class="logo-mark">${DT.icon('snow')}</span>
    <span class="logo-text"><b>LOGO</b><small>TÊN THƯƠNG HIỆU</small></span></a>`;

  function megaMenu() {
    return `<div class="mega">
      <ul class="mega-list">${DT.categories.map((c, i) => `
        <li class="${i === 0 ? 'active' : ''}" data-cat="${c.id}">
          <a href="${DT.api.catUrl(c.id)}">${DT.icon(c.icon)}<span>${esc(c.name)}</span>${DT.icon('right', 'arr')}</a>
        </li>`).join('')}
      </ul>
      <div class="mega-panels">${DT.categories.map((c, i) => {
        const brandIds = [...new Set(DT.products.filter((p) => p.cat === c.id).map((p) => p.brand))];
        return `<div class="mega-panel ${i === 0 ? 'active' : ''}" data-panel="${c.id}">
          <div class="mega-col"><h4>Loại sản phẩm</h4>${c.subs.map((s) => `<a href="${DT.api.catUrl(c.id, s.id)}">${esc(s.name)}</a>`).join('')}</div>
          ${c.filters[0] ? `<div class="mega-col"><h4>${esc(c.filters[0].label)}</h4>${c.filters[0].options.slice(0, 7).map((o) => `<a href="danh-muc.html?cat=${c.id}&${c.filters[0].key}=${encodeURIComponent(o)}">${esc(o)}</a>`).join('')}</div>` : ''}
          <div class="mega-col"><h4>Thương hiệu</h4><div class="mega-brands">${brandIds.map((b) => `<a href="danh-muc.html?cat=${c.id}&brand=${b}">${esc(DT.api.brand(b).name)}</a>`).join('')}</div></div>
        </div>`;
      }).join('')}</div>
    </div>`;
  }

  function header() {
    return `
    <div class="topbar"><div class="container">
      <div class="topbar-left"><a href="${DT.api.brandUrl()}" class="brand-link">${DT.icon('tag')} Thương hiệu</a></div>
      <nav class="topbar-right">
        <a href="tam-nhin-su-menh.html" class="about-link">${DT.icon('star')} Về chúng tôi</a>
        <a href="tra-cuu-don-hang.html">${DT.icon('truck')} Tra cứu đơn hàng</a>
        <a href="he-thong-cua-hang.html">${DT.icon('pin')} Hệ thống cửa hàng</a>
        <a href="dich-vu.html">${DT.icon('tool')} Dịch vụ điện lạnh</a>
        <a href="tin-tuc.html">${DT.icon('file')} Tin tức</a>
        <a href="bao-gia-du-an.html" class="b2b-link">${DT.icon('building')} Khách hàng doanh nghiệp</a>
      </nav>
    </div></div>
    <header class="header">
      <div class="container header-main">
        <button class="burger" id="burger" aria-label="Mở menu">${DT.icon('menu')}</button>
        ${logo}
        <div class="cat-toggle">
          <button class="cat-btn" aria-haspopup="true">${DT.icon('menu')}<span>Danh mục</span></button>
          <div class="cat-drop">${megaMenu()}</div>
        </div>
        <form class="search" id="search-form" action="tim-kiem.html" role="search" autocomplete="off">
          <input type="search" name="q" id="search-input" placeholder="Bạn tìm máy lạnh, tủ lạnh, máy giặt…" value="${esc(DT.u.param('q') || '')}" aria-label="Tìm kiếm sản phẩm">
          <button type="submit" aria-label="Tìm kiếm">${DT.icon('search')}</button>
          <div class="suggest" id="suggest"></div>
        </form>
        <a class="h-action h-hotline" href="tel:${DT.u.tel(cfg.hotline)}">${DT.icon('headset')}<span><small>Tư vấn miễn phí</small><b>${esc(cfg.hotline)}</b></span></a>
        <a class="h-action" href="tai-khoan.html" id="h-account">${DT.icon('user')}<span><small>Tài khoản</small><b id="h-user">Đăng nhập</b></span></a>
        <a class="h-action h-cart" href="gio-hang.html">${DT.icon('cart')}<em class="badge" id="cart-count">0</em><span><small>Giỏ hàng</small><b>Của bạn</b></span></a>
      </div>
      <nav class="catnav"><div class="container">
        ${DT.categories.map((c) => `<a href="${DT.api.catUrl(c.id)}" data-nav="${c.id}">${DT.icon(c.icon)}${esc(c.short)}</a>`).join('')}
        <a href="khuyen-mai.html" class="hot" data-nav="khuyen-mai">${DT.icon('percent')}Khuyến mãi</a>
        <a href="tam-nhin-su-menh.html" class="cn-vision" data-nav="vision"><span class="cn-dot" aria-hidden="true"></span>Tầm nhìn &amp; Sứ mệnh</a>
      </div></nav>
    </header>
    <div class="drawer" id="drawer" aria-hidden="true">
      <div class="drawer-panel">
        <div class="drawer-head">${logo}<button class="drawer-x" aria-label="Đóng">${DT.icon('close')}</button></div>
        <div class="drawer-user" id="drawer-user"></div>
        <div class="drawer-body">
          <a class="drawer-vision" href="tam-nhin-su-menh.html"><span><small>Về ${esc(cfg.name)}</small><b>Tầm nhìn &amp; Sứ mệnh</b></span>${DT.icon('right')}</a>
          ${DT.categories.map((c) => `<details><summary>${DT.icon(c.icon)}${esc(c.name)}${DT.icon('down', 'arr')}</summary>
            <a href="${DT.api.catUrl(c.id)}">Tất cả ${esc(c.short.toLowerCase())}</a>
            ${c.subs.map((s) => `<a href="${DT.api.catUrl(c.id, s.id)}">${esc(s.name)}</a>`).join('')}</details>`).join('')}
          <div class="drawer-links">
            <a href="${DT.api.brandUrl()}">${DT.icon('tag')}Thương hiệu</a>
            <a href="khuyen-mai.html">${DT.icon('percent')}Khuyến mãi hot</a>
            <a href="tinh-cong-suat-may-lanh.html">${DT.icon('snow')}Tính công suất máy lạnh</a>
            <a href="du-an.html">${DT.icon('building')}Dự án tiêu biểu</a>
            <a href="hoi-dap.html">${DT.icon('chat')}Hỏi đáp thường gặp</a>
            <a href="dich-vu.html">${DT.icon('tool')}Dịch vụ điện lạnh</a>
            <a href="bao-gia-du-an.html">${DT.icon('building')}Báo giá dự án</a>
            <a href="tra-cuu-don-hang.html">${DT.icon('truck')}Tra cứu đơn hàng</a>
            <a href="yeu-thich.html">${DT.icon('heart')}Sản phẩm yêu thích</a>
            <a href="so-sanh.html">${DT.icon('compare')}So sánh sản phẩm</a>
            <a href="he-thong-cua-hang.html">${DT.icon('pin')}Hệ thống cửa hàng</a>
            <a href="tin-tuc.html">${DT.icon('file')}Tin tức - Tư vấn</a>
            <a href="lien-he.html">${DT.icon('mail')}Liên hệ</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function footer() {
    const benefits = [
      ['shield', '100% chính hãng', 'Đầy đủ hóa đơn, phiếu bảo hành'],
      ['tool', 'Lắp đặt chuẩn hãng', 'Thợ có chứng chỉ, bảo hành lắp đặt'],
      ['truck', 'Giao nhanh 2h', 'Miễn phí đơn từ 2 triệu'],
      ['refresh', '1 đổi 1 trong 30 ngày', 'Nếu lỗi do nhà sản xuất'],
    ];
    return `
    <section class="benefits"><div class="container">${benefits.map(([i, t, s]) => `<div class="benefit">${DT.icon(i)}<div><b>${t}</b><small>${s}</small></div></div>`).join('')}</div></section>
    <section class="newsletter"><div class="container">
      <div><h3>Nhận ưu đãi độc quyền</h3><p>Đăng ký để nhận mã giảm giá 300K và lịch vệ sinh máy lạnh định kỳ.</p></div>
      <form id="newsletter-form" class="newsletter-form"><input type="email" required placeholder="Nhập email của bạn" aria-label="Email"><button class="btn btn-accent">Đăng ký</button></form>
    </div></section>
    <footer class="footer"><div class="container footer-grid">
      <div class="footer-col footer-about">
        ${logo}
        <p>${esc(cfg.slogan)}. Chuyên cung cấp máy lạnh, tủ lạnh, máy giặt, thiết bị điện lạnh dân dụng & công nghiệp chính hãng cho gia đình và doanh nghiệp.</p>
        <ul class="contact-list">
          <li>${DT.icon('phone')}Hotline: <a href="tel:${DT.u.tel(cfg.hotline)}"><b>${esc(cfg.hotline)}</b></a></li>
          ${cfg.hotlineB2B ? `<li>${DT.icon('building')}Doanh nghiệp: <a href="tel:${DT.u.tel(cfg.hotlineB2B)}"><b>${esc(cfg.hotlineB2B)}</b></a></li>` : ''}
          ${cfg.email ? `<li>${DT.icon('mail')}<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></li>` : ''}
          <li>${DT.icon('clock')}${esc(cfg.workingHours)}</li>
        </ul>
      </div>
      <div class="footer-col"><h4>Hỗ trợ khách hàng</h4>
        <a href="tinh-cong-suat-may-lanh.html">Tính công suất máy lạnh</a>
        <a href="hoi-dap.html">Hỏi đáp thường gặp</a>
        <a href="${DT.api.policyUrl('bao-hanh')}">Chính sách bảo hành</a><a href="${DT.api.policyUrl('doi-tra')}">Chính sách đổi trả</a>
        <a href="${DT.api.policyUrl('van-chuyen')}">Vận chuyển & lắp đặt</a>
        <a href="${DT.api.policyUrl('thanh-toan')}">Phương thức thanh toán</a><a href="${DT.api.policyUrl('bao-mat')}">Bảo mật thông tin</a>
      </div>
      <div class="footer-col"><h4>Về ${esc(cfg.name)}</h4>
        <a href="gioi-thieu.html">Giới thiệu công ty</a><a href="tam-nhin-su-menh.html">Tầm nhìn & Sứ mệnh</a><a href="du-an.html">Dự án tiêu biểu</a><a href="he-thong-cua-hang.html">Hệ thống cửa hàng</a>
        <a href="bao-gia-du-an.html">Giải pháp doanh nghiệp</a><a href="dich-vu.html">Dịch vụ điện lạnh</a>
        <a href="tin-tuc.html">Tin tức - Tư vấn</a><a href="lien-he.html">Liên hệ - Góp ý</a>
      </div>
      <div class="footer-col"><h4>Thanh toán</h4>
        <div class="pay-logos"><span>COD</span><span>VISA</span><span>Master</span><span>JCB</span><span>MoMo</span><span>ZaloPay</span><span>VNPay</span><span>QR Bank</span></div>
        <h4>Kết nối với chúng tôi</h4>
        <div class="socials">${[[cfg.facebook, 'Facebook', 'f'], [cfg.zalo, 'Zalo', 'Zalo'], [cfg.youtube, 'YouTube', '▶']].filter(([u]) => DT.u.safeUrl(u)).map(([u, l, t]) => `<a href="${esc(DT.u.safeUrl(u))}" target="_blank" rel="noopener" aria-label="${l}">${t}</a>`).join('')}</div>
      </div>
    </div>
    <div class="footer-bottom"><div class="container">
      <p>© ${new Date().getFullYear()} ${esc(cfg.company)}. MST: ${esc(cfg.taxCode)}. Địa chỉ: ${esc(cfg.address)}.</p>
      <p>Giá và khuyến mãi có thể thay đổi theo thời điểm. Hình ảnh minh họa.</p>
    </div></div></footer>
    <nav class="mnav">
      <a href="index.html" data-m="home">${DT.icon('home')}<span>Trang chủ</span></a>
      <a href="#" id="mnav-cat">${DT.icon('grid')}<span>Danh mục</span></a>
      <a href="khuyen-mai.html" data-m="khuyen-mai">${DT.icon('percent')}<span>Khuyến mãi</span></a>
      <a href="gio-hang.html" data-m="cart">${DT.icon('cart')}<em class="badge" id="cart-count-m">0</em><span>Giỏ hàng</span></a>
      <a href="tai-khoan.html" data-m="account">${DT.icon('user')}<span>Tài khoản</span></a>
    </nav>
    <div class="floating">
      ${DT.sales ? DT.sales.chatButton() : cfg.zalo ? `<a href="${esc(DT.u.safeUrl(cfg.zalo))}" target="_blank" rel="noopener" class="fl-zalo" aria-label="Chat Zalo">Zalo</a>` : ''}
      <a href="tel:${DT.u.tel(cfg.hotline)}" class="fl-phone" aria-label="Gọi hotline">${DT.icon('phone')}</a>
      <button class="fl-top" id="to-top" aria-label="Lên đầu trang">${DT.icon('up')}</button>
    </div>
    ${DT.sales ? DT.sales.chatHtml() : ''}
    <div class="compare-bar" id="compare-bar"></div>`;
  }

  // ---------- Hành vi
  function bindMega(root) {
    $$('.mega-list li', root).forEach((li) => {
      li.addEventListener('mouseenter', () => {
        $$('.mega-list li', root).forEach((x) => x.classList.toggle('active', x === li));
        $$('.mega-panel', root).forEach((x) => x.classList.toggle('active', x.dataset.panel === li.dataset.cat));
      });
    });
  }

  function bindSearch() {
    const input = $('#search-input');
    const box = $('#suggest');
    const form = $('#search-form');
    const popular = ['máy lạnh inverter 1hp', 'tủ lạnh side by side', 'máy giặt cửa trước', 'máy lạnh âm trần', 'ống đồng'];
    const render = () => {
      const q = input.value.trim();
      const items = DT.api.suggest(q);
      if (!q) {
        box.innerHTML = `<div class="sg-title">Tìm kiếm phổ biến</div><div class="sg-tags">${popular.map((k) => `<a href="tim-kiem.html?q=${encodeURIComponent(k)}">${k}</a>`).join('')}</div>`;
      } else if (!items.length) {
        box.innerHTML = `<div class="sg-empty">Không có gợi ý cho "<b>${esc(q)}</b>". Nhấn Enter để tìm.</div>`;
      } else {
        box.innerHTML = `<div class="sg-title">Sản phẩm gợi ý</div>${items.map((p) => `<a class="sg-item" href="${DT.api.url(p)}"><span class="sg-img">${DT.productImage(p, 0)}</span><span><b>${esc(p.name)}</b><em>${money(p.price)}</em></span></a>`).join('')}
          <a class="sg-all" href="tim-kiem.html?q=${encodeURIComponent(q)}">Xem tất cả kết quả cho "${esc(q)}"</a>`;
      }
      box.classList.add('open');
    };
    input.addEventListener('focus', render);
    input.addEventListener('input', DT.u.debounce(render, 150));
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) box.classList.remove('open'); });
    form.addEventListener('submit', (e) => { if (!input.value.trim()) e.preventDefault(); });
  }

  function bindDrawer() {
    const d = $('#drawer');
    const open = (e) => { e?.preventDefault(); d.classList.add('open'); document.body.classList.add('no-scroll'); };
    const shut = () => { d.classList.remove('open'); document.body.classList.remove('no-scroll'); };
    $('#burger').addEventListener('click', open);
    $('#mnav-cat').addEventListener('click', open);
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('.drawer-x')) shut(); });
  }

  function renderCompareBar() {
    const bar = $('#compare-bar');
    const ids = DT.store.get().compare;
    if (!ids.length || document.body.dataset.page === 'compare') { bar.classList.remove('show'); return; }
    bar.innerHTML = `<div class="container"><div class="cb-items">${ids.map((id) => {
      const p = DT.api.productById(id);
      return p ? `<div class="cb-item"><span class="cb-img">${DT.productImage(p, 0)}</span><span>${esc(p.name)}</span><button data-action="compare" data-id="${id}" aria-label="Bỏ">${DT.icon('close')}</button></div>` : '';
    }).join('')}${'<div class="cb-item cb-empty">+ Thêm sản phẩm</div>'.repeat(Math.max(0, 4 - ids.length))}</div>
      <div class="cb-btns"><a class="btn btn-primary" href="so-sanh.html">So sánh ngay (${ids.length})</a><button class="btn btn-link" id="cb-clear">Xóa tất cả</button></div></div>`;
    bar.classList.add('show');
    $('#cb-clear').onclick = () => DT.store.clearCompare();
  }

  function refresh() {
    const s = DT.store.get();
    const n = DT.store.cartCount();
    ['#cart-count', '#cart-count-m'].forEach((sel) => { const el = $(sel); if (el) { el.textContent = n; el.classList.toggle('show', n > 0); } });
    const u = $('#h-user');
    if (u) u.textContent = s.user ? s.user.name.split(' ').slice(-1)[0] : 'Đăng nhập';
    const du = $('#drawer-user');
    if (du) du.innerHTML = s.user ? `${DT.icon('user')} Xin chào, <b>${esc(s.user.name)}</b>` : `<a href="tai-khoan.html" class="btn btn-primary btn-sm">Đăng nhập / Đăng ký</a>`;
    renderCompareBar();
  }

  function init() {
    const h = $('#site-header');
    const f = $('#site-footer');
    if (h) h.innerHTML = header();
    if (f) f.innerHTML = footer();
    // Xác minh Google Search Console (Quản trị › Cài đặt › Mã xác minh): thẻ meta có trong trang build sẵn
    const gv = String(cfg.googleVerification || '').replace(/^.*content="([^"]+)".*$/, '$1').trim();
    if (gv && /^[\w-]{10,100}$/.test(gv)) {
      let m = document.head.querySelector('meta[name="google-site-verification"]');
      if (!m) { m = document.createElement('meta'); m.name = 'google-site-verification'; document.head.appendChild(m); }
      m.content = gv;
    }
    bindMega(document);
    bindSearch();
    bindDrawer();
    // Liên kết "#id" cuộn trong trang (trang pre-render có <base href="../"> nên trình duyệt sẽ hiểu sai)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      const id = a?.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    const page = document.body.dataset.page;
    const cat = DT.u.param('cat');
    $$(`.catnav [data-nav="${cat || page}"]`).forEach((a) => a.classList.add('active'));
    $$(`.mnav [data-m="${page}"]`).forEach((a) => a.classList.add('active'));

    const top = $('#to-top');
    window.addEventListener('scroll', () => {
      top.classList.toggle('show', scrollY > 600);
      document.body.classList.toggle('scrolled', scrollY > 120);
    }, { passive: true });
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

    $('#newsletter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.querySelector('input').value.trim();
      try {
        await DT.saveLead('newsletter', { email });
        e.target.reset();
        DT.u.toast('Đăng ký thành công! Chúng tôi sẽ gửi ưu đãi tới email của bạn.');
      } catch (err) { DT.u.toast(err.message, 'error'); }
    });

    document.addEventListener('dt:change', refresh);
    refresh();
  }

  return { init, megaMenu, bindMega };
})();

DT.onReady(() => { DT.store.prune(); DT.layout.init(); });
