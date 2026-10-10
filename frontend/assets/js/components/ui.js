// Thành phần giao diện dùng lại: thẻ sản phẩm, modal, phân trang, breadcrumb, hành động chung.
window.DT = window.DT || {};

DT.ui = (() => {
  const { money, esc, discount, stars } = DT.u;

  const BADGE = {
    hot: ['Bán chạy', 'hot'], bestseller: ['Best seller', 'hot'], new: ['Mới', 'new'],
    premium: ['Cao cấp', 'premium'], project: ['Dự án', 'b2b'], b2b: ['Giá sỉ', 'b2b'],
  };

  function sold(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + 'k' : n;
  }

  function productCard(p, opts = {}) {
    const s = DT.store.get();
    const pct = discount(p);
    const url = DT.api.url(p);
    const chips = [p.attrs.capacity, p.attrs.tech === 'Inverter' ? 'Inverter' : null, p.attrs.volume, p.attrs.weight]
      .filter(Boolean).slice(0, 2);
    const badge = p.badges.map((b) => BADGE[b]).find(Boolean);
    return `<article class="pcard" data-id="${p.id}">
      <div class="pcard-media">
        <a href="${url}" class="pcard-img" aria-label="${esc(p.name)}">${DT.productImage(p, 0)}</a>
        <div class="pcard-labels">
          ${pct ? `<span class="lbl lbl-sale">-${pct}%</span>` : ''}
          ${p.installment ? '<span class="lbl lbl-ins">Trả góp 0%</span>' : ''}
        </div>
        ${badge ? `<span class="lbl lbl-${badge[1]} pcard-badge">${badge[0]}</span>` : ''}
        <div class="pcard-actions">
          <button class="icon-btn ${s.wishlist.includes(p.id) ? 'active' : ''}" data-action="wishlist" data-id="${p.id}" title="Yêu thích" aria-label="Yêu thích">${DT.icon('heart')}</button>
          <button class="icon-btn ${s.compare.includes(p.id) ? 'active' : ''}" data-action="compare" data-id="${p.id}" title="So sánh" aria-label="So sánh">${DT.icon('compare')}</button>
          <button class="icon-btn" data-action="quickview" data-id="${p.id}" title="Xem nhanh" aria-label="Xem nhanh">${DT.icon('eye')}</button>
        </div>
        ${p.freeInstall ? `<span class="pcard-install">${DT.icon('tool')} Miễn phí lắp đặt</span>` : ''}
      </div>
      <div class="pcard-body">
        ${chips.length ? `<div class="pcard-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
        <h3 class="pcard-name"><a href="${url}">${esc(p.name)}</a></h3>
        <div class="pcard-price">
          <strong>${money(p.price)}</strong>
          ${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ''}
        </div>
        ${p.gift ? `<div class="pcard-gift">${DT.icon('gift')}<span>${esc(p.gift)}</span></div>` : ''}
        <div class="pcard-meta">${stars(p.rating)}<span>${p.rating}</span><span class="dot">•</span><span>Đã bán ${sold(p.sold)}</span></div>
        ${opts.flash ? flashBar(p) : ''}
        <button class="btn btn-outline btn-block btn-sm pcard-buy" data-action="add-cart" data-id="${p.id}">${DT.icon('cart')} Thêm vào giỏ</button>
      </div>
    </article>`;
  }

  function flashBar(p) {
    const total = p.stock + 20;
    const pct = Math.max(12, Math.min(95, Math.round((1 - p.stock / total) * 100)));
    return `<div class="flash-bar"><span style="width:${pct}%"></span><em>${p.stock < 10 ? `Chỉ còn ${p.stock} sản phẩm` : `Đã bán ${total - p.stock}`}</em></div>`;
  }

  function grid(products, opts = {}) {
    if (!products.length) return empty('Không tìm thấy sản phẩm phù hợp', 'Thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác.');
    return `<div class="pgrid ${opts.cls || ''}">${products.map((p) => productCard(p, opts)).join('')}</div>`;
  }

  function empty(title, sub = '', action = '') {
    return `<div class="empty"><div class="empty-ic">${DT.icon('search')}</div><h3>${title}</h3><p>${sub}</p>${action}</div>`;
  }

  function breadcrumb(items) {
    const all = [{ label: 'Trang chủ', href: 'index.html' }, ...items];
    DT.u.jsonLd({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: all.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, item: it.href ? new URL(it.href, location.href).href : undefined })),
    });
    return `<nav class="breadcrumb" aria-label="breadcrumb"><div class="container">${all
      .map((it, i) => (i < all.length - 1 && it.href ? `<a href="${it.href}">${esc(it.label)}</a>${DT.icon('right')}` : `<span>${esc(it.label)}</span>`))
      .join('')}</div></nav>`;
  }

  function pagination(page, pages) {
    if (pages <= 1) return '';
    const btn = (p, label = p, dis = false, act = false) =>
      `<button class="pg ${act ? 'active' : ''}" data-page="${p}" ${dis ? 'disabled' : ''}>${label}</button>`;
    let h = btn(page - 1, DT.icon('left'), page === 1);
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) h += btn(i, i, false, i === page);
      else if (Math.abs(i - page) === 2) h += '<span class="pg-gap">…</span>';
    }
    return `<div class="pagination">${h + btn(page + 1, DT.icon('right'), page === pages)}</div>`;
  }

  // ---------- Modal
  function modal(html, cls = '') {
    close();
    const el = document.createElement('div');
    el.className = 'modal-wrap';
    el.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="Đóng">${DT.icon('close')}</button>${html}</div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => el.classList.add('show'));
    return el;
  }
  function close() {
    DT.u.$$('.modal-wrap').forEach((m) => m.remove());
    document.body.classList.remove('no-scroll');
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function quickView(id) {
    const p = DT.api.productById(id);
    if (!p) return;
    modal(`<div class="qv">
      <div class="qv-img">${DT.productImage(p, 0)}</div>
      <div class="qv-info">
        <div class="qv-brand">${esc(DT.api.brand(p.brand).name)} • SKU: ${p.sku}</div>
        <h3>${esc(p.name)}</h3>
        <div class="pcard-meta">${stars(p.rating)}<span>${p.rating} (${p.reviews} đánh giá)</span></div>
        <div class="price-box"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del><span class="lbl lbl-sale">-${discount(p)}%</span>` : ''}</div>
        <ul class="check-list">${p.highlights.slice(0, 4).map((h) => `<li>${DT.icon('check')}${esc(h)}</li>`).join('')}</ul>
        <div class="qv-btns">
          <button class="btn btn-primary" data-action="buy-now" data-id="${p.id}">Mua ngay</button>
          <button class="btn btn-outline" data-action="add-cart" data-id="${p.id}">${DT.icon('cart')} Thêm vào giỏ</button>
        </div>
        <a class="link" href="${DT.api.url(p)}">Xem chi tiết sản phẩm ${DT.icon('right')}</a>
      </div></div>`, 'modal-lg');
  }

  function addedToCart(p) {
    const t = DT.store.totals();
    modal(`<div class="added">
      <div class="added-head">${DT.icon('check')} Đã thêm vào giỏ hàng</div>
      <div class="added-item"><div class="added-img">${DT.productImage(p, 0)}</div><div><b>${esc(p.name)}</b><div class="price">${money(p.price)}</div></div></div>
      <div class="added-sum">Giỏ hàng có <b>${DT.store.cartCount()}</b> sản phẩm • Tạm tính <b class="price">${money(t.subtotal)}</b></div>
      <div class="qv-btns"><button class="btn btn-outline" data-close>Tiếp tục mua sắm</button><a class="btn btn-primary" href="gio-hang.html">Xem giỏ hàng</a></div>
    </div>`);
  }

  // ---------- Hành động chung (event delegation)
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = Number(el.dataset.id);
    const act = el.dataset.action;
    if (['add-cart', 'buy-now', 'wishlist', 'compare', 'quickview'].includes(act)) e.preventDefault();
    if (act === 'add-cart' || act === 'buy-now') {
      const qtyInput = el.dataset.qty ? DT.u.$(el.dataset.qty) : null;
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      const install = !!DT.u.$('#opt-install')?.checked;
      if (!DT.store.addToCart(id, qty, { install })) return;
      if (act === 'buy-now') { location.href = 'gio-hang.html'; return; }
      addedToCart(DT.api.productById(id));
    }
    if (act === 'wishlist') {
      const on = DT.store.toggleWishlist(id);
      DT.u.$$(`[data-action="wishlist"][data-id="${id}"]`).forEach((b) => b.classList.toggle('active', on));
      DT.u.toast(on ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');
    }
    if (act === 'compare') {
      const on = DT.store.toggleCompare(id);
      if (on === null) { DT.u.toast('Chỉ so sánh tối đa 4 sản phẩm', 'error'); return; }
      DT.u.$$(`[data-action="compare"][data-id="${id}"]`).forEach((b) => b.classList.toggle('active', on));
      DT.u.toast(on ? 'Đã thêm vào so sánh' : 'Đã bỏ khỏi so sánh');
    }
    if (act === 'quickview') quickView(id);
  });

  // Băng chuyền ngang có nút trái/phải
  function carousel(trackHtml, id) {
    return `<div class="carousel" id="${id}"><button class="car-btn prev" aria-label="Trước">${DT.icon('left')}</button><div class="car-track">${trackHtml}</div><button class="car-btn next" aria-label="Sau">${DT.icon('right')}</button></div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.car-btn');
    if (!b) return;
    const track = b.parentElement.querySelector('.car-track');
    track.scrollBy({ left: (b.classList.contains('next') ? 1 : -1) * track.clientWidth * 0.9, behavior: 'smooth' });
  });

  function newsCard(p) {
    return `<article class="news-card">
      <a class="news-img" href="bai-viet.html?slug=${p.slug}" aria-label="${esc(p.title)}">${DT.art(p.art, 'white', 'D&amp;T')}</a>
      <div class="news-body"><span class="news-cat">${esc(p.cat)}</span>
        <h3><a href="bai-viet.html?slug=${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p>
        <span class="news-meta">${DT.u.date(p.date)} • ${esc(p.author)}</span></div></article>`;
  }

  return { newsCard, productCard, grid, empty, breadcrumb, pagination, modal, close, quickView, carousel, flashBar, sold };
})();
