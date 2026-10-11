// Công cụ tính công suất máy lạnh: BTU theo diện tích + trần + nắng + số người + loại phòng,
// gợi ý HP / loại máy, ước tính tiền điện Inverter vs thường, sản phẩm phù hợp, form khảo sát miễn phí.
DT.calc = (() => {
  // Bậc công suất phổ biến (BTU/h -> nhãn HP như trong danh mục sản phẩm)
  const STEPS = [[9000, '1 HP'], [12000, '1.5 HP'], [18000, '2 HP'], [24000, '2.5 HP'], [28000, '3 HP'], [36000, '4 HP'], [48000, '5 HP']];
  const ROOM = {
    ngu: { k: 1, label: 'Phòng ngủ' },
    khach: { k: 1.05, label: 'Phòng khách' },
    vanphong: { k: 1.15, label: 'Văn phòng' },
    kinhdoanh: { k: 1.3, label: 'Cửa hàng / quán ăn' },
  };
  const PRICE_KWH = 3000; // đ/kWh (ước tính bậc 4 – 5 giá điện sinh hoạt)

  // Tính nhu cầu làm lạnh (BTU/h) và gợi ý
  // height: hệ số chiều cao trần (1 = trần 2,7 – 3,2 m)
  function compute({ area, height = 1, sun = 1, people = 2, room = 'ngu', hours = 8 }) {
    area = Math.min(Math.max(Number(area) || 0, 0), 500);
    const base = area * 600 * (Number(height) || 1);
    const btu = Math.round((base * Number(sun) * (ROOM[room]?.k || 1) + Math.max(0, (Number(people) || 0) - 2) * 500) / 100) * 100;
    // Máy treo tường tối đa 3 HP; lớn hơn -> âm trần / tủ đứng 4 – 5 HP; vượt 5 HP -> chia nhiều máy
    const step = STEPS.find(([b]) => b >= btu * 0.95) || null; // cho phép thiếu 5% (sai số tính toán)
    let units = 1; let pick = step;
    if (!step) { units = Math.ceil(btu / 48000); pick = STEPS.find(([b]) => b >= btu / units * 0.95) || STEPS[STEPS.length - 1]; }
    const [stepBtu, hp] = pick;
    const sub = stepBtu <= 28000 && units === 1 ? 'treo-tuong' : 'am-tran';
    // Điện năng (kW) như thông số danh mục: Inverter 0.82, máy thường 1.1 kW / 12.000 BTU; Inverter chạy trung bình ~80% công suất định mức
    const kwInv = (stepBtu / 12000) * 0.82 * units; const kwStd = (stepBtu / 12000) * 1.1 * units;
    const h = Math.min(Math.max(Number(hours) || 8, 1), 24);
    const costInv = Math.round(kwInv * 0.8 * h * 30 * PRICE_KWH / 1000) * 1000;
    const costStd = Math.round(kwStd * h * 30 * PRICE_KWH / 1000) * 1000;
    return { btu, stepBtu, hp, units, sub, big: stepBtu > 28000 || units > 1, costInv, costStd, saveYear: (costStd - costInv) * 12, hours: h };
  }

  return { compute, STEPS, ROOM };
})();

DT.onReady(() => {
  const { $, $$, esc, money } = DT.u;
  const form = $('#calc-form');
  const fmt = (n) => Number(n).toLocaleString('vi-VN');

  // Khôi phục từ link chia sẻ (?dt=20&tran=3&nang=1.2&nguoi=3&phong=khach&gio=8)
  const q = new URLSearchParams(location.search);
  const setRadio = (name, v) => { const el = $(`[name=${name}][value="${v}"]`, form); if (el) el.checked = true; };
  if (q.get('dt')) form.area.value = q.get('dt');
  if (q.get('tran')) form.height.value = q.get('tran');
  if (q.get('nang')) setRadio('sun', q.get('nang'));
  if (q.get('phong')) setRadio('room', q.get('phong'));
  if (q.get('nguoi')) form.people.value = q.get('nguoi');
  if (q.get('gio')) form.hours.value = q.get('gio');
  form.areaRange.value = Math.min(120, Math.max(5, Number(form.area.value) || 18));

  const read = () => ({
    area: parseFloat(String(form.area.value).replace(',', '.')), height: form.height.value, sun: form.sun.value,
    people: form.people.value, room: form.room.value, hours: form.hours.value,
  });
  let last = null;

  function render() {
    const v = read();
    const ok = v.area >= 3 && v.area <= 500;
    form.area.closest('.field').classList.toggle('invalid', !ok);
    if (!ok) { $('#calc-result').innerHTML = '<div class="calc-card"><p class="muted">Nhập diện tích phòng (3 – 500 m²) để xem kết quả.</p></div>'; return; }
    const r = DT.calc.compute(v);
    last = { ...r, input: v };
    const typeLabel = r.sub === 'treo-tuong' ? 'Máy lạnh treo tường' : 'Máy lạnh âm trần / tủ đứng';
    $('#calc-result').innerHTML = `<div class="calc-card">
      <small class="calc-k">Công suất nên chọn</small>
      <div class="calc-hp">${r.units > 1 ? `${r.units} máy × ` : ''}${esc(r.hp)}</div>
      <p class="calc-btu">Nhu cầu làm lạnh ~ <b>${fmt(r.btu)} BTU/h</b> • ${r.units > 1 ? `${r.units} máy ` : ''}${fmt(r.stepBtu)} BTU/h</p>
      <p class="calc-type">${DT.icon('snow')} ${typeLabel}${r.big ? ' — nên khảo sát thực tế để bố trí dàn lạnh hợp lý' : ''}</p>
      <div class="calc-bill">
        <div><small>Tiền điện ước tính / tháng</small><b>${money(r.costInv)}</b><span>Máy Inverter</span></div>
        <div><small>&nbsp;</small><b class="muted-b">${money(r.costStd)}</b><span>Máy thường (Non-Inverter)</span></div>
      </div>
      ${r.saveYear > 0 ? `<p class="calc-save">${DT.icon('zap')}<span>Chọn Inverter tiết kiệm khoảng <b>${money(r.saveYear)}/năm</b> (dùng ${r.hours} giờ/ngày, ~${fmt(3000)}đ/kWh).</span></p>` : ''}
      <div class="calc-actions">
        <a class="btn btn-accent" href="#calc-products">Xem máy ${esc(r.hp)} phù hợp</a>
        <button type="button" class="btn btn-light" id="calc-share">${DT.icon('share')} Chia sẻ kết quả</button>
      </div>
      <small class="muted">Kết quả tham khảo cho điều kiện thông thường. Đặt lịch khảo sát miễn phí bên dưới để được tính chính xác.</small>
    </div>`;
    // Sản phẩm phù hợp: đúng công suất (ưu tiên đúng loại máy), Inverter trước
    const all = DT.products.filter((p) => p.cat === 'may-lanh' && p.attrs?.capacity === r.hp);
    const list = [...all.filter((p) => p.sub === r.sub), ...all.filter((p) => p.sub !== r.sub)]
      .sort((a, b) => (b.attrs.tech === 'Inverter') - (a.attrs.tech === 'Inverter') || b.sold - a.sold).slice(0, 4);
    $('#calc-products-title').textContent = `Máy lạnh ${r.hp} phù hợp`;
    $('#calc-products-more').href = `danh-muc.html?cat=may-lanh&capacity=${encodeURIComponent(r.hp)}`;
    $('#calc-products-list').innerHTML = list.length ? DT.ui.grid(list)
      : `<p class="muted">Chưa có sẵn mẫu ${esc(r.hp)} trên website. <a class="link" href="bao-gia-du-an.html">Gửi yêu cầu báo giá</a> để được tư vấn mẫu phù hợp.</p>`;
  }

  form.addEventListener('input', (e) => {
    if (e.target.name === 'areaRange') form.area.value = e.target.value;
    if (e.target.name === 'area') form.areaRange.value = Math.min(120, Math.max(5, Number(e.target.value) || 5));
    render();
  });
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());

  $('#calc-result').addEventListener('click', async (e) => {
    if (!e.target.closest('#calc-share')) return;
    const v = read();
    const url = new URL(location.href.split('?')[0]);
    url.search = new URLSearchParams({ dt: v.area, tran: v.height, nang: v.sun, nguoi: v.people, phong: v.room, gio: v.hours }).toString();
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: url.href });
      else { await navigator.clipboard.writeText(url.href); DT.u.toast('Đã sao chép liên kết kết quả'); }
    } catch { /* người dùng hủy */ }
  });

  $$('.calc-lead .check-list li').forEach((li) => li.insertAdjacentHTML('afterbegin', DT.icon('check')));
  const lf = $('#calc-lead-form');
  lf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = lf.querySelector('[type=submit]');
    if (btn.disabled) return;
    const d = DT.u.formData(lf);
    if (!d) { if (!lf.consent.checked) DT.u.toast('Vui lòng tick đồng ý để chúng tôi liên hệ', 'error'); return; }
    const r = last;
    btn.disabled = true;
    let lead;
    try {
      lead = await DT.saveLead('service', {
        service: 'Khảo sát & tư vấn chọn công suất máy lạnh', name: d.name.trim(), phone: d.phone.replace(/[\s.]/g, ''), address: d.address,
        note: r ? `Kết quả công cụ: ${DT.calc.ROOM[r.input.room]?.label || ''} ${r.input.area} m², trần ${$('#c-height').selectedOptions[0]?.textContent || ''}, nắng x${r.input.sun}, ${r.input.people} người → ${r.units > 1 ? `${r.units} máy × ` : ''}${r.hp} (~${fmt(r.btu)} BTU/h)` : '',
        qty: r ? String(r.units) : '',
      });
    } catch (err) { DT.u.toast(err.message, 'error'); btn.disabled = false; return; }
    lf.reset(); btn.disabled = false;
    DT.sales.leadSuccess(lead, 'Đã nhận yêu cầu khảo sát!');
  });

  render();

  // SEO: câu hỏi thường gặp (FAQPage) cho Google & trợ lý AI
  DT.u.jsonLd({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: $$('#calc-faq details').map((d) => ({ '@type': 'Question', name: d.querySelector('summary').textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p').textContent.trim() } })),
  });
});
