// Trang Thương hiệu (thuong-hieu.html)
// - Không có ?id: lưới logo các thương hiệu
// - Có ?id=<mã>: sản phẩm của thương hiệu, chia theo từng danh mục
DT.onReady(() => {
  const { $, esc } = DT.u;
  const PER_CAT = 10; // số sản phẩm hiển thị mỗi danh mục, còn lại xem ở trang danh mục
  const count = (id) => DT.products.filter((p) => p.brand === id).length;
  const logo = (b) => (b.logo
    ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}" loading="lazy">`
    : `<span class="br-name">${esc(b.name)}</span>`);
  const withBrand = (url, id) => `${url}${url.includes('?') ? '&' : '?'}brand=${encodeURIComponent(id)}`;

  const id = DT.u.param('id');
  const brand = id && DT.brands.find((b) => b.id === id);

  if (!brand) {
    DT.u.setMeta({ title: 'Thương hiệu', description: `Các thương hiệu điện lạnh chính hãng tại ${DT.config.name}. Chọn thương hiệu để xem sản phẩm theo từng danh mục.`, canonical: DT.api.brandUrl() });
    $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Thương hiệu' }]);
    $('#brand-page').innerHTML = DT.brands.length
      ? `<div class="brand-grid">${DT.brands.map((b) => `<a class="brand-tile" href="${DT.api.brandUrl(b.id)}">
          <span class="br-logo">${logo(b)}</span>
          <span class="br-meta"><b>${esc(b.name)}</b><small>${count(b.id)} sản phẩm</small></span></a>`).join('')}</div>`
      : `<div class="section-box">${DT.ui.empty('Chưa có thương hiệu', 'Thương hiệu sẽ hiển thị tại đây khi được thêm trong trang quản trị.')}</div>`;
    return;
  }

  DT.u.setMeta({ title: `Thương hiệu ${brand.name}`, description: `Sản phẩm ${brand.name} chính hãng tại ${DT.config.name}: xem theo từng danh mục.`, canonical: DT.api.brandUrl(brand.id) });
  $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Thương hiệu', href: DT.api.brandUrl() }, { label: brand.name }]);
  $('.cat-hero').remove(); // tiêu đề nằm trong khung logo bên dưới

  const items = DT.products.filter((p) => p.brand === brand.id);
  const groups = DT.categories.map((c) => ({ c, list: items.filter((p) => p.cat === c.id) })).filter((g) => g.list.length);
  $('#brand-page').innerHTML = `
    <div class="brand-head">
      <span class="br-logo">${logo(brand)}</span>
      <div><h1>${esc(brand.name)}</h1><p>${brand.origin ? `Xuất xứ: ${esc(brand.origin)} • ` : ''}${items.length} sản phẩm</p></div>
      <a class="link" href="${DT.api.brandUrl()}">Tất cả thương hiệu ${DT.icon('right')}</a>
    </div>
    ${groups.length ? groups.map(({ c, list }) => `
    <section class="section section-box brand-cat">
      <div class="section-head"><h2>${esc(c.name)}</h2>${list.length > PER_CAT ? `<a class="link" href="${withBrand(DT.api.catUrl(c.id), brand.id)}">Xem tất cả ${list.length} sản phẩm ${DT.icon('right')}</a>` : ''}</div>
      <div class="pgrid">${list.slice(0, PER_CAT).map((p) => DT.ui.productCard(p)).join('')}</div>
    </section>`).join('') : `<div class="section-box">${DT.ui.empty('Chưa có sản phẩm', `Thương hiệu ${esc(brand.name)} hiện chưa có sản phẩm.`)}</div>`}`;
});
