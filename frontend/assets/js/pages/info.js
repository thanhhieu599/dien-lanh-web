// Trang thông tin: liên hệ, dịch vụ, báo giá dự án, hệ thống cửa hàng, chính sách.
// Các form lưu "lead" vào localStorage (giai đoạn 2 gửi về API -> CRM trong trang quản trị).
DT.saveLead = (type, data) => {
  const KEY = 'dt_leads_v1';
  let leads = [];
  try { leads = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* bỏ qua */ }
  const lead = { id: 'L' + Date.now().toString().slice(-8), type, data, createdAt: new Date().toISOString(), status: 'new' };
  leads.unshift(lead);
  try { localStorage.setItem(KEY, JSON.stringify(leads)); } catch { /* bỏ qua */ }
  return lead;
};

document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc, money } = DT.u;
  const page = document.body.dataset.page;

  // Gắn xử lý cho mọi form có data-lead
  $$('form[data-lead]').forEach((form) => {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = DT.u.formData(form);
      if (!d) { DT.u.toast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error'); return; }
      const lead = DT.saveLead(form.dataset.lead, d);
      form.reset();
      DT.ui.modal(`<div style="text-align:center"><div class="success-ic">${DT.icon('check')}</div>
        <h3>${esc(form.dataset.success || 'Gửi yêu cầu thành công!')}</h3>
        <p class="muted">Mã yêu cầu: <b>${lead.id}</b>. Chúng tôi sẽ liên hệ lại trong vòng 30 phút (giờ làm việc). Cần gấp vui lòng gọi <a class="link" href="tel:${DT.config.hotline.replace(/\s/g, '')}">${DT.config.hotline}</a>.</p>
        <button class="btn btn-primary" data-close>Đóng</button></div>`);
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
    if (d) d.min = new Date().toISOString().slice(0, 10);
  }

  if (page === 'stores') {
    const cities = [...new Set(DT.stores.map((s) => s.city))];
    const sel = $('#city');
    sel.innerHTML = `<option value="">Tất cả tỉnh/thành</option>${cities.map((c) => `<option>${esc(c)}</option>`).join('')}`;
    const showMap = (s) => { $('#map').innerHTML = `<iframe title="Bản đồ ${esc(s.name)}" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(s.address + ', ' + s.city)}&z=15&output=embed"></iframe>`; };
    const render = () => {
      const list = DT.stores.filter((s) => !sel.value || s.city === sel.value);
      $('#store-list').innerHTML = list.map((s, i) => `<div class="store-card ${i === 0 ? 'active' : ''}" data-store="${s.id}"><span class="svc-ic">${DT.icon('pin')}</span><div>
        <h3>${esc(s.name)}</h3><p>${DT.icon('pin')}${esc(s.address)}, ${esc(s.city)}</p><p>${DT.icon('phone')}<a href="tel:${s.phone.replace(/\s/g, '')}">${s.phone}</a></p><p>${DT.icon('clock')}${s.hours} (cả CN)</p>
        <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address + ', ' + s.city)}">Chỉ đường ${DT.icon('right')}</a></div></div>`).join('');
      if (list[0]) showMap(list[0]);
    };
    sel.addEventListener('change', render);
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
    DT.u.setMeta({ title: pol.title, description: `${pol.title} khi mua hàng tại ${DT.config.name}.` });
    $('#crumb').outerHTML = DT.ui.breadcrumb([{ label: 'Chính sách' }, { label: pol.title }]);
    $('#policy').innerHTML = `<div class="policy-layout">
      <nav class="policy-nav">${Object.entries(DT.policies).map(([k, v]) => `<a href="chinh-sach.html?type=${k}" class="${k === type ? 'active' : ''}">${esc(v.title)}</a>`).join('')}</nav>
      <article class="article"><h1>${esc(pol.title)}</h1><div class="rich">${pol.body}</div>
      <p class="muted">Mọi thắc mắc vui lòng liên hệ hotline <a class="link" href="tel:${DT.config.hotline.replace(/\s/g, '')}">${DT.config.hotline}</a> hoặc email ${DT.config.email}.</p></article></div>`;
  }
});
