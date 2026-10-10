// Trang chủ
document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc, money } = DT.u;

  // ---------- Hero: menu dọc + slider + banner phụ
  $('#hero-side').innerHTML = DT.layout.megaMenu();
  DT.layout.bindMega($('#hero-side'));

  const slider = $('#slider');
  slider.innerHTML = DT.banners.map((b, i) => `
    <div class="slide ${b.theme} ${i === 0 ? 'active' : ''}">
      <div>
        <span class="slide-tag">${i === 2 ? 'Doanh nghiệp' : 'Ưu đãi tháng 10'}</span>
        <h2>${esc(b.title)}</h2>
        <p>${esc(b.sub)}</p>
        <a class="btn btn-lg ${i === 2 ? 'btn-accent' : 'btn-light'}" href="${b.href}">${esc(b.cta)} ${DT.icon('right')}</a>
      </div>
      <div class="slide-art">${DT.art(b.art, 'white', b.art === 'fridge-sbs' ? 'SAMSUNG' : 'DAIKIN')}</div>
    </div>`).join('') +
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
  $('#hero-right').innerHTML = `
    <a class="mini-banner mb-1" href="khuyen-mai.html"><b>Flash Sale<br>giảm đến 25%</b><span>Số lượng có hạn mỗi ngày</span><em>Săn ngay</em>${DT.icon('zap')}</a>
    <a class="mini-banner mb-2" href="dich-vu.html"><b>Vệ sinh máy lạnh<br>chỉ từ 150K</b><span>Thợ đến trong 2 giờ</span><em>Đặt lịch</em>${DT.icon('tool')}</a>
    <div class="hero-user">${user
      ? `<b>Xin chào, ${esc(user.name)}!</b><div class="btns"><a class="btn btn-sm btn-outline" href="tai-khoan.html#orders">Đơn hàng</a><a class="btn btn-sm btn-primary" href="yeu-thich.html">Yêu thích</a></div>`
      : `<b>Đăng nhập để nhận ưu đãi thành viên</b><div class="btns"><a class="btn btn-sm btn-primary" href="tai-khoan.html">Đăng nhập</a><a class="btn btn-sm btn-outline" href="tai-khoan.html#register">Đăng ký</a></div>`}</div>`;

  // ---------- Danh mục nhanh
  $('#quick-cats').innerHTML = DT.categories.map((c) => {
    const sample = DT.products.find((p) => p.cat === c.id);
    return `<a class="qcat" href="danh-muc.html?cat=${c.id}"><div class="qcat-img">${DT.productImage(sample, 0)}</div><b>${esc(c.short)}</b></a>`;
  }).join('');

  // ---------- Flash sale + đếm ngược tới 24h
  const flashItems = DT.api.list({ flash: true, sort: 'discount' }).items;
  $('#flash').innerHTML = `
    <div class="flash-head">
      <h2>${DT.icon('zap')} FLASH SALE</h2>
      <div class="countdown">Kết thúc sau <b id="cd-h">00</b>:<b id="cd-m">00</b>:<b id="cd-s">00</b></div>
      <a class="link" href="khuyen-mai.html">Xem tất cả ${DT.icon('right')}</a>
    </div>
    ${DT.ui.carousel(flashItems.map((p) => DT.ui.productCard(p, { flash: true })).join(''), 'flash-car')}`;
  const tick = () => {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((end - now) / 1000));
    $('#cd-h').textContent = String(Math.floor(s / 3600)).padStart(2, '0');
    $('#cd-m').textContent = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    $('#cd-s').textContent = String(s % 60).padStart(2, '0');
  };
  tick(); setInterval(tick, 1000);

  // ---------- Khối sản phẩm theo danh mục (tab theo loại)
  const blocks = ['may-lanh', 'tu-lanh', 'may-giat', 'tu-dong-tu-mat', 'vat-tu-dien-lanh'];
  $('#cat-sections').innerHTML = blocks.map((id) => {
    const c = DT.api.category(id);
    return `<section class="section section-box" data-block="${id}">
      <div class="section-head">
        <h2>${esc(c.name)}</h2>
        <div class="tabs"><button class="tab active" data-sub="">Nổi bật</button>${c.subs.map((s) => `<button class="tab" data-sub="${s.id}">${esc(s.name.replace(/^(Máy lạnh|Máy giặt|Tủ lạnh) /, ''))}</button>`).join('')}</div>
        <a class="link" href="danh-muc.html?cat=${id}">Xem tất cả ${DT.icon('right')}</a>
      </div>
      <div class="block-body">${DT.ui.grid(DT.api.list({ cat: id, limit: 10 }).items)}</div>
    </section>`;
  }).join('');
  $('#cat-sections').addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (!t) return;
    const sec = t.closest('[data-block]');
    $$('.tab', sec).forEach((x) => x.classList.toggle('active', x === t));
    $('.block-body', sec).innerHTML = DT.ui.grid(DT.api.list({ cat: sec.dataset.block, sub: t.dataset.sub || undefined, limit: 10 }).items);
  });

  // ---------- Thương hiệu
  $('#brands').innerHTML = DT.brands.filter((b) => b.id !== 'dt').slice(0, 16)
    .map((b) => `<a class="brand-logo" style="color:${b.color}" href="tim-kiem.html?q=${encodeURIComponent(b.name)}">${esc(b.name.toUpperCase())}</a>`).join('');

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

  // ---------- Tin tức
  $('#news').innerHTML = DT.posts.slice(0, 3).map(DT.ui.newsCard).join('');

  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'Store', name: DT.config.name, telephone: DT.config.hotline,
    address: DT.config.address, openingHours: 'Mo-Su 07:30-21:30', url: location.origin,
  });
});

