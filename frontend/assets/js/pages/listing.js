// Trang danh sách sản phẩm: danh mục (danh-muc.html), tìm kiếm (tim-kiem.html), khuyến mãi (khuyen-mai.html)
document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc } = DT.u;
  const mode = document.body.dataset.page; // category | search | khuyen-mai
  const PER_PAGE = 12;
  const params = new URLSearchParams(location.search);

  const cat = DT.api.category(params.get('cat'));
  if (mode === 'category' && !cat) { location.replace('404.html'); return; }

  // Trạng thái lọc đọc từ URL để có thể chia sẻ link / SEO
  const state = {
    cat: cat?.id || params.get('cat') || '',
    sub: params.get('sub') || '',
    brands: (params.get('brand') || '').split(',').filter(Boolean),
    price: params.get('price') || '',
    sort: params.get('sort') || 'popular',
    page: Number(params.get('page')) || 1,
    q: params.get('q') || '',
    attrs: {},
  };
  const filterDefs = () => DT.api.category(state.cat)?.filters || [];
  (cat?.filters || []).forEach((f) => { state.attrs[f.key] = (params.get(f.key) || '').split(',').filter(Boolean); });

  // ---------- Tiêu đề & breadcrumb
  let title; let crumbs; let desc;
  if (mode === 'category') {
    const sub = cat.subs.find((s) => s.id === state.sub);
    title = sub ? sub.name : cat.name;
    crumbs = [{ label: cat.name, href: sub ? `danh-muc.html?cat=${cat.id}` : null }, ...(sub ? [{ label: sub.name }] : [])];
    desc = `${title} chính hãng giá tốt, trả góp 0%, miễn phí giao hàng & lắp đặt tại TP.HCM, Bình Dương, Đồng Nai.`;
  } else if (mode === 'search') {
    title = state.q ? `Kết quả tìm kiếm "${state.q}"` : 'Tìm kiếm sản phẩm';
    crumbs = [{ label: 'Tìm kiếm' }];
    desc = `Tìm kiếm ${state.q} tại ${DT.config.name}`;
  } else {
    title = 'Khuyến mãi hot - Flash sale điện lạnh';
    crumbs = [{ label: 'Khuyến mãi' }];
    desc = 'Tổng hợp ưu đãi máy lạnh, tủ lạnh, máy giặt giảm đến 25%, quà tặng hấp dẫn.';
  }
  DT.u.setMeta({ title, description: desc });
  $('#crumb').outerHTML = DT.ui.breadcrumb(crumbs);
  $('#cat-title').textContent = title;
  $('#cat-desc').textContent = desc;

  // Loại con (chip có ảnh)
  if (cat) {
    $('#sub-cats').innerHTML = `<a class="sub-cat ${!state.sub ? 'active' : ''}" href="danh-muc.html?cat=${cat.id}">Tất cả</a>` + cat.subs.map((s) => {
      const sample = DT.products.find((p) => p.cat === cat.id && p.sub === s.id);
      return `<a class="sub-cat ${state.sub === s.id ? 'active' : ''}" href="danh-muc.html?cat=${cat.id}&sub=${s.id}">${sample ? `<span class="sc-img">${DT.productImage(sample, 0)}</span>` : ''}${esc(s.name)}</a>`;
    }).join('');
  }

  // Bài viết SEO cuối trang danh mục
  if (cat) {
    $('#seo').innerHTML = `<div class="section-box seo-box"><div class="rich">
      <h2>Mua ${esc(cat.name.toLowerCase())} chính hãng ở đâu uy tín, giá tốt?</h2>
      <p>${esc(DT.config.name)} là đơn vị phân phối ${esc(cat.name.toLowerCase())} chính hãng từ các thương hiệu hàng đầu như ${[...new Set(DT.products.filter((p) => p.cat === cat.id).map((p) => DT.api.brand(p.brand).name))].slice(0, 6).join(', ')}. Sản phẩm có đầy đủ hóa đơn VAT, phiếu bảo hành chính hãng.</p>
      <h2>Tiêu chí chọn mua ${esc(cat.short.toLowerCase())}</h2>
      <ul>${cat.filters.map((f) => `<li><strong>${esc(f.label)}:</strong> lựa chọn theo nhu cầu sử dụng thực tế (${f.options.slice(0, 4).map(esc).join(', ')}…).</li>`).join('')}
      <li><strong>Chi phí vận hành:</strong> ưu tiên sản phẩm Inverter / nhãn năng lượng 5 sao nếu sử dụng thường xuyên.</li></ul>
      <h2>Chính sách khi mua tại ${esc(DT.config.name)}</h2>
      <p>Giao hàng nhanh 2 giờ nội thành, miễn phí lắp đặt với sản phẩm có biểu tượng, trả góp 0% lãi suất, 1 đổi 1 trong 30 ngày nếu lỗi nhà sản xuất. Khách hàng doanh nghiệp được báo giá riêng theo số lượng và hỗ trợ công nợ.</p>
    </div><button class="btn btn-link btn-block" id="seo-more">Xem thêm ${DT.icon('down')}</button></div>`;
    $('#seo-more').onclick = (e) => { e.currentTarget.parentElement.classList.toggle('open'); e.currentTarget.remove(); };
  }

  // ---------- Bộ lọc
  function scopeProducts() {
    return DT.api.list({ cat: state.cat || undefined, sub: state.sub || undefined, q: state.q || undefined }).items
      .filter((p) => mode !== 'khuyen-mai' || p.oldPrice);
  }

  function renderFilters() {
    const scope = scopeProducts();
    const brandIds = [...new Set(scope.map((p) => p.brand))];
    const opt = (group, v, label, active) => `<button class="fopt ${active ? 'active' : ''}" data-group="${group}" data-v="${esc(v)}">${esc(label)}</button>`;
    let h = `<div class="filters-head"><h3>${DT.icon('filter')} Bộ lọc</h3><button class="btn btn-link" id="f-close">${DT.icon('close')}</button></div>`;
    if (!cat) {
      const cats = [...new Set(scope.map((p) => p.cat))];
      h += `<div class="filter-group"><h4>Danh mục</h4><div class="filter-opts">${cats.map((c) => opt('cat', c, DT.api.category(c).short, state.cat === c)).join('')}</div></div>`;
    }
    h += `<div class="filter-group"><h4>Thương hiệu</h4><div class="filter-opts">${brandIds.map((b) => opt('brand', b, DT.api.brand(b).name, state.brands.includes(b))).join('')}</div></div>`;
    h += `<div class="filter-group"><h4>Mức giá</h4><div class="filter-opts">${DT.priceRanges.map((r) => opt('price', r.v, r.label, state.price === r.v)).join('')}</div></div>`;
    filterDefs().forEach((f) => {
      const avail = new Set(scope.map((p) => p.attrs[f.key]));
      const opts = f.options.filter((o) => avail.has(o));
      if (opts.length) h += `<div class="filter-group"><h4>${esc(f.label)}</h4><div class="filter-opts">${opts.map((o) => opt('attr:' + f.key, o, o, (state.attrs[f.key] || []).includes(o))).join('')}</div></div>`;
    });
    h += `<div class="filter-group"><button class="btn btn-primary btn-block" id="f-apply">Xem kết quả</button></div>`;
    $('#filters').innerHTML = h;
  }

  function renderActive() {
    const chips = [];
    if (!cat && state.cat) chips.push(['cat', state.cat, DT.api.category(state.cat)?.short]);
    state.brands.forEach((b) => chips.push(['brand', b, DT.api.brand(b)?.name]));
    if (state.price) chips.push(['price', state.price, DT.priceRanges.find((r) => r.v === state.price)?.label]);
    Object.entries(state.attrs).forEach(([k, vals]) => vals.forEach((v) => chips.push(['attr:' + k, v, v])));
    $('#active-filters').innerHTML = chips.length
      ? chips.map(([g, v, l]) => `<span class="af">${esc(l)}<button data-group="${g}" data-v="${esc(v)}" aria-label="Bỏ lọc">${DT.icon('close')}</button></span>`).join('') + '<button class="btn btn-link" id="clear-all">Xóa tất cả</button>'
      : '';
  }

  function renderProducts() {
    const filter = {
      cat: state.cat || undefined, sub: state.sub || undefined, brands: state.brands, price: state.price,
      attrs: state.attrs, q: state.q || undefined, sort: state.sort, page: state.page, limit: PER_PAGE,
    };
    let res;
    if (mode === 'khuyen-mai') {
      const all = DT.api.list({ ...filter, limit: undefined, sort: state.sort === 'popular' ? 'discount' : state.sort }).items.filter((p) => p.oldPrice);
      res = { total: all.length, items: all.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE) };
    } else res = DT.api.list(filter);
    const pages = Math.ceil(res.total / PER_PAGE);
    $('#count').innerHTML = `Tìm thấy <b>${res.total}</b> sản phẩm`;
    $('#results').innerHTML = res.total
      ? DT.ui.grid(res.items)
      : DT.ui.empty(mode === 'search' && state.q ? `Không tìm thấy kết quả cho "${esc(state.q)}"` : 'Không có sản phẩm phù hợp', 'Vui lòng thử lại với từ khóa khác hoặc bỏ bớt bộ lọc.', `<a class="btn btn-primary" href="index.html">Về trang chủ</a>`);
    $('#pagination').innerHTML = DT.ui.pagination(state.page, pages);
    $('#sort').value = state.sort;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat) p.set('cat', state.cat);
    if (state.sub) p.set('sub', state.sub);
    if (state.brands.length) p.set('brand', state.brands.join(','));
    if (state.price) p.set('price', state.price);
    Object.entries(state.attrs).forEach(([k, v]) => v.length && p.set(k, v.join(',')));
    if (state.sort !== 'popular') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', state.page);
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
  }

  function update(resetPage = true) {
    if (resetPage) state.page = 1;
    syncUrl(); renderFilters(); renderActive(); renderProducts();
  }

  function toggleOpt(group, v) {
    if (group === 'cat') {
      state.cat = state.cat === v ? '' : v;
      state.attrs = {};
    } else if (group === 'brand') {
      state.brands = state.brands.includes(v) ? state.brands.filter((x) => x !== v) : [...state.brands, v];
    } else if (group === 'price') {
      state.price = state.price === v ? '' : v;
    } else if (group.startsWith('attr:')) {
      const k = group.slice(5);
      const arr = state.attrs[k] || [];
      state.attrs[k] = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    }
    update();
  }

  document.addEventListener('click', (e) => {
    const o = e.target.closest('.fopt, .af button');
    if (o) { toggleOpt(o.dataset.group, o.dataset.v); return; }
    if (e.target.closest('#clear-all')) {
      state.brands = []; state.price = ''; state.attrs = {}; if (!cat) state.cat = '';
      update(); return;
    }
    const pg = e.target.closest('.pg');
    if (pg && !pg.disabled) { state.page = Number(pg.dataset.page); update(false); $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (e.target.closest('#filter-open')) $('#filters').classList.add('open');
    if (e.target.closest('#f-close, #f-apply')) $('#filters').classList.remove('open');
  });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });

  update(false);
});
