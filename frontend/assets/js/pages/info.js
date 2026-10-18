// Trang thông tin: liên hệ, dịch vụ, báo giá dự án, hệ thống cửa hàng, chính sách.
// Các form gửi "lead" qua DT.saveLead (components/sales.js) -> CRM trong trang quản trị.

DT.onReady(() => {
  const { $, $$, esc, money } = DT.u;
  const page = document.body.dataset.page;

  // Gắn xử lý cho mọi form có data-lead
  $$('form[data-lead]').forEach((form) => {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = DT.u.formData(form);
      if (!d) { DT.u.toast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error'); return; }
      const btn = form.querySelector('button:not([type=button])');
      if (btn.disabled) return;
      btn.disabled = true;
      let lead;
      try { lead = await DT.saveLead(form.dataset.lead, d); } catch (err) { DT.u.toast(err.message, 'error'); return; } finally { btn.disabled = false; }
      form.reset();
      DT.sales.leadSuccess(lead, form.dataset.success || 'Gửi yêu cầu thành công!');
    });
  });

  // Điền sẵn dữ liệu từ URL (vd: ?svc=ve-sinh, ?sku=DT1001)
  const svcSel = $('select[name=service]');
  if (svcSel) {
    svcSel.innerHTML = DT.services.map((s) => `<option value="${s.id}">${esc(s.name)}${s.price ? ` - từ ${money(s.price)}` : ''}</option>`).join('');
    if (DT.u.param('svc')) svcSel.value = DT.u.param('svc');
  }
  const prodField = $('textarea[name=items]');
  if (prodField && DT.u.param('sku')) {
    const p = DT.products.find((x) => x.sku === DT.u.param('sku'));
    if (p) prodField.value = `${p.name} (${p.sku}) - Số lượng: `;
  }

  if (page === 'services') {
    $('#svc-list').innerHTML = DT.services.map((s) => `
      <div class="svc"><span class="svc-ic">${DT.icon(s.icon)}</span><div><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p>
      <span class="price">${s.price ? `Từ ${money(s.price)}/${s.unit}` : 'Báo giá theo hợp đồng'}</span>
      <div><button class="btn btn-link" style="padding:0;color:var(--primary)" data-book="${s.id}">Đặt lịch ngay →</button></div></div></div>`).join('');
    $('#svc-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-book]');
      if (!b) return;
      svcSel.value = b.dataset.book;
      $('#book-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const d = $('input[name=date]');
    if (d) d.min = DT.u.today();
  }

  if (page === 'stores') {
    const cities = [...new Set(DT.stores.map((s) => s.city))];
    const sel = $('#city');
    sel.innerHTML = `<option value="">Tất cả tỉnh/thành</option>${cities.map((c) => `<option>${esc(c)}</option>`).join('')}`;
    const showMap = (s) => { $('#map').innerHTML = `<iframe title="Bản đồ ${esc(s.name)}" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(s.address + ', ' + s.city)}&z=15&output=embed"></iframe>`; };
    const render = () => {
      const list = DT.stores.filter((s) => !sel.value || s.city === sel.value);
      $('#store-list').innerHTML = list.map((s, i) => `<div class="store-card ${i === 0 ? 'active' : ''}" data-store="${s.id}"><span class="svc-ic">${DT.icon('pin')}</span><div>
        <h3>${esc(s.name)}</h3><p>${DT.icon('pin')}${esc(s.address)}, ${esc(s.city)}</p>${s.phone ? `<p>${DT.icon('phone')}<a href="tel:${DT.u.tel(s.phone)}">${esc(s.phone)}</a></p>` : ''}${s.hours ? `<p>${DT.icon('clock')}${esc(s.hours)}</p>` : ''}
        <span class="store-links"><a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address + ', ' + s.city)}">Chỉ đường ${DT.icon('right')}</a>
        <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.address}, ${s.city}`)}">Xem &amp; đánh giá trên Google ${DT.icon('right')}</a></span></div></div>`).join('');
      if (list[0]) showMap(list[0]);
    };
    sel.addEventListener('change', render);
    // SEO địa phương: mỗi cửa hàng là 1 doanh nghiệp điện lạnh (khớp với Google Business Profile: cùng tên, địa chỉ, SĐT)
    const hm = (s) => { const m = String(s || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/); return m ? [`${m[1].padStart(2, '0')}:${m[2]}`, `${m[3].padStart(2, '0')}:${m[4]}`] : null; };
    DT.u.jsonLd({
      '@context': 'https://schema.org', '@type': 'ItemList', name: `Hệ thống cửa hàng ${DT.config.name}`,
      itemListElement: DT.stores.map((s, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: {
          '@type': 'HVACBusiness', name: s.name, telephone: s.phone || DT.config.hotline, url: DT.u.abs('he-thong-cua-hang.html'),
          address: { '@type': 'PostalAddress', streetAddress: s.address, addressRegion: s.city, addressCountry: 'VN' },
          ...(hm(s.hours) ? { openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: hm(s.hours)[0], closes: hm(s.hours)[1] }] } : {}),
          parentOrganization: { '@type': 'Organization', name: DT.config.company || DT.config.name },
        },
      })),
    });
    $('#store-list').addEventListener('click', (e) => {
      const c = e.target.closest('[data-store]');
      if (!c || e.target.closest('a')) return;
      $$('.store-card').forEach((x) => x.classList.toggle('active', x === c));
      showMap(DT.stores.find((s) => s.id === +c.dataset.store));
    });
    render();
  }

  if (page === 'policy') {
    const type = DT.policies[DT.u.param('type')] ? DT.u.param('type') : 'bao-hanh';
    const pol = DT.policies[type];
    DT.u.setMeta({ title: pol.title, description: `${pol.title} khi mua hàng tại ${DT.config.name}.`, canonical: DT.api.policyUrl(type) });
    $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Chính sách' }, { label: pol.title }]);
    $('#policy').innerHTML = `<div class="policy-layout">
      <nav class="policy-nav">${Object.entries(DT.policies).map(([k, v]) => `<a href="${DT.api.policyUrl(k)}" class="${k === type ? 'active' : ''}">${esc(v.title)}</a>`).join('')}</nav>
      <article class="article"><h1>${esc(pol.title)}</h1><div class="rich">${pol.body}</div>
      <p class="muted">Mọi thắc mắc vui lòng liên hệ hotline <a class="link" href="tel:${DT.u.tel(DT.config.hotline)}">${esc(DT.config.hotline)}</a> hoặc email ${esc(DT.config.email)}.</p></article></div>`;
  }
});
