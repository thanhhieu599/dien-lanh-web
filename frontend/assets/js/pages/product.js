// Trang chi tiết sản phẩm
document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc, money, stars, discount } = DT.u;
  const p = DT.api.product(DT.u.param('id') || DT.u.param('slug'));
  if (!p) { location.replace('404.html'); return; }

  const c = DT.api.category(p.cat);
  const sub = c.subs.find((s) => s.id === p.sub);
  const brand = DT.api.brand(p.brand);
  const s = DT.store.get();
  DT.store.addViewed(p.id);
  DT.u.setMeta({ title: p.name, description: `${p.name} chính hãng giá ${money(p.price)}. ${p.short}. Giao nhanh, lắp đặt, trả góp 0%.` });
  $('#crumb').outerHTML = DT.ui.breadcrumb([
    { label: c.name, href: `danh-muc.html?cat=${c.id}` },
    { label: sub.name, href: `danh-muc.html?cat=${c.id}&sub=${sub.id}` },
    { label: p.name },
  ]);

  // Đánh giá: mẫu + đánh giá người dùng lưu localStorage
  const RKEY = 'dt_reviews_v1';
  const loadUserReviews = () => { try { return JSON.parse(localStorage.getItem(RKEY) || '{}')[p.id] || []; } catch { return []; } };
  const reviews = () => [...loadUserReviews(), ...DT.api.reviews(p)];

  // Biến thể: cùng thương hiệu, cùng loại, khác công suất/dung tích
  const variants = DT.products.filter((x) => x.cat === p.cat && x.sub === p.sub && x.brand === p.brand)
    .sort((a, b) => a.price - b.price);
  const variantLabel = (x) => x.attrs.capacity || x.attrs.volume || x.attrs.weight || x.sku;

  const isAC = p.cat === 'may-lanh';
  const pct = discount(p);
  const monthly = Math.round(p.price / 12 / 1000) * 1000;

  $('#pd').innerHTML = `
    <div class="pd-title">
      <h1>${esc(p.name)}</h1>
      <div class="pd-sub">
        <span>Thương hiệu: <a href="danh-muc.html?cat=${c.id}&brand=${brand.id}">${esc(brand.name)}</a></span><span class="sep"></span>
        <span>SKU: ${p.sku}</span><span class="sep"></span>
        <a href="#reviews">${stars(p.rating)} ${p.rating} (${p.reviews} đánh giá)</a><span class="sep"></span>
        <span>Đã bán ${DT.ui.sold(p.sold)}</span>
        <div class="actions">
          <button data-action="wishlist" data-id="${p.id}" class="${s.wishlist.includes(p.id) ? 'active' : ''}">${DT.icon('heart')} Yêu thích</button>
          <button data-action="compare" data-id="${p.id}" class="${s.compare.includes(p.id) ? 'active' : ''}">${DT.icon('compare')} So sánh</button>
          <button id="share">${DT.icon('share')} Chia sẻ</button>
        </div>
      </div>
    </div>

    <div class="gallery">
      <div class="gallery-main" id="g-main">${DT.productImage(p, 0)}</div>
      <div class="gallery-thumbs">${p.images.map((_, i) => `<button class="${i === 0 ? 'active' : ''}" data-img="${i}" aria-label="Ảnh ${i + 1}">${DT.productImage(p, i)}</button>`).join('')}</div>
      <div class="gallery-feats">
        <div>${DT.icon('shield')}Chính hãng<br>${esc(brand.origin)}</div>
        <div>${DT.icon('refresh')}1 đổi 1<br>30 ngày</div>
        <div>${DT.icon('tool')}Bảo hành<br>${esc(p.warranty)}</div>
      </div>
    </div>

    <div class="pd-info">
      <div class="pd-price">
        <small>Giá bán (đã gồm VAT)</small>
        <div class="price-box"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del><span class="lbl lbl-sale">-${pct}%</span>` : ''}</div>
        ${p.installment ? `<small>Trả góp 0% chỉ từ <b class="price">${money(monthly)}</b>/tháng</small>` : ''}
      </div>
      ${variants.length > 1 ? `<div class="pd-variants"><h4>${esc(c.filters[0].label)}</h4><div class="variant-list">${variants.map((v) => `
        <a class="variant ${v.id === p.id ? 'active' : ''}" href="${DT.api.url(v)}"><b>${esc(variantLabel(v))}</b><small>${money(v.price)}</small></a>`).join('')}</div></div>` : ''}
      <div class="promo-box">
        <h4>${DT.icon('gift')} Khuyến mãi & ưu đãi</h4>
        <ul>
          ${p.gift ? `<li><i>1</i><span>${esc(p.gift)}</span></li>` : ''}
          ${p.freeInstall ? `<li><i>${p.gift ? 2 : 1}</i><span>Miễn phí công lắp đặt tiêu chuẩn (tiết kiệm ${money(DT.config.installFee)})</span></li>` : ''}
          <li><i>${DT.icon('check')}</i><span>Nhập mã <b>DTCOOL10</b> giảm thêm 10% (tối đa 1 triệu) cho đơn từ 5 triệu</span></li>
          <li><i>${DT.icon('check')}</i><span>Trả góp 0% qua thẻ tín dụng, duyệt nhanh 15 phút</span></li>
          <li><i>${DT.icon('check')}</i><span>Doanh nghiệp mua số lượng: <a class="link" href="bao-gia-du-an.html?sku=${p.sku}">nhận báo giá riêng</a></span></li>
        </ul>
      </div>
      <ul class="check-list">${p.highlights.map((h) => `<li>${DT.icon('check')}${esc(h)}</li>`).join('')}</ul>
      ${isAC && !p.freeInstall ? `<label class="opt-install check"><input type="checkbox" id="opt-install" checked> <span>Kèm dịch vụ lắp đặt chuẩn hãng <b class="price">+${money(DT.config.installFee)}</b></span></label>` : ''}
      <div class="buy-row">
        <span>Số lượng:</span>
        <div class="qty"><button data-q="-1" aria-label="Giảm">${DT.icon('minus')}</button><input id="qty" type="number" value="1" min="1" max="99" aria-label="Số lượng"><button data-q="1" aria-label="Tăng">${DT.icon('plus')}</button></div>
        <span class="muted">${p.stock > 0 ? `Còn hàng (${p.stock})` : 'Đặt trước - giao 3-5 ngày'}</span>
      </div>
      <div class="buy-btns">
        <button class="btn btn-accent btn-buy" data-action="buy-now" data-id="${p.id}" data-qty="#qty">MUA NGAY<small>Giao nhanh 2h hoặc nhận tại cửa hàng</small></button>
        <button class="btn btn-outline btn-lg" data-action="add-cart" data-id="${p.id}" data-qty="#qty">${DT.icon('cart')} Thêm vào giỏ</button>
        <a class="btn btn-primary btn-buy" href="chinh-sach.html?type=tra-gop">TRẢ GÓP 0%<small>Duyệt hồ sơ 15 phút</small></a>
      </div>
      <div class="pd-hotline">Gọi đặt mua <a href="tel:${DT.config.hotline.replace(/\s/g, '')}">${DT.config.hotline}</a> (7:30 - 21:30)</div>
    </div>

    <aside class="pd-aside">
      <div class="aside-box"><h4>Chính sách bán hàng</h4><ul>
        <li>${DT.icon('shield')}<div><b>Hàng chính hãng 100%</b>Đầy đủ hóa đơn VAT, CO/CQ</div></li>
        <li>${DT.icon('truck')}<div><b>Giao hàng miễn phí</b>Đơn từ ${money(DT.config.freeShipThreshold)} nội thành</div></li>
        <li>${DT.icon('tool')}<div><b>Lắp đặt chuyên nghiệp</b>Thợ có chứng chỉ, bảo hành lắp đặt 12 tháng</div></li>
        <li>${DT.icon('refresh')}<div><b>1 đổi 1 trong 30 ngày</b>Nếu lỗi do nhà sản xuất</div></li>
      </ul></div>
      <div class="aside-box"><h4>Còn hàng tại cửa hàng</h4><ul class="store-stock">${DT.stores.slice(0, 4).map((st, i) => `<li><span>${esc(st.name.replace('D&T Điện Lạnh - ', ''))}<br><small class="muted">${esc(st.address)}</small></span><span class="ok">${(p.id + i) % 3 ? 'Còn hàng' : 'Sắp về'}</span></li>`).join('')}</ul>
        <a class="link" href="he-thong-cua-hang.html">Xem tất cả cửa hàng ${DT.icon('right')}</a></div>
      <div class="aside-box"><h4>Khách hàng doanh nghiệp</h4><p class="muted">Mua từ 5 sản phẩm, dự án nhà xưởng, văn phòng: chiết khấu riêng, công nợ, xuất VAT.</p><a class="btn btn-primary btn-block" href="bao-gia-du-an.html?sku=${p.sku}">${DT.icon('file')} Yêu cầu báo giá</a></div>
    </aside>`;

  // Tabs nội dung
  const rv = reviews();
  $('#pd-content').innerHTML = `
    <div>
      <section class="pd-section"><h2>Đặc điểm nổi bật</h2><div class="rich">
        <p><strong>${esc(p.name)}</strong> là sản phẩm thuộc dòng ${esc(sub.name.toLowerCase())} của thương hiệu ${esc(brand.name)} (${esc(brand.origin)}). ${esc(p.short)}.</p>
        <ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <div class="article-cover">${DT.productImage(p, 1)}</div>
        <h2>Vì sao nên mua tại ${esc(DT.config.name)}?</h2>
        <p>Sản phẩm chính hãng, được lắp đặt bởi đội ngũ kỹ thuật được hãng đào tạo, bảo hành tận nơi. Chúng tôi hỗ trợ khảo sát miễn phí để chọn đúng công suất, giúp tiết kiệm điện năng và kéo dài tuổi thọ thiết bị.</p>
      </div></section>
      <section class="pd-section" id="reviews"><h2>Đánh giá ${esc(p.name)}</h2>
        <div class="rating-summary">
          <div class="rating-big"><b>${p.rating}</b><div>${stars(p.rating)}</div><small class="muted">${p.reviews + loadUserReviews().length} đánh giá</small></div>
          <div class="rating-bars">${[5, 4, 3, 2, 1].map((n) => { const w = [72, 20, 5, 2, 1][5 - n]; return `<div>${n} ★<span class="bar"><i style="width:${w}%"></i></span>${w}%</div>`; }).join('')}</div>
          <button class="btn btn-primary" id="write-review">Viết đánh giá</button>
        </div>
        <form class="review-form" id="review-form">
          <div class="star-input" id="star-input">${[1, 2, 3, 4, 5].map((n) => `<span data-v="${n}" class="on">★</span>`).join('')}</div>
          <div class="form-row"><div class="field"><input name="name" required placeholder="Họ tên *" value="${esc(s.user?.name || '')}"><div class="err">Vui lòng nhập họ tên</div></div>
          <div class="field"><input name="phone" required data-validate="phone" placeholder="Số điện thoại *" value="${esc(s.user?.phone || '')}"><div class="err">Số điện thoại không hợp lệ</div></div></div>
          <div class="field"><textarea name="text" required placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm…"></textarea><div class="err">Vui lòng nhập nội dung</div></div>
          <button class="btn btn-primary">Gửi đánh giá</button>
        </form>
        <div id="review-list">${rv.map(reviewHtml).join('')}</div>
      </section>
      <section class="pd-section faq"><h2>Câu hỏi thường gặp</h2>
        <details><summary>Giá đã bao gồm lắp đặt chưa?</summary><p>${p.freeInstall ? 'Sản phẩm được miễn phí công lắp đặt tiêu chuẩn. Vật tư phát sinh (ống đồng ngoài 3m, giá đỡ…) tính theo bảng giá niêm yết.' : 'Giá chưa gồm công lắp đặt. Bạn có thể chọn thêm dịch vụ lắp đặt khi đặt hàng.'}</p></details>
        <details><summary>Bao lâu thì nhận được hàng?</summary><p>Nội thành TP.HCM, Bình Dương, Đồng Nai giao trong 2 - 4 giờ. Tỉnh khác 2 - 5 ngày.</p></details>
        <details><summary>Có xuất hóa đơn VAT cho công ty không?</summary><p>Có. Nhập thông tin công ty ở bước thanh toán, hóa đơn điện tử được gửi qua email trong 24 giờ.</p></details>
        <details><summary>Bảo hành như thế nào?</summary><p>Bảo hành chính hãng ${esc(p.warranty)}, kỹ thuật viên đến tận nơi. Gọi ${DT.config.hotline} để được hỗ trợ.</p></details>
      </section>
    </div>
    <div>
      <section class="pd-section"><h2>Thông số kỹ thuật</h2>
        <table class="spec-table">${Object.entries(p.specs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      </section>
      <section class="pd-section"><h2>Bài viết tư vấn</h2><div class="side-list">${DT.posts.slice(0, 4).map((a) => `<a href="bai-viet.html?slug=${a.slug}"><span class="sl-img">${DT.art(a.art)}</span>${esc(a.title)}</a>`).join('')}</div></section>
    </div>`;

  // Sản phẩm liên quan & đã xem
  $('#related').innerHTML = DT.ui.carousel(DT.api.related(p).map((x) => DT.ui.productCard(x)).join(''), 'rel-car');
  const viewed = DT.store.get().viewed.filter((id) => id !== p.id).map(DT.api.productById).filter(Boolean);
  if (viewed.length) { $('#viewed').classList.remove('hidden'); $('#viewed-body').innerHTML = DT.ui.carousel(viewed.map((x) => DT.ui.productCard(x)).join(''), 'v-car'); }

  // Thanh mua cố định trên mobile
  $('#sticky-buy').innerHTML = `<button class="btn btn-outline" data-action="add-cart" data-id="${p.id}" data-qty="#qty">${DT.icon('cart')}</button><button class="btn btn-accent" data-action="buy-now" data-id="${p.id}" data-qty="#qty">Mua ngay • ${money(p.price)}</button>`;

  // ---------- Sự kiện
  $('.gallery-thumbs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-img]');
    if (!b) return;
    $$('.gallery-thumbs button').forEach((x) => x.classList.toggle('active', x === b));
    $('#g-main').innerHTML = DT.productImage(p, +b.dataset.img);
  });
  $('.buy-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const q = $('#qty');
    q.value = Math.min(99, Math.max(1, (parseInt(q.value, 10) || 1) + Number(b.dataset.q)));
  });
  $('#share').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); DT.u.toast('Đã sao chép liên kết sản phẩm'); }
    } catch { /* người dùng hủy */ }
  });
  $('#write-review').addEventListener('click', () => $('#review-form').classList.toggle('open'));
  let rating = 5;
  $('#star-input').addEventListener('click', (e) => {
    const st = e.target.closest('[data-v]');
    if (!st) return;
    rating = +st.dataset.v;
    $$('#star-input span').forEach((x) => x.classList.toggle('on', +x.dataset.v <= rating));
  });
  $('#review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = DT.u.formData(e.target);
    if (!d) return;
    const all = (() => { try { return JSON.parse(localStorage.getItem(RKEY) || '{}'); } catch { return {}; } })();
    const r = { name: d.name, rating, text: d.text, date: new Date().toISOString().slice(0, 10), verified: false };
    all[p.id] = [r, ...(all[p.id] || [])];
    try { localStorage.setItem(RKEY, JSON.stringify(all)); } catch { /* bỏ qua */ }
    $('#review-list').insertAdjacentHTML('afterbegin', reviewHtml(r));
    e.target.reset(); e.target.classList.remove('open');
    DT.u.toast('Cảm ơn bạn đã đánh giá sản phẩm!');
  });

  // SEO: dữ liệu có cấu trúc Product
  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku,
    brand: { '@type': 'Brand', name: brand.name }, description: p.short, category: c.name,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews },
    offers: { '@type': 'Offer', priceCurrency: 'VND', price: p.price, availability: 'https://schema.org/InStock', url: location.href },
  });

  function reviewHtml(r) {
    return `<div class="review"><div class="review-head"><span class="avatar">${esc(r.name.trim().split(' ').pop()[0] || '?')}</span>
      <div><b>${esc(r.name)}</b>${r.verified ? `<small>${DT.icon('check')} Đã mua hàng tại ${esc(DT.config.name)}</small>` : ''}</div></div>
      ${stars(r.rating)} <small class="muted">${DT.u.date(r.date)}</small><p>${esc(r.text)}</p></div>`;
  }
});
