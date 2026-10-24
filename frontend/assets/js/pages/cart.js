// Giỏ hàng
DT.onReady(() => {
  const { $, esc, money } = DT.u;
  const root = $('#cart');

  function summaryHtml(t, cta) {
    return `<div class="summary">
      <h3>Thông tin đơn hàng</h3>
      ${t.coupon ? `<div class="coupon-applied"><span>${DT.icon('tag')} <b>${esc(t.coupon.code)}</b> - ${esc(t.coupon.desc)}</span><button class="btn-link" id="rm-coupon" aria-label="Bỏ mã">${DT.icon('close')}</button></div>`
        : `<form class="coupon-form" id="coupon-form"><input name="code" placeholder="Nhập mã giảm giá" aria-label="Mã giảm giá"><button class="btn btn-outline btn-sm">Áp dụng</button></form>
           <div class="coupon-list">${DT.coupons.map((c) => `<button class="coupon-chip" data-code="${esc(c.code)}" title="${esc(c.desc)}">${esc(c.code)}</button>`).join('')}</div>`}
      <div class="sum-row"><span>Tạm tính (${DT.store.cartCount()} sản phẩm)</span><span>${money(t.subtotal)}</span></div>
      ${t.install ? `<div class="sum-row"><span>Phí lắp đặt</span><span>${money(t.install)}</span></div>` : ''}
      <div class="sum-row"><span>Phí vận chuyển</span><span>${t.shipping ? money(t.shipping) : 'Miễn phí'}</span></div>
      ${t.discount ? `<div class="sum-row discount"><span>Giảm giá</span><span>-${money(t.discount)}</span></div>` : ''}
      <div class="sum-total"><span>Tổng cộng</span><b>${money(t.total)}</b></div>
      <div class="sum-note">(Đã bao gồm VAT nếu có)</div>
      ${cta}
    </div>`;
  }

  function render() {
    const t = DT.store.totals();
    if (!t.lines.length) {
      root.innerHTML = `<div class="section-box">${DT.ui.empty('Giỏ hàng của bạn đang trống', 'Hãy chọn thêm sản phẩm để mua sắm nhé.', '<a class="btn btn-primary" href="index.html">Tiếp tục mua sắm</a>')}</div>`;
      return;
    }
    const need = DT.config.freeShipThreshold - t.subtotal;
    // Phụ kiện thường mua kèm máy lạnh mà giỏ chưa có
    const inCart = new Set(t.lines.map((l) => l.product.id));
    const xsell = [...new Map(t.lines.flatMap((l) => DT.sales.bundle(l.product)).filter((b) => !inCart.has(b.product.id)).map((b) => [b.product.id, b])).values()];
    // Mua nhiều / giá trị lớn -> gợi ý báo giá sỉ cho doanh nghiệp
    const bulk = DT.store.cartCount() >= 3 || t.subtotal >= 30000000;
    root.innerHTML = `<div class="cart-layout">
      <div class="cart-box">
        <div class="cart-head"><h2>Giỏ hàng (${DT.store.cartCount()})</h2><button class="btn btn-link" id="clear-cart">${DT.icon('trash')} Xóa tất cả</button></div>
        <div class="ship-progress">${need > 0 ? `Mua thêm <b class="price">${money(need)}</b> để được <b>miễn phí vận chuyển</b>` : `${DT.icon('check')} Đơn hàng được <b>miễn phí vận chuyển</b>`}
          <div class="bar"><i style="width:${Math.min(100, (t.subtotal / DT.config.freeShipThreshold) * 100)}%"></i></div></div>
        ${t.lines.map(({ product: p, qty, install, id }) => `
          <div class="cart-item" data-id="${id}">
            <a class="ci-img" href="${DT.api.url(p)}">${DT.productImage(p, 0)}</a>
            <div>
              <a class="ci-name" href="${DT.api.url(p)}">${esc(p.name)}</a>
              <div class="ci-meta">
                <span>SKU: ${esc(p.sku)} • Bảo hành ${esc(p.warranty)}</span>
                ${p.gift ? `<span>${DT.icon('gift')} ${esc(p.gift)}</span>` : ''}
                ${p.cat === 'may-lanh' ? (p.freeInstall ? `<span class="muted">✓ Đã gồm công lắp đặt tiêu chuẩn</span>` : `<label class="check"><input type="checkbox" data-install ${install ? 'checked' : ''}> Lắp đặt chuẩn hãng (+${money(DT.config.installFee)}/bộ)</label>`) : ''}
              </div>
            </div>
            <div class="ci-right">
              <div class="ci-price"><strong>${money(p.price * qty)}</strong>${p.oldPrice ? `<del>${money(p.oldPrice * qty)}</del>` : ''}</div>
              <div class="qty"><button data-q="-1" aria-label="Giảm">${DT.icon('minus')}</button><input type="number" value="${qty}" min="1" max="99" data-qty aria-label="Số lượng"><button data-q="1" aria-label="Tăng">${DT.icon('plus')}</button></div>
              <button class="ci-remove" data-remove>${DT.icon('trash')} Xóa</button>
            </div>
          </div>`).join('')}
        ${xsell.length ? `<div class="cart-xsell"><h3>${DT.icon('tool')} Thường được mua kèm khi lắp máy lạnh</h3>
          <div class="xsell-list">${xsell.map((b) => `<div class="xsell"><span class="xs-img">${DT.productImage(b.product, 0)}</span><span class="xs-name"><b>${esc(b.product.name)}</b><small>${esc(b.note || '')}</small><b class="price">${money(b.product.price)}</b></span>
            <button class="btn btn-outline btn-sm" data-xsell="${b.product.id}">${DT.icon('plus')} Thêm</button></div>`).join('')}</div></div>` : ''}
        ${bulk ? `<div class="cart-b2b">${DT.icon('building')}<span><b>Mua cho công ty / dự án?</b><small>Nhận báo giá sỉ cho cả giỏ hàng, xuất VAT, công nợ 30 – 60 ngày.</small></span><button class="btn btn-primary btn-sm" id="cart-quote">Nhận báo giá sỉ</button></div>` : ''}
      </div>
      ${summaryHtml(t, `<a class="btn btn-accent btn-block btn-lg" href="thanh-toan.html">Tiến hành đặt hàng</a><a class="btn btn-link btn-block" href="index.html" style="margin-top:8px">← Tiếp tục mua sắm</a>`)}
    </div>`;
  }

  root.addEventListener('click', (e) => {
    const item = e.target.closest('.cart-item');
    const id = item && Number(item.dataset.id);
    const q = e.target.closest('[data-q]');
    if (q && item) {
      const line = DT.store.get().cart.find((i) => i.id === id);
      DT.store.setQty(id, line.qty + Number(q.dataset.q));
    }
    if (e.target.closest('[data-remove]')) { DT.store.removeFromCart(id); DT.u.toast('Đã xóa sản phẩm khỏi giỏ hàng'); }
    if (e.target.closest('#clear-cart') && confirm('Xóa toàn bộ sản phẩm trong giỏ hàng?')) DT.store.clearCart();
    const chip = e.target.closest('[data-code]');
    if (chip) applyCoupon(chip.dataset.code);
    if (e.target.closest('#rm-coupon')) DT.store.removeCoupon();
    const xs = e.target.closest('[data-xsell]');
    if (xs && DT.store.addToCart(Number(xs.dataset.xsell), 1)) DT.u.toast('Đã thêm phụ kiện vào giỏ hàng');
    if (e.target.closest('#cart-quote')) DT.sales.quote(DT.store.totals().lines.map((l) => ({ product: l.product, qty: l.qty })), { title: 'Báo giá sỉ cho cả giỏ hàng' });
  });
  root.addEventListener('change', (e) => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const id = Number(item.dataset.id);
    if (e.target.matches('[data-qty]')) DT.store.setQty(id, Math.max(1, parseInt(e.target.value, 10) || 1));
    if (e.target.matches('[data-install]')) DT.store.setInstall(id, e.target.checked);
  });
  root.addEventListener('submit', (e) => {
    if (e.target.id !== 'coupon-form') return;
    e.preventDefault();
    applyCoupon(e.target.code.value);
  });
  async function applyCoupon(code) {
    try {
      const r = await DT.store.applyCoupon(code);
      DT.u.toast(r.msg, r.ok ? 'success' : 'error');
    } catch (err) { DT.u.toast(err.message, 'error'); }
  }

  document.addEventListener('dt:change', render);
  render();
  DT.cartSummary = summaryHtml; // dùng lại ở trang thanh toán nếu cần
});
