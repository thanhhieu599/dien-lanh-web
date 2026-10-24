// Trang chi tiết sản phẩm
DT.onReady(() => {
  const { $, $$, esc, money, stars, discount } = DT.u;
  const p = DT.api.product(DT.u.param('id') || DT.u.param('slug'));
  if (!p) { location.replace('404.html'); return; }

  const c = DT.api.category(p.cat);
  const sub = DT.api.sub(p) || { id: '', name: c.name };
  const brand = DT.api.brand(p.brand);
  const s = DT.store.get();
  DT.store.addViewed(p.id);
  DT.analytics?.viewItem(p);
  // Ảnh chia sẻ (Zalo/Facebook): ảnh thật nếu có, không thì ảnh chụp sẵn khi build (og/<slug>.png)
  const ogImage = /^https?:/.test(p.images[0]) ? p.images[0] : DT.SEO?.prettyUrls ? `og/${p.slug}.png` : null;
  DT.u.setMeta({ title: p.name, description: `${p.name} chính hãng giá ${money(p.price)}. ${p.short}. Giao nhanh, lắp đặt chuẩn hãng.`, canonical: DT.api.url(p), image: ogImage, type: 'product' });
  $('#crumb').outerHTML = DT.ui.breadcrumb([
    { label: c.name, href: `${DT.api.catUrl(c.id)}` },
    ...(sub.id ? [{ label: sub.name, href: `${DT.api.catUrl(c.id, sub.id)}` }] : []),
    { label: p.name },
  ]);

  // Mã giảm giá công khai (quản trị › Mã giảm giá): ưu tiên mã giảm theo %, rồi giảm tiền, rồi miễn phí ship
  const couponRank = { percent: 0, fixed: 1, freeship: 2 };
  const coupon = [...(DT.coupons || [])].sort((a, b) => (couponRank[a.type] ?? 9) - (couponRank[b.type] ?? 9))[0];
  const couponText = (c) => {
    const m = DT.u.shortMoney;
    const what = c.type === 'percent' ? `giảm thêm ${c.value}%${c.max ? ` (tối đa ${m(c.max)})` : ''}` : c.type === 'fixed' ? `giảm ${m(c.value)}` : 'miễn phí vận chuyển';
    return `${what}${c.min ? ` cho đơn từ ${m(c.min)}` : ''}`;
  };

  // Đánh giá: mẫu + đánh giá người dùng lưu localStorage
  const RKEY = 'dt_reviews_v1';
  // Chỉ hiện đánh giá chưa bị quản trị ẩn / xóa (quản trị demo ghi status vào đây)
  const loadUserReviews = () => { try { return (JSON.parse(localStorage.getItem(RKEY) || '{}')[p.id] || []).filter((r) => !r.status || r.status === 'approved'); } catch { return []; } };
  // Có backend: đánh giá đã duyệt từ DB (nạp sau). Demo: đánh giá mẫu + đánh giá lưu trên trình duyệt.
  const reviews = () => (DT.backend.enabled ? [] : [...loadUserReviews(), ...DT.api.reviews(p)]);

  // Chọn theo nhu cầu (như chọn size): các mẫu cùng thương hiệu, cùng loại, khác kích cỡ
  // - kích cỡ: công suất / dung tích / khối lượng... lấy từ bảng thông số (giá trị cụ thể, vd "236 lít")
  // - nhu cầu: diện tích phòng / số người dùng (thuộc tính lọc hoặc câu "phù hợp ..." trong đặc điểm nổi bật)
  const SIZE_KEYS = ['Công suất', 'Dung tích tổng', 'Dung tích', 'Khối lượng', 'Diện tích sử dụng', 'Dung tích bình nước'];
  const variantLabel = (x) => { const k = SIZE_KEYS.find((key) => x.specs?.[key]); return k ? x.specs[k] : (x.attrs.capacity || x.attrs.volume || x.attrs.weight || ''); };
  const variantNeed = (x) => {
    if (x.attrs.room) return `Phòng ${x.attrs.room.replace(/^Dưới/, 'dưới').replace(/^Trên/, 'trên')}`;
    if (x.attrs.family) return `Gia đình ${x.attrs.family}`;
    const m = (x.highlights || []).map((h) => /phù hợp (.+)$/i.exec(h)).find(Boolean);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : '';
  };
  const sizeNum = (x) => parseFloat(String(variantLabel(x)).replace(',', '.')) || 0;
  const variants = [p, ...DT.products.filter((x) => x.id !== p.id && x.cat === p.cat && x.sub === p.sub && x.brand === p.brand)]
    .filter((x) => variantLabel(x))
    .filter((x, i, all) => all.findIndex((y) => variantLabel(y) === variantLabel(x)) === i)
    .sort((a, b) => sizeNum(a) - sizeNum(b) || a.price - b.price);

  const isAC = p.cat === 'may-lanh';
  const pct = discount(p);

  $('#pd').innerHTML = `
    <div class="pd-title">
      <h1>${esc(p.name)}</h1>
      <div class="pd-sub">
        <span>Thương hiệu: <a href="danh-muc.html?cat=${c.id}&brand=${brand.id}">${esc(brand.name)}</a></span><span class="sep"></span>
        <span>SKU: ${esc(p.sku)}</span><span class="sep"></span>
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
      <div class="gallery-main" id="g-main"><div class="g-pic">${DT.productImage(p, 0)}</div>${p.images.length > 1 ? `<button class="g-nav prev" data-step="-1" aria-label="Ảnh trước">${DT.icon('left')}</button><button class="g-nav next" data-step="1" aria-label="Ảnh sau">${DT.icon('right')}</button>` : ''}</div>
      <div class="gallery-thumbs">${p.images.map((_, i) => `<button class="${i === 0 ? 'active' : ''}" data-img="${i}" aria-label="Ảnh ${i + 1}">${DT.productImage(p, i)}</button>`).join('')}${
        Array.from({ length: Math.max(0, 5 - p.images.length) }, () => `<span class="g-empty" aria-hidden="true">${DT.icon('image')}</span>`).join('')}</div>
      <div class="gallery-feats">
        <div>${DT.icon('shield')}Chính hãng<br>${esc(brand.origin || brand.name)}</div>
        <div>${DT.icon('refresh')}1 đổi 1<br>30 ngày</div>
        <div>${DT.icon('tool')}Bảo hành<br>${esc(p.warranty)}</div>
      </div>
    </div>

    <div class="pd-info">
      <div class="pd-price">
        <div class="price-box"><strong>${money(p.price)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice)}</del><span class="lbl lbl-sale">-${pct}%</span>` : ''}</div>
      </div>
      ${variants.length > 1 ? `<div class="pd-variants"><h4>Chọn theo nhu cầu</h4><div class="variant-list">${variants.map((v) => `
        <a class="variant ${v.id === p.id ? 'active' : ''}" href="${DT.api.url(v)}" ${v.id === p.id ? 'aria-current="true"' : ''}><b>${esc(variantLabel(v))}</b>${variantNeed(v) ? `<span>${esc(variantNeed(v))}</span>` : ''}<small>${money(v.price)}</small></a>`).join('')}</div></div>` : ''}
      ${isAC ? `<a class="calc-hint" href="tinh-cong-suat-may-lanh.html">${DT.icon('snow')}<span>Chưa chắc công suất phù hợp? <b>Tính công suất theo diện tích phòng</b></span>${DT.icon('right')}</a>` : ''}
      <div class="promo-box">
        <h4>${DT.icon('gift')} Khuyến mãi & ưu đãi</h4>
        <ul>
          ${p.gift ? `<li><i>1</i><span>${esc(p.gift)}</span></li>` : ''}
          ${coupon ? `<li><i>${DT.icon('check')}</i><span>Nhập mã <b>${esc(coupon.code)}</b> ${esc(couponText(coupon))}</span></li>` : ''}
          <li><i>${DT.icon('check')}</i><span>Doanh nghiệp mua số lượng: <a class="link" href="bao-gia-du-an.html?sku=${encodeURIComponent(p.sku)}" data-quote>nhận báo giá riêng</a></span></li>
        </ul>
      </div>
      <ul class="check-list">${p.highlights.map((h) => `<li>${DT.icon('check')}${esc(h)}</li>`).join('')}</ul>
      <div class="buy-row">
        <span>Số lượng:</span>
        <div class="qty"><button data-q="-1" aria-label="Giảm">${DT.icon('minus')}</button><input id="qty" type="number" value="1" min="1" max="99" aria-label="Số lượng"><button data-q="1" aria-label="Tăng">${DT.icon('plus')}</button></div>
        <span class="muted">${p.stock > 0 ? `Còn hàng (${p.stock})` : 'Đặt trước - giao 3-5 ngày'}</span>
      </div>
      <div class="buy-btns">
        <button class="btn btn-accent btn-buy" data-action="buy-now" data-id="${p.id}" data-qty="#qty">MUA NGAY<small>Giao nhanh 2h</small></button>
        <button class="btn btn-outline btn-lg" data-action="add-cart" data-id="${p.id}" data-qty="#qty">${DT.icon('cart')} Thêm vào giỏ</button>
      </div>
      <div class="pd-hotline">Gọi đặt mua <a href="tel:${DT.u.tel(DT.config.hotline)}">${esc(DT.config.hotline)}</a> (${esc(DT.config.workingHours || '7:30 - 21:30')})</div>
    </div>

    <aside class="pd-aside">
      <div class="aside-box"><h4>Chính sách bán hàng</h4><ul>
        <li>${DT.icon('shield')}<div><b>Hàng chính hãng 100%</b>Đầy đủ hóa đơn VAT, CO/CQ</div></li>
        <li>${DT.icon('truck')}<div><b>Giao hàng miễn phí</b>Đơn từ ${money(DT.config.freeShipThreshold)} nội thành</div></li>
        <li>${DT.icon('tool')}<div><b>Lắp đặt chuyên nghiệp</b>Thợ có chứng chỉ, bảo hành lắp đặt 12 tháng</div></li>
        <li>${DT.icon('refresh')}<div><b>1 đổi 1 trong 30 ngày</b>Nếu lỗi do nhà sản xuất</div></li>
      </ul></div>
      <div class="aside-box"><h4>Còn hàng tại cửa hàng</h4><ul class="store-stock">${DT.stores.slice(0, 4).map((st, i) => `<li><span>${esc(st.name.replace(/^.* - /, ''))}<br><small class="muted">${esc(st.address)}</small></span><span class="ok">${(p.id + i) % 3 ? 'Còn hàng' : 'Sắp về'}</span></li>`).join('')}</ul>
        <a class="link" href="he-thong-cua-hang.html">Xem tất cả cửa hàng ${DT.icon('right')}</a></div>
    </aside>`;

  // Tabs nội dung
  const rv = reviews();
  $('#pd-content').innerHTML = `
    <div>
      <section class="pd-section"><h2>Đặc điểm nổi bật</h2><div class="rich">
        <p><strong>${esc(p.name)}</strong> là sản phẩm thuộc dòng ${esc(sub.name.toLowerCase())} của thương hiệu ${esc(brand.name)}${brand.origin ? ` (${esc(brand.origin)})` : ''}. ${esc(p.short)}.</p>
        <ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        ${DT.hasImage(p) ? `<div class="article-cover">${DT.productImage(p, 1)}</div>` : ''}
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
        <div id="review-list">${DT.backend.enabled ? '<p class="muted">Đang tải đánh giá…</p>' : rv.map(reviewHtml).join('')}</div>
      </section>
      <section class="pd-section faq"><h2>Câu hỏi thường gặp</h2>
        <details><summary>Giá đã bao gồm lắp đặt chưa?</summary><p>${p.freeInstall ? 'Giá đã gồm công lắp đặt tiêu chuẩn. Vật tư phát sinh (ống đồng ngoài 3m, giá đỡ…) tính theo bảng giá niêm yết.' : 'Giá chưa gồm công lắp đặt. Bạn có thể chọn thêm dịch vụ lắp đặt khi đặt hàng.'}</p></details>
        <details><summary>Bao lâu thì nhận được hàng?</summary><p>Nội thành TP.HCM, Bình Dương, Đồng Nai giao trong 2 - 4 giờ. Tỉnh khác 2 - 5 ngày.</p></details>
        <details><summary>Có xuất hóa đơn VAT cho công ty không?</summary><p>Có. Nhập thông tin công ty ở bước thanh toán, hóa đơn điện tử được gửi qua email trong 24 giờ.</p></details>
        <details><summary>Bảo hành như thế nào?</summary><p>Bảo hành chính hãng ${esc(p.warranty)}, kỹ thuật viên đến tận nơi. Gọi ${esc(DT.config.hotline)} để được hỗ trợ.</p></details>
      </section>
    </div>
    <div>
      <section class="pd-section"><h2>Thông số kỹ thuật</h2>
        <table class="spec-table">${Object.entries(p.specs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      </section>
      <section class="pd-section"><h2>Bài viết tư vấn</h2><div class="side-list">${DT.posts.slice(0, 4).map((a) => `<a href="${DT.api.postUrl(a.slug)}"><span class="sl-img">${DT.art(a.art)}</span>${esc(a.title)}</a>`).join('')}</div></section>
      <section class="pd-section pd-b2b"><h2>Khách hàng doanh nghiệp</h2><p class="muted">Mua từ 5 sản phẩm, dự án nhà xưởng, văn phòng: chiết khấu riêng, công nợ, xuất VAT.</p><a class="btn btn-primary btn-block" data-quote href="bao-gia-du-an.html?sku=${encodeURIComponent(p.sku)}">${DT.icon('file')} Yêu cầu báo giá</a></section>
    </div>`;

  // Sản phẩm liên quan & đã xem
  $('#related').innerHTML = DT.ui.carousel(DT.api.related(p).map((x) => DT.ui.productCard(x)).join(''), 'rel-car');
  const viewed = DT.store.get().viewed.filter((id) => id !== p.id).map(DT.api.productById).filter(Boolean);
  if (viewed.length) { $('#viewed').classList.remove('hidden'); $('#viewed-body').innerHTML = DT.ui.carousel(viewed.map((x) => DT.ui.productCard(x)).join(''), 'v-car'); }

  // Thanh mua cố định trên mobile
  $('#sticky-buy').innerHTML = `<button class="btn btn-outline" data-action="add-cart" data-id="${p.id}" data-qty="#qty" aria-label="Thêm vào giỏ hàng">${DT.icon('cart')}</button><button class="btn btn-accent" data-action="buy-now" data-id="${p.id}" data-qty="#qty">Mua ngay • ${money(p.price)}</button>`;

  // ---------- Sự kiện
  let curImg = 0;
  const showImg = (i) => {
    curImg = (i + p.images.length) % p.images.length;
    $$('.gallery-thumbs [data-img]').forEach((x) => x.classList.toggle('active', +x.dataset.img === curImg));
    $('#g-main .g-pic').innerHTML = DT.productImage(p, curImg);
    $(`.gallery-thumbs [data-img="${curImg}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  $('.gallery-thumbs').addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (b) showImg(+b.dataset.img); });
  $('#g-main').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) showImg(curImg + +b.dataset.step); });
  $('.buy-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const q = $('#qty');
    q.value = Math.min(99, Math.max(1, (parseInt(q.value, 10) || 1) + Number(b.dataset.q)));
  });
  // Báo giá doanh nghiệp (mặc định số lượng 5 hoặc số đang chọn nếu lớn hơn)
  $$('[data-quote]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    DT.sales.quote([{ product: p, qty: Math.max(5, parseInt($('#qty').value, 10) || 1) }]);
  }));
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
  if (DT.backend.enabled) {
    DT.api.fetchReviews(p)
      .then((list) => { $('#review-list').innerHTML = list.length ? list.map(reviewHtml).join('') : '<p class="muted">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>'; })
      .catch(() => { $('#review-list').innerHTML = '<p class="muted">Không tải được đánh giá.</p>'; });
  }
  $('#review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = DT.u.formData(e.target);
    if (!d) return;
    if (DT.backend.enabled) {
      try {
        await DT.backend.insert('reviews', { product_id: p.id, name: d.name.trim(), phone: d.phone, rating, text: d.text.trim() });
      } catch (err) { DT.u.toast(err.message, 'error'); return; }
      e.target.reset(); e.target.classList.remove('open');
      DT.u.toast('Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được duyệt.');
      return;
    }
    const all = (() => { try { return JSON.parse(localStorage.getItem(RKEY) || '{}'); } catch { return {}; } })();
    const r = { name: d.name, rating, text: d.text, date: DT.u.today(), verified: false };
    all[p.id] = [r, ...(all[p.id] || [])];
    try { localStorage.setItem(RKEY, JSON.stringify(all)); } catch { /* bỏ qua */ }
    $('#review-list').insertAdjacentHTML('afterbegin', reviewHtml(r));
    e.target.reset(); e.target.classList.remove('open');
    DT.u.toast('Cảm ơn bạn đã đánh giá sản phẩm!');
  });

  // SEO: dữ liệu có cấu trúc Product
  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, mpn: p.sku,
    brand: { '@type': 'Brand', name: brand.name }, description: [p.short, ...p.highlights].filter(Boolean).join('. '), category: sub.id ? `${c.name} > ${sub.name}` : c.name,
    ...(ogImage ? { image: DT.u.abs(ogImage) } : {}),
    additionalProperty: Object.entries(p.specs || {}).slice(0, 20).map(([name, value]) => ({ '@type': 'PropertyValue', name, value: String(value) })),
    ...(p.reviews > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } } : {}),
    offers: {
      '@type': 'Offer', priceCurrency: 'VND', price: p.price, url: DT.u.abs(DT.api.url(p)), itemCondition: 'https://schema.org/NewCondition',
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: DT.config.company || DT.config.name },
    },
  });

  function reviewHtml(r) {
    return `<div class="review"><div class="review-head"><span class="avatar">${esc(r.name.trim().split(' ').pop()[0] || '?')}</span>
      <div><b>${esc(r.name)}</b>${r.verified ? `<small>${DT.icon('check')} Đã mua hàng tại ${esc(DT.config.name)}</small>` : ''}</div></div>
      ${stars(r.rating)} <small class="muted">${DT.u.date(r.date)}</small><p>${esc(r.text)}</p></div>`;
  }
});
