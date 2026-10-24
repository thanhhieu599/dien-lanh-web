// Quản trị › Nội dung website: chỉnh các phần chữ / số liệu trên website mà trước đây viết cứng trong code.
// Lưu vào settings 'home' (nội dung) và 'catalog' (mức lọc giá, phụ kiện gợi ý mua kèm).
window.AD = window.AD || {};

(() => {
  const { esc } = AD.ui;
  const ic = (n) => DT.icon(n);
  const run = AD.ui.run;

  AD.pages.content = async (params, el) => {
    if (AD.me.role !== 'admin') throw new Error('Chỉ quản trị viên được sửa Nội dung website');
    const D = DT.siteContentDefaults;
    const [homeRow, catRow] = await Promise.all([AD.db.get('settings', 'home'), AD.db.get('settings', 'catalog')]);
    const saved = homeRow?.value || {};
    const C = {
      mini: saved.mini?.length ? saved.mini : D.mini,
      story: { ...D.story, ...(saved.story || {}) },
      b2b: { ...D.b2b, ...(saved.b2b || {}) },
      flash: { ...D.flash, ...(saved.flash || {}) },
      benefits: saved.benefits?.length ? saved.benefits : D.benefits,
      salesPolicy: saved.salesPolicy?.length ? saved.salesPolicy : D.salesPolicy,
      newsletter: { ...D.newsletter, ...(saved.newsletter || {}) },
    };
    const cat = catRow?.value || {};
    const ranges = cat.priceRanges?.length ? cat.priceRanges : DT.priceRanges;
    const bundles = Array.isArray(cat.bundles) ? cat.bundles : DT.bundleRules;
    const products = [...(AD.cache.productMap?.values() || [])];
    const accessories = products.filter((p) => p.cat === 'vat-tu-dien-lanh' || p.cat === 'vat-tu');
    const acSubs = (AD.cache.categories || []).find((c) => c.id === 'may-lanh')?.subs || [];

    // ---------- Ô nhập
    const inp = (name, v, ph = '', extra = '') => `<input name="${name}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" ${extra}>`;
    const area = (name, v, rows = 2) => `<textarea name="${name}" rows="${rows}">${esc(v ?? '')}</textarea>`;
    const f = (label, control, col = 'half', help = '') => `<div class="ad-field ${col}"><label>${label}</label>${control}${help ? `<small class="help">${help}</small>` : ''}</div>`;
    const iconSel = (name, v) => `<select name="${name}">${DT.siteIcons.map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
    const card = (title, hint, body, id) => `<section class="ad-card" ${id ? `id="${id}"` : ''}><h3>${title}</h3>${hint ? `<p class="muted">${hint}</p>` : ''}<div class="ad-grid">${body}</div></section>`;
    const items4 = (key, list) => list.map((x, i) => `
      ${f(`Mục ${i + 1} – biểu tượng`, iconSel(`${key}.${i}.icon`, x.icon), 'quarter')}
      ${f('Tiêu đề', inp(`${key}.${i}.title`, x.title), 'quarter')}
      ${f('Dòng phụ', inp(`${key}.${i}.sub`, x.sub), 'half')}`).join('');
    const pad = (arr, n, fill) => Array.from({ length: n }, (_, i) => arr[i] || fill());
    const SYMBOLS = 'Ký hiệu: <b>{ten}</b> tên cửa hàng, <b>{nguong}</b> / <b>{nguong_vnd}</b> ngưỡng miễn phí ship (2 triệu / 2.000.000₫), <b>{gia_ve_sinh}</b> giá vệ sinh thấp nhất, <b>*chữ*</b> tô màu nhấn mạnh.';

    const rangeRow = (r = {}) => `<div class="tr-row ct-row"><div class="tr-f ct-range">
      <input data-k="label" placeholder="Tên mức giá *, vd 5 - 10 triệu" value="${esc(r.label || '')}">
      <input data-k="min" type="number" min="0" step="0.5" placeholder="Từ (triệu)" value="${r.min != null ? r.min / 1e6 : ''}">
      <input data-k="max" type="number" min="0" step="0.5" placeholder="Đến (triệu, trống = trở lên)" value="${r.max != null ? r.max / 1e6 : ''}"></div>${rowBtns}</div>`;
    const bundleRow = (b = {}) => `<div class="tr-row ct-row"><div class="tr-f ct-bundle">
      <select data-k="sku"><option value="">– Chọn phụ kiện * –</option>${accessories.map((p) => `<option value="${esc(p.sku)}" ${p.sku === b.sku ? 'selected' : ''}>${esc(p.sku)} – ${esc(p.name)}</option>`).join('')}</select>
      <input data-k="note" placeholder="Ghi chú hiện cho khách, vd Đủ cho 1 bộ máy ≤ 1.5 HP" value="${esc(b.note || '')}">
      <input data-k="minHp" type="number" min="0" step="0.5" placeholder="Từ HP (trống = mọi)" value="${b.minHp ?? ''}">
      <input data-k="maxHp" type="number" min="0" step="0.5" placeholder="Đến HP (trống = mọi)" value="${b.maxHp ?? ''}">
      <div class="ct-subs">${acSubs.map((s) => `<label class="ad-check"><input type="checkbox" data-sub="${esc(s.id)}" ${(b.subs || []).includes(s.id) ? 'checked' : ''}> <span>${esc(s.name)}</span></label>`).join('')}</div></div>${rowBtns}</div>`;
    const rowBtns = `<span class="tr-btns"><button type="button" class="btn btn-light btn-sm" data-up aria-label="Lên">${ic('up')}</button><button type="button" class="btn btn-light btn-sm" data-del aria-label="Xóa">${ic('trash')}</button></span>`;

    el.innerHTML = `<div class="ad-head"><div><h1>Nội dung website</h1><small class="muted">Chữ, số liệu trên trang chủ, dải cam kết, trang sản phẩm; Flash Sale; mức lọc giá; phụ kiện gợi ý mua kèm. ${SYMBOLS}</small></div></div>
      <form id="ct-form" novalidate>
        ${card('Trang chủ – 2 ô cạnh banner', 'Ô 1 nền trắng chữ đỏ, ô 2 chữ xanh. Xuống dòng trong tiêu đề để ngắt dòng.', C.mini.slice(0, 2).map((m, i) => `
          ${f(`Ô ${i + 1} – tiêu đề`, area(`mini.${i}.title`, m.title), 'half')}
          ${f('Dòng phụ', inp(`mini.${i}.sub`, m.sub), 'half')}
          ${f('Chữ trên nút', inp(`mini.${i}.cta`, m.cta), 'half')}
          ${f('Liên kết', inp(`mini.${i}.href`, m.href, 'khuyen-mai.html'), 'half')}`).join(''), 'ct-mini')}
        ${card('Trang chủ – dải giới thiệu công ty', '', `
          ${f('Dòng nhỏ phía trên', inp('story.kicker', C.story.kicker), 'half')}
          ${f('Tiêu đề', inp('story.title', C.story.title), 'half', 'Đặt *chữ* để tô màu nhấn mạnh')}
          ${pad(C.story.stats || [], 3, () => ({})).map((x, i) => `${f(`Số liệu ${i + 1}`, inp(`story.stats.${i}.value`, x.value, 'vd 10+'), 'quarter')}${f('Mô tả', inp(`story.stats.${i}.label`, x.label, 'vd Năm kinh nghiệm'), 'quarter')}`).join('')}
          ${f('Nút chính', inp('story.btn', C.story.btn), 'quarter')}${f('Liên kết nút', inp('story.btnHref', C.story.btnHref), 'quarter')}
          ${f('Link phụ', inp('story.link', C.story.link), 'quarter')}${f('Liên kết link phụ', inp('story.linkHref', C.story.linkHref), 'quarter')}`, 'ct-story')}
        ${card('Trang chủ – khối "Giải pháp cho doanh nghiệp"', '', `
          ${f('Tiêu đề', inp('b2b.title', C.b2b.title), 'full')}
          ${f('Mô tả', area('b2b.desc', C.b2b.desc), 'full')}
          ${pad(C.b2b.points || [], 4, () => '').map((x, i) => f(`Ý ${i + 1}`, inp(`b2b.points.${i}`, x), 'half')).join('')}
          ${f('Nút', inp('b2b.btn', C.b2b.btn), 'half')}${f('Liên kết nút', inp('b2b.btnHref', C.b2b.btnHref), 'half')}
          ${pad(C.b2b.stats || [], 4, () => ({})).map((x, i) => `${f(`Số liệu ${i + 1}`, inp(`b2b.stats.${i}.value`, x.value, 'vd 500+'), 'quarter')}${f('Mô tả', inp(`b2b.stats.${i}.label`, x.label), 'quarter')}`).join('')}`, 'ct-b2b')}
        ${card('Flash Sale (trang chủ)', 'Sản phẩm Flash Sale chọn trong Sản phẩm › "Flash sale". Để trống giờ kết thúc: đồng hồ đếm ngược tới 0 giờ mỗi ngày. Hết giờ: khối Flash Sale tự ẩn.', `
          ${f('Tiêu đề', inp('flash.title', C.flash.title), 'half')}
          ${f('Kết thúc lúc', inp('flash.endsAt', C.flash.endsAt ? new Date(new Date(C.flash.endsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', '', 'type="datetime-local"'), 'half')}`, 'ct-flash')}
        ${card('Dải cam kết (cuối mọi trang)', '', items4('benefits', pad(C.benefits, 4, () => ({}))), 'ct-benefits')}
        ${card('Khung "Chính sách bán hàng" (trang sản phẩm)', '', items4('salesPolicy', pad(C.salesPolicy, 4, () => ({}))), 'ct-policy')}
        ${card('Ô "Nhận ưu đãi" (cuối mọi trang)', 'Email khách đăng ký được lưu vào Khách hàng tiềm năng (loại "Nhận tin").', `
          ${f('Tiêu đề', inp('newsletter.title', C.newsletter.title), 'half')}${f('Dòng phụ', inp('newsletter.sub', C.newsletter.sub), 'half')}`, 'ct-news')}
        <section class="ad-card" id="ct-ranges"><div class="ad-card-head"><h3>Mức lọc giá (trang danh mục, tìm kiếm)</h3><button type="button" class="btn btn-light btn-sm" data-add="ranges">${ic('plus')} Thêm mức giá</button></div>
          <p class="muted">Đơn vị: triệu đồng. Để trống ô "Đến" cho mức cao nhất (vd Trên 30 triệu).</p><div class="tr-list" data-list="ranges">${ranges.map(rangeRow).join('')}</div></section>
        <section class="ad-card" id="ct-bundles"><div class="ad-card-head"><h3>Phụ kiện gợi ý mua kèm (giỏ hàng)</h3><button type="button" class="btn btn-light btn-sm" data-add="bundles">${ic('plus')} Thêm phụ kiện</button></div>
          <p class="muted">Khi giỏ hàng có máy lạnh thuộc loại & công suất phù hợp, giỏ hàng gợi ý thêm phụ kiện (chỉ gợi ý phụ kiện khách chưa thêm).</p><div class="tr-list" data-list="bundles">${bundles.map(bundleRow).join('')}</div></section>
        <div class="ad-form-foot"><button class="btn btn-primary">${ic('check')} Lưu nội dung</button>
          <button type="button" class="btn btn-light" id="ct-reset">${ic('refresh')} Khôi phục nội dung mặc định</button>
          <a class="btn btn-light" href="../frontend/index.html" target="_blank" rel="noopener">${ic('eye')} Xem trang chủ</a></div>
      </form>`;

    const form = el.querySelector('#ct-form');
    const ROWS = { ranges: rangeRow, bundles: bundleRow };
    form.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) form.querySelector(`[data-list="${add.dataset.add}"]`).insertAdjacentHTML('beforeend', ROWS[add.dataset.add]());
      const row = e.target.closest('.tr-row');
      if (row && e.target.closest('[data-del]')) row.remove();
      if (row && e.target.closest('[data-up]') && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
    });

    // Gom các ô name="a.0.b" thành object lồng nhau
    const collect = () => {
      const out = {};
      form.querySelectorAll('[name]').forEach((x) => {
        const path = x.name.split('.');
        let o = out;
        path.forEach((k, i) => {
          const last = i === path.length - 1;
          const nextIsIdx = !last && /^\d+$/.test(path[i + 1]);
          if (last) o[k] = x.value.trim();
          else o = o[k] = o[k] || (nextIsIdx ? [] : {});
        });
      });
      return out;
    };
    const badUrl = (h) => h && !/^(https?:\/\/|[a-z0-9-]+\.html|#|\/|tel:|mailto:)/i.test(h);

    const save = async (home, catalog, msg) => {
      await run(form.querySelector('.ad-form-foot .btn-primary'), async () => {
        for (const [key, value] of [['home', home], ['catalog', catalog]]) {
          const row = await AD.db.get('settings', key);
          await (row ? AD.db.update('settings', key, { value }) : AD.db.insert('settings', { key, value }));
        }
      }, msg);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = collect();
      const hrefs = [...v.mini.map((m) => m.href), v.story.btnHref, v.story.linkHref, v.b2b.btnHref];
      if (hrefs.some(badUrl)) { AD.ui.toast('Liên kết không hợp lệ: dùng tên trang (vd khuyen-mai.html) hoặc địa chỉ bắt đầu bằng https://', 'error'); return; }
      v.b2b.points = v.b2b.points.filter(Boolean);
      v.story.stats = v.story.stats.filter((x) => x.value);
      v.b2b.stats = v.b2b.stats.filter((x) => x.value);
      v.benefits = v.benefits.filter((x) => x.title);
      v.salesPolicy = v.salesPolicy.filter((x) => x.title);
      v.flash.endsAt = v.flash.endsAt ? new Date(v.flash.endsAt).toISOString() : '';
      // Mức lọc giá
      const rows = (k) => [...form.querySelectorAll(`[data-list="${k}"] .tr-row`)];
      const num = (x) => (x === '' || x == null ? null : Number(x));
      const priceRanges = rows('ranges').map((r) => {
        const g = (k) => r.querySelector(`[data-k="${k}"]`).value.trim();
        const min = num(g('min')); const max = num(g('max'));
        return { label: g('label'), min: Math.round((min || 0) * 1e6), max: max == null ? null : Math.round(max * 1e6) };
      }).filter((r) => r.label);
      if (priceRanges.some((r) => r.max != null && r.max <= r.min)) { AD.ui.toast('Mức lọc giá: giá "Đến" phải lớn hơn giá "Từ"', 'error'); return; }
      priceRanges.forEach((r) => { r.v = `${r.min / 1e6}-${r.max == null ? '' : r.max / 1e6}`; });
      if (!priceRanges.length) { AD.ui.toast('Cần ít nhất 1 mức lọc giá', 'error'); return; }
      // Phụ kiện mua kèm
      const bundlesOut = rows('bundles').map((r) => {
        const g = (k) => r.querySelector(`[data-k="${k}"]`).value.trim();
        const o = { sku: g('sku'), note: g('note'), subs: [...r.querySelectorAll('[data-sub]:checked')].map((x) => x.dataset.sub) };
        if (g('minHp') !== '') o.minHp = Number(g('minHp'));
        if (g('maxHp') !== '') o.maxHp = Number(g('maxHp'));
        return o;
      }).filter((b) => b.sku);
      if (bundlesOut.some((b) => !b.subs.length)) { AD.ui.toast('Phụ kiện mua kèm: chọn ít nhất 1 loại máy lạnh áp dụng', 'error'); return; }
      await save(v, { priceRanges, bundles: bundlesOut }, 'Đã lưu nội dung website');
    });

    el.querySelector('#ct-reset').addEventListener('click', async () => {
      if (!confirm('Khôi phục toàn bộ nội dung, mức lọc giá và phụ kiện mua kèm về mặc định?')) return;
      await save({}, {}, 'Đã khôi phục nội dung mặc định');
      AD.pages.content(params, el);
    });
  };
})();
