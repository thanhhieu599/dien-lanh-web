// Trang chủ
DT.onReady(() => {
  const { $, $$, esc, money } = DT.u;

  // ---------- Hero: menu dọc + slider + banner phụ
  $('#hero-side').innerHTML = DT.layout.megaMenu();
  DT.layout.bindMega($('#hero-side'));

  const slider = $('#slider');
  // Banner chỉ hiển thị hình (quản trị › Banner tải ảnh lên); bấm vào hình mở liên kết của banner
  slider.innerHTML = DT.banners.map((b, i) => {
    const pic = b.image
      ? `<img src="${esc(b.image)}" alt="${esc(b.title || 'Banner')}" ${i ? 'loading="lazy"' : ''}>`
      : `<span class="slide-ph">${DT.icon('image')}<b>Ảnh banner ${i + 1}</b><small>Tải ảnh tại Quản trị › Banner (khuyến nghị 1200 × 780 px)</small></span>`;
    const href = DT.u.safeUrl(b.href);
    return href
      ? `<a class="slide ${i === 0 ? 'active' : ''}" href="${esc(href)}" aria-label="${esc(b.title || `Banner ${i + 1}`)}">${pic}</a>`
      : `<div class="slide ${i === 0 ? 'active' : ''}">${pic}</div>`;
  }).join('') +
    `<button class="slider-nav prev" aria-label="Trước">${DT.icon('left')}</button><button class="slider-nav next" aria-label="Sau">${DT.icon('right')}</button>
     <div class="slider-dots">${DT.banners.map((_, i) => `<button class="${i === 0 ? 'active' : ''}" data-i="${i}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>`;
  let cur = 0;
  const go = (i) => {
    cur = (i + DT.banners.length) % DT.banners.length;
    $$('.slide', slider).forEach((s, k) => s.classList.toggle('active', k === cur));
    $$('.slider-dots button', slider).forEach((s, k) => s.classList.toggle('active', k === cur));
  };
  let timer = setInterval(() => go(cur + 1), 5000);
  slider.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-i]');
    if (dot) go(+dot.dataset.i);
    if (e.target.closest('.slider-nav.prev')) go(cur - 1);
    if (e.target.closest('.slider-nav.next')) go(cur + 1);
    clearInterval(timer); timer = setInterval(() => go(cur + 1), 5000);
  });
  // Vuốt trên mobile
  let x0 = null;
  slider.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  const user = DT.store.get().user;
  // Giá vệ sinh máy lạnh thấp nhất trong mục Dịch vụ (quản trị)
  const SC = DT.siteContent();
  const T = (s) => DT.siteText(s, { rich: true });
  const href = (h, def) => esc(DT.u.safeUrl(h) || def);
  // 2 ô cạnh banner (Quản trị › Nội dung website)
  $('#hero-right').innerHTML = `
    ${SC.mini.slice(0, 2).map((m, i) => `<a class="mini-banner mb-${i + 1}" href="${href(m.href, '#')}"><b>${T(m.title)}</b><span>${T(m.sub)}</span>${m.cta ? `<em>${T(m.cta)}</em>` : ''}${DT.icon(i ? 'tool' : 'zap')}</a>`).join('')}
    <div class="hero-user">${user
      ? `<b>Xin chào, ${esc(user.name)}!</b><div class="btns"><a class="btn btn-sm btn-outline" href="tai-khoan.html#orders">Đơn hàng</a><a class="btn btn-sm btn-primary" href="yeu-thich.html">Yêu thích</a></div>`
      : `<b>Đăng nhập để nhận ưu đãi thành viên</b><div class="btns"><a class="btn btn-sm btn-primary" href="tai-khoan.html">Đăng nhập</a><a class="btn btn-sm btn-outline" href="tai-khoan.html#register">Đăng ký</a></div>`}</div>`;

  // ---------- Danh mục nhanh
  $('#quick-cats').innerHTML = DT.categories.map((c) => {
    // Ảnh thật của 1 sản phẩm trong danh mục nếu có, chưa có ảnh thì dùng biểu tượng danh mục
    const sample = DT.products.find((p) => p.cat === c.id && DT.hasImage(p));
    return `<a class="qcat" href="${DT.api.catUrl(c.id)}"><div class="qcat-img${sample ? '' : ' qcat-icon'}">${sample ? DT.productImage(sample, 0) : DT.icon(c.icon || 'box')}</div><b>${esc(c.short || c.name)}</b></a>`;
  }).join('');

  // ---------- Dải giới thiệu công ty & khối doanh nghiệp (Quản trị › Nội dung website)
  const st = SC.story;
  $('#brand-story').innerHTML = `
    <div class="bs-text"><span class="bs-kicker"><span class="bs-dot"></span>${T(st.kicker)}</span><h2>${T(st.title)}</h2></div>
    <ul class="bs-stats">${(st.stats || []).filter((x) => x.value).map((x) => `<li><b>${T(x.value)}</b><span>${T(x.label)}</span></li>`).join('')}</ul>
    <div class="bs-cta">${st.btn ? `<a class="bs-btn" href="${href(st.btnHref, 'tam-nhin-su-menh.html')}">${T(st.btn)} <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>` : ''}
      ${st.link ? `<a class="bs-link" href="${href(st.linkHref, 'gioi-thieu.html')}">${T(st.link)}</a>` : ''}</div>`;
  const bb = SC.b2b;
  $('#b2b-banner').innerHTML = `
    <div><h2>${T(bb.title)}</h2><p>${T(bb.desc)}</p>
      <ul class="b2b-points">${(bb.points || []).filter(Boolean).map((x) => `<li>${DT.icon('check')}${T(x)}</li>`).join('')}</ul>
      ${bb.btn ? `<a class="btn btn-primary btn-lg" href="${href(bb.btnHref, 'bao-gia-du-an.html')}">${T(bb.btn)}</a>` : ''}</div>
    <div class="b2b-stats">${(bb.stats || []).filter((x) => x.value).map((x) => `<div><b>${T(x.value)}</b>${T(x.label)}</div>`).join('')}</div>`;

  // ---------- Flash sale + đếm ngược (tới giờ kết thúc đặt trong quản trị, hoặc 0 giờ mỗi ngày)
  const flashItems = DT.api.list({ flash: true, sort: 'discount' }).items;
  const flashEnd = SC.flash.endsAt ? new Date(SC.flash.endsAt) : null;
  if (flashEnd && !(flashEnd > new Date())) $('#flash').hidden = true; // đợt flash sale đã kết thúc
  $('#flash').innerHTML = `
    <div class="flash-head">
      <h2>${DT.icon('zap')} ${T(SC.flash.title || 'FLASH SALE')}</h2>
      <div class="countdown">Kết thúc sau <span id="cd-d-wrap" hidden><b id="cd-d">0</b> ngày </span><b id="cd-h">00</b>:<b id="cd-m">00</b>:<b id="cd-s">00</b></div>
      <a class="link" href="khuyen-mai.html">Xem tất cả ${DT.icon('right')}</a>
    </div>
    ${DT.ui.carousel(flashItems.map((p) => DT.ui.productCard(p, { flash: true })).join(''), 'flash-car')}`;
  const tick = () => {
    const now = new Date();
    let end = flashEnd;
    if (!end) { end = new Date(now); end.setHours(24, 0, 0, 0); }
    const s = Math.max(0, Math.floor((end - now) / 1000));
    const days = Math.floor(s / 86400);
    $('#cd-d-wrap').hidden = !days;
    $('#cd-d').textContent = days;
    $('#cd-h').textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
    $('#cd-m').textContent = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    $('#cd-s').textContent = String(s % 60).padStart(2, '0');
  };
  tick(); setInterval(tick, 1000);

  // ---------- Khối sản phẩm theo danh mục (tab theo loại)
  // Danh mục bị ẩn / chưa có sản phẩm thì bỏ qua khối đó
  const blocks = ['may-lanh', 'tu-lanh', 'may-giat', 'tu-dong-tu-mat', 'vat-tu-dien-lanh']
    .filter((id) => DT.api.category(id) && DT.products.some((p) => p.cat === id));
  // Mỗi danh mục: 1 hàng sản phẩm, kéo / bấm mũi tên sang phải, tối đa 10 sản phẩm; xem thêm ở "Xem tất cả"
  const row = (cat, sub) => {
    const { items, total } = DT.api.list({ cat, sub: sub || undefined, limit: 10 });
    const more = total > items.length ? `<a class="car-more" href="${DT.api.catUrl(cat, sub || undefined)}"><b>Xem tất cả</b><span>${total} sản phẩm</span>${DT.icon('right')}</a>` : '';
    return items.length ? DT.ui.carousel(items.map((p) => DT.ui.productCard(p)).join('') + more, `car-${cat}`) : DT.ui.empty('Chưa có sản phẩm');
  };
  $('#cat-sections').innerHTML = blocks.map((id) => {
    const c = DT.api.category(id);
    return `<section class="section section-box" data-block="${id}">
      <div class="section-head">
        <h2>${esc(c.name)}</h2>
        <div class="tabs"><button class="tab active" data-sub="">Nổi bật</button>${c.subs.map((s) => `<button class="tab" data-sub="${s.id}">${esc(s.name.replace(/^(Máy lạnh|Máy giặt|Tủ lạnh) /, ''))}</button>`).join('')}</div>
        <a class="link" href="${DT.api.catUrl(id)}">Xem tất cả ${DT.icon('right')}</a>
      </div>
      <div class="block-body">${row(id)}</div>
    </section>`;
  }).join('');
  $('#cat-sections').addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    const sec = t.closest('[data-block]');
    $$('.tab', sec).forEach((x) => x.classList.toggle('active', x === t));
    $('.block-body', sec).innerHTML = row(sec.dataset.block, t.dataset.sub);
  });

  // ---------- Dịch vụ
  $('#services').innerHTML = DT.services.map((s) => `
    <a class="svc" href="dich-vu.html?svc=${s.id}"><span class="svc-ic">${DT.icon(s.icon)}</span>
      <div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><span class="price">${s.price ? 'Chỉ từ ' + money(s.price) : 'Báo giá theo hợp đồng'}</span></div></a>`).join('');

  // ---------- Đã xem gần đây
  const viewed = DT.store.get().viewed.map(DT.api.productById).filter(Boolean);
  if (viewed.length) {
    $('#viewed').classList.remove('hidden');
    $('#viewed-body').innerHTML = DT.ui.carousel(viewed.map((p) => DT.ui.productCard(p)).join(''), 'viewed-car');
  }

  // ---------- Dự án tiêu biểu & uy tín (logo khách hàng, chứng nhận, đánh giá Google)
  if (DT.trustUI) {
    const featured = (DT.projects || []).filter((p) => p.featured).concat((DT.projects || []).filter((p) => !p.featured)).slice(0, 3);
    $('#home-projects').hidden = !featured.length;
    $('#home-projects-list').innerHTML = featured.map(DT.trustUI.projectCard).join('');
    $('#home-trust').innerHTML = DT.trustUI.section();
  }

  // ---------- Tin tức
  $('#news').innerHTML = DT.posts.slice(0, 3).map(DT.ui.newsCard).join('');

  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'Store', name: DT.config.name, telephone: DT.config.hotline,
    address: DT.config.address, openingHours: (() => { const { open, close } = DT.u.hours(); const f = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; return `Mo-Su ${f(open)}-${f(close)}`; })(), url: DT.u.abs('./'), email: DT.config.email,
    legalName: DT.config.company, taxID: DT.config.taxCode, priceRange: '₫₫',
    contactPoint: [{ '@type': 'ContactPoint', telephone: DT.config.hotline, contactType: 'customer service', areaServed: 'VN', availableLanguage: 'vi' },
      { '@type': 'ContactPoint', telephone: DT.config.hotlineB2B, contactType: 'sales', areaServed: 'VN', availableLanguage: 'vi' }],
    sameAs: [DT.config.facebook, DT.config.zalo, DT.config.youtube].filter((x) => /^https?:\/\/[^/]+\/./.test(x || '')),
  });
});

