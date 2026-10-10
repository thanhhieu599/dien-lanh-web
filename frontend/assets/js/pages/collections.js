// Yêu thích (yeu-thich.html) & So sánh sản phẩm (so-sanh.html)
document.addEventListener('DOMContentLoaded', () => {
  const { $, esc, money, stars } = DT.u;
  const page = document.body.dataset.page;

  function renderWishlist() {
    const items = DT.store.get().wishlist.map(DT.api.productById).filter(Boolean);
    $('#wishlist').innerHTML = items.length
      ? `<div class="toolbar"><span class="count">Bạn có <b>${items.length}</b> sản phẩm yêu thích</span><button class="btn btn-primary btn-sm" id="add-all">${DT.icon('cart')} Thêm tất cả vào giỏ</button></div>${DT.ui.grid(items)}`
      : `<div class="section-box">${DT.ui.empty('Chưa có sản phẩm yêu thích', 'Nhấn biểu tượng ♥ trên sản phẩm để lưu lại và xem sau.', '<a class="btn btn-primary" href="index.html">Khám phá sản phẩm</a>')}</div>`;
    const btn = $('#add-all');
    if (btn) btn.onclick = () => { items.forEach((p) => DT.store.addToCart(p.id, 1)); DT.u.toast(`Đã thêm ${items.length} sản phẩm vào giỏ hàng`); };
  }

  function renderCompare() {
    const items = DT.store.get().compare.map(DT.api.productById).filter(Boolean);
    if (!items.length) {
      $('#compare').innerHTML = `<div class="section-box">${DT.ui.empty('Chưa có sản phẩm để so sánh', 'Nhấn biểu tượng so sánh trên sản phẩm (tối đa 4 sản phẩm cùng loại).', '<a class="btn btn-primary" href="danh-muc.html?cat=may-lanh">Chọn máy lạnh để so sánh</a>')}</div>`;
      return;
    }
    const keys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))];
    const minPrice = Math.min(...items.map((p) => p.price));
    const row = (label, fn) => `<tr><th>${label}</th>${items.map((p) => `<td>${fn(p)}</td>`).join('')}</tr>`;
    $('#compare').innerHTML = `<div class="compare-table"><table>
      <tr><th>Sản phẩm<br><button class="btn btn-link" id="cp-clear" style="padding:0;margin-top:8px">Xóa tất cả</button></th>${items.map((p) => `<td class="cp-head">
        <button class="icon-btn cp-x" data-action="compare" data-id="${p.id}" aria-label="Bỏ">${DT.icon('close')}</button>
        <a class="cp-img" href="${DT.api.url(p)}" style="display:block">${DT.productImage(p, 0)}</a>
        <h3 class="pcard-name"><a href="${DT.api.url(p)}">${esc(p.name)}</a></h3>
        <div class="pcard-price" style="justify-content:center"><strong>${money(p.price)}</strong></div>
        <button class="btn btn-primary btn-sm btn-block" data-action="add-cart" data-id="${p.id}" style="margin-top:8px">Thêm vào giỏ</button></td>`).join('')}</tr>
      ${row('Giá', (p) => `<b class="price">${money(p.price)}</b>${p.price === minPrice && items.length > 1 ? ' <span class="status ok">Rẻ nhất</span>' : ''}`)}
      ${row('Thương hiệu', (p) => esc(DT.api.brand(p.brand).name))}
      ${row('Đánh giá', (p) => `${stars(p.rating)} ${p.rating} (${p.reviews})`)}
      ${row('Khuyến mãi', (p) => esc(p.gift || '-'))}
      ${row('Lắp đặt', (p) => (p.freeInstall ? '<span class="status ok">Miễn phí</span>' : '-'))}
      ${keys.map((k) => row(esc(k), (p) => esc(p.specs[k] || '-'))).join('')}
    </table></div>`;
    $('#cp-clear').onclick = () => DT.store.clearCompare();
  }

  const render = page === 'wishlist' ? renderWishlist : renderCompare;
  document.addEventListener('dt:change', render);
  render();
});
