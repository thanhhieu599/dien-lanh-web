window.AD = window.AD || {};

AD.categoryProducts = {
  async mount(form, category, canEdit, kind = 'category') {
    const { esc, ic, thumb } = AD.ui;
    const isBrand = kind === 'brand';
    const label = isBrand ? 'thương hiệu' : 'danh mục';
    const root = form.querySelector(isBrand ? '#brand-products' : '#category-products');
    const save = form.querySelector('#save');
    if (save) save.disabled = true;
    const products = [];
    for (let offset = 0; ; offset += 1000) {
      const { rows, count } = await AD.db.list('products', { order: 'name.asc,id.asc', limit: 1000, offset });
      products.push(...rows);
      if (rows.length < 1000 || products.length >= count) break;
    }
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const excluded = new Set((category.excluded_product_ids || []).map(String));
    const primary = products.filter((p) => (isBrand ? p.brand : p.cat) === category.id);
    let selected = [...new Set([
      ...(category.product_ids || []).map(String), ...primary.map((p) => String(p.id)),
    ])].filter((id) => byId.has(id) && (isBrand ? byId.get(id).brand === category.id : !excluded.has(id)));
    let shown = 10;
    let resultLimit = 20;
    let dragging = null;
    const checked = new Set();
    const norm = (s) => DT.u.norm(String(s || ''));
    const typeOf = (p) => (AD.cache.categories || []).find((c) => c.id === p.cat)?.subs?.find((s) => s.id === p.sub)?.name || p.sub || '';
    const brandOf = (p) => (AD.cache.brands || []).find((b) => b.id === p.brand)?.name || p.brand || '';
    root.innerHTML = `<div class="category-members-head"><h2>Sản phẩm trong ${label} <span id="category-member-count"></span></h2></div>
      <p class="muted">${isBrand ? 'Chọn thương hiệu khi sửa sản phẩm cũng cập nhật danh sách này. Sản phẩm thêm ở đây sẽ được chuyển sang thương hiệu này.' : 'Thêm sản phẩm có sẵn, sắp xếp thứ tự hoặc gỡ khỏi danh mục.'} Nhấn Lưu để áp dụng.</p>
      <div id="category-member-list"></div>
      <button type="button" class="btn btn-light btn-sm" id="category-more-members" hidden>Hiển thị thêm sản phẩm</button>
      ${canEdit ? `<div class="category-picker">
        <h3>Thêm sản phẩm vào ${label}</h3>
        <div class="ad-grid category-filters">
          <div class="ad-field third"><label for="category-name">Tên sản phẩm / mã SKU có chứa</label><input id="category-name" type="search" placeholder="Nhập tên hoặc mã sản phẩm"></div>
          <div class="ad-field third"><label for="category-type">Loại sản phẩm có chứa</label><input id="category-type" type="search" placeholder="Ví dụ: treo tường"></div>
          <div class="ad-field third"><label for="category-brand">Nhà sản xuất có chứa</label><input id="category-brand" type="search" placeholder="Nhập tên nhà sản xuất"></div>
        </div>
        <div class="category-picker-actions"><span id="category-result-count"></span><button type="button" class="btn btn-light btn-sm" id="category-select-all">Chọn tất cả kết quả</button><button type="button" class="btn btn-light btn-sm" id="category-clear-selection">Bỏ chọn</button><button type="button" class="btn btn-primary btn-sm" id="category-add-selected">Thêm sản phẩm đã chọn</button></div>
        <div id="category-product-results"></div>
        <button type="button" class="btn btn-light btn-sm" id="category-more-results" hidden>Hiển thị thêm kết quả</button>
      </div>` : ''}`;

    function renderMembers() {
      root.querySelector('#category-member-count').textContent = `(${selected.length})`;
      root.querySelector('#category-member-list').innerHTML = selected.length
        ? `<ol class="category-member-list">${selected.slice(0, shown).map((id, i) => {
          const p = byId.get(id);
          return `<li data-member="${esc(id)}" ${canEdit ? 'draggable="true"' : ''}>
            ${canEdit ? `<span class="category-drag" title="Kéo để sắp xếp" aria-hidden="true">⠿</span>` : ''}<span class="category-member-number">${i + 1}.</span>${thumb(p)}
            <div class="category-product-name"><a href="#/products/${encodeURIComponent(id)}">${esc(p.name)}</a><small>${esc(p.sku || '')} · ${esc(typeOf(p))} · ${esc(brandOf(p))}${p.active === false ? ' · Đang ẩn' : ''}</small></div>
            ${canEdit ? `<div class="category-member-actions"><button type="button" class="btn btn-light btn-sm" data-member-up="${esc(id)}" aria-label="Đưa lên" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button type="button" class="btn btn-light btn-sm" data-member-down="${esc(id)}" aria-label="Đưa xuống" ${i === selected.length - 1 ? 'disabled' : ''}>${ic('down')}</button>${isBrand ? '' : `<button type="button" class="btn btn-light btn-sm" data-member-remove="${esc(id)}" aria-label="Gỡ khỏi danh mục">${ic('close')}</button>`}</div>` : ''}</li>`;
        }).join('')}</ol>` : `<div class="ad-empty">Chưa có sản phẩm trong ${label}.</div>`;
      const more = root.querySelector('#category-more-members');
      more.hidden = shown >= selected.length;
      more.textContent = `Hiển thị thêm ${Math.min(10, selected.length - shown)} sản phẩm`;
    }
    function matches() {
      const name = norm(root.querySelector('#category-name').value);
      const type = norm(root.querySelector('#category-type').value);
      const brand = norm(root.querySelector('#category-brand').value);
      const members = new Set(selected);
      return products.filter((p) => !members.has(String(p.id)) &&
        norm(`${p.name} ${p.sku || ''}`).includes(name) &&
        norm(typeOf(p)).includes(type) && norm(brandOf(p)).includes(brand));
    }
    function renderResults() {
      if (!canEdit) return;
      const results = matches();
      root.querySelector('#category-result-count').textContent = `${results.length} kết quả · ${checked.size} đã chọn`;
      root.querySelector('#category-add-selected').disabled = !checked.size;
      root.querySelector('#category-select-all').disabled = !results.length;
      root.querySelector('#category-product-results').innerHTML = results.length
        ? `<ul class="category-search-results">${results.slice(0, resultLimit).map((p) => `<li><label><input type="checkbox" data-pick-product="${esc(p.id)}" ${checked.has(String(p.id)) ? 'checked' : ''}>${thumb(p)}<span class="category-product-name"><b>${esc(p.name)}</b><small>${esc(p.sku || '')} · ${esc(typeOf(p))} · ${esc(brandOf(p))}</small></span></label><button type="button" class="btn btn-light btn-sm" data-add-product="${esc(p.id)}">Thêm</button></li>`).join('')}</ul>`
        : '<p class="muted">Không có sản phẩm phù hợp để thêm.</p>';
      root.querySelector('#category-more-results').hidden = results.length <= resultLimit;
    }
    function add(ids) {
      selected = [...new Set([...selected, ...ids])];
      checked.clear();
      renderMembers();
      renderResults();
    }
    root.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.id === 'category-more-members') { shown += 10; renderMembers(); }
      if (!canEdit) return;
      const { memberUp, memberDown, memberRemove, addProduct } = button.dataset;
      if (memberRemove && !isBrand) { selected = selected.filter((id) => id !== memberRemove); checked.delete(memberRemove); renderMembers(); renderResults(); }
      const moving = memberUp || memberDown;
      if (moving) {
        const index = selected.indexOf(moving);
        const next = index + (memberUp ? -1 : 1);
        if (next >= 0 && next < selected.length) {
          [selected[index], selected[next]] = [selected[next], selected[index]];
          renderMembers();
        }
      }
      if (addProduct) add([addProduct]);
      if (button.id === 'category-select-all') { matches().forEach((p) => checked.add(String(p.id))); renderResults(); }
      if (button.id === 'category-clear-selection') { checked.clear(); renderResults(); }
      if (button.id === 'category-add-selected') add([...checked]);
      if (button.id === 'category-more-results') { resultLimit += 20; renderResults(); }
    });
    root.addEventListener('input', (event) => {
      if (event.target.matches('.category-filters input')) { checked.clear(); resultLimit = 20; renderResults(); }
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('.category-filters input')) { event.preventDefault(); renderResults(); }
    });
    root.addEventListener('change', (event) => {
      const id = event.target.dataset.pickProduct;
      if (id) { event.target.checked ? checked.add(id) : checked.delete(id); renderResults(); }
    });
    root.addEventListener('dragstart', (event) => {
      if (!canEdit || event.target.closest('a,button,input')) { event.preventDefault(); return; }
      dragging = event.target.closest('[data-member]')?.dataset.member;
      if (dragging) event.dataTransfer.setData('text/plain', dragging);
    });
    root.addEventListener('dragover', (event) => { if (canEdit && dragging && event.target.closest('[data-member]')) event.preventDefault(); });
    root.addEventListener('drop', (event) => {
      const target = event.target.closest('[data-member]')?.dataset.member;
      if (!canEdit || !dragging || !target || dragging === target) return;
      event.preventDefault();
      const next = selected.indexOf(target);
      selected = selected.filter((id) => id !== dragging);
      selected.splice(next, 0, dragging);
      dragging = null;
      renderMembers();
    });
    root.addEventListener('dragend', () => { dragging = null; });
    renderMembers();
    renderResults();
    if (save) save.disabled = false;
    return { data: () => (isBrand ? { product_ids: selected.map((id) => byId.get(id).id) } : {
      product_ids: selected.map((id) => byId.get(id).id),
      excluded_product_ids: primary.filter((p) => !selected.includes(String(p.id))).map((p) => p.id),
    }) };
  },
};
