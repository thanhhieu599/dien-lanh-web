// Công cụ tăng chuyển đổi dùng chung mọi trang:
//  - DT.saveLead: lưu yêu cầu khách (database hoặc trình duyệt ở chế độ demo)
//  - DT.u.isOpen / DT.u.callbackText: giờ làm việc & hẹn giờ gọi lại (trong giờ / ngoài giờ)
//  - DT.sales.quote: form "Nhận báo giá doanh nghiệp" (1 sản phẩm hoặc cả giỏ hàng)
//  - DT.sales.bundle: phụ kiện mua kèm cho máy lạnh (combo lắp đặt trọn gói)
//  - Khung chat: Zalo / Messenger / gọi hotline / để lại số gọi lại
window.DT = window.DT || {};

DT.saveLead = async (type, data) => {
  if (DT.backend?.enabled) return DT.backend.rpc('submit_lead', { p_type: type, p_data: data, p_source_url: location.href });
  const KEY = 'dt_leads_v1';
  let leads = [];
  try { leads = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* bỏ qua */ }
  const lead = { id: 'L' + Date.now().toString().slice(-8), type, data, createdAt: new Date().toISOString(), status: 'new' };
  leads.unshift(lead);
  try { localStorage.setItem(KEY, JSON.stringify(leads)); } catch { /* bỏ qua */ }
  return lead;
};

// ---------------------------------------------------------------- Giờ làm việc (giờ Việt Nam)
(() => {
  const toH = (h, m) => Number(h) + Number(m || 0) / 60;
  // Đọc từ cấu hình: openTime/closeTime ('07:30') hoặc chuỗi workingHours ('7:30 - 21:30 (...)')
  DT.u.hours = () => {
    const c = DT.config || {};
    const t = (s) => { const m = String(s || '').match(/^(\d{1,2})[:h](\d{2})?/); return m ? toH(m[1], m[2]) : null; };
    let open = t(c.openTime); let close = t(c.closeTime);
    if (open == null || close == null) {
      const m = String(c.workingHours || '').match(/(\d{1,2})[:h](\d{2})?\s*[-–]\s*(\d{1,2})[:h](\d{2})?/);
      if (m) { open = toH(m[1], m[2]); close = toH(m[3], m[4]); }
    }
    return { open: open ?? 7.5, close: close ?? 21.5 };
  };
  DT.u.vnHour = (d = new Date()) => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
    return toH(p.find((x) => x.type === 'hour').value, p.find((x) => x.type === 'minute').value);
  };
  DT.u.isOpen = (d) => { const h = DT.u.vnHour(d); const { open, close } = DT.u.hours(); return h >= open && h < close; };
  const fmt = (h) => `${Math.floor(h)}h${Math.round((h % 1) * 60) ? String(Math.round((h % 1) * 60)).padStart(2, '0') : ''}`;
  // Cam kết gọi lại: trong giờ -> 15 phút; ngoài giờ -> trước (giờ mở cửa + 1,5h) sáng nay / sáng mai
  DT.u.callbackText = (d) => {
    if (DT.u.isOpen(d)) return 'Chuyên viên sẽ gọi lại cho bạn trong vòng 15 phút.';
    const { open } = DT.u.hours();
    const by = fmt(Math.min(open + 1.5, 12));
    return `Hiện đã ngoài giờ làm việc. Chuyên viên sẽ gọi lại cho bạn trước ${by} sáng ${DT.u.vnHour(d) < open ? 'nay' : 'mai'}.`;
  };
})();

DT.sales = (() => {
  const { esc, money } = DT.u;

  // Thông báo gửi yêu cầu thành công (dùng chung các form)
  function leadSuccess(lead, title = 'Gửi yêu cầu thành công!') {
    DT.ui.modal(`<div style="text-align:center"><div class="success-ic">${DT.icon('check')}</div>
      <h3>${esc(title)}</h3>
      <p>Mã yêu cầu: <b>${esc(lead.code || lead.id)}</b></p>
      <p class="muted cb-text">${esc(DT.u.callbackText())} Cần gấp vui lòng gọi <a class="link" href="tel:${DT.u.tel(DT.config.hotline)}">${esc(DT.config.hotline)}</a>.</p>
      <button class="btn btn-primary" data-close>Đóng</button></div>`);
  }

  // ---------------------------------------------------------------- Báo giá doanh nghiệp
  // lines: [{ product, qty }]
  function quote(lines, { title = 'Nhận báo giá doanh nghiệp' } = {}) {
    const one = lines.length === 1;
    const p0 = lines[0]?.product;
    const m = DT.ui.modal(`<form class="quote-form" novalidate>
      <h3>${esc(title)}</h3>
      <p class="muted">Giá sỉ theo số lượng, xuất hóa đơn VAT, công nợ cho doanh nghiệp. ${esc(DT.u.isOpen() ? 'Báo giá trong 2 giờ làm việc.' : 'Báo giá trong buổi sáng ngày làm việc kế tiếp.')}</p>
      <div class="quote-items">${lines.map(({ product: p, qty }) => `<div class="qi"><span class="qi-img">${DT.productImage(p, 0)}</span><span class="qi-name"><b>${esc(p.name)}</b><small>Mã: ${esc(p.sku)} • Giá lẻ ${money(p.price)}</small></span>
        ${one ? `<label class="qi-qty"><small>Số lượng</small><input name="qty" type="number" min="1" max="100000" value="${Math.max(qty, 1)}" required></label>` : `<b class="qi-n">x${qty}</b>`}</div>`).join('')}</div>
      <div class="form-row">
        <div class="field"><label>Tên công ty <span class="req">*</span></label><input name="company" required autocomplete="organization"><div class="err">Vui lòng nhập tên công ty</div></div>
        <div class="field"><label>Người liên hệ <span class="req">*</span></label><input name="name" required autocomplete="name"><div class="err">Vui lòng nhập họ tên</div></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Số điện thoại <span class="req">*</span></label><input name="phone" type="tel" required data-validate="phone" autocomplete="tel"><div class="err">Số điện thoại không hợp lệ</div></div>
        <div class="field"><label>Email nhận báo giá</label><input name="email" type="email" autocomplete="email"><div class="err">Email không hợp lệ</div></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Địa điểm lắp đặt / giao hàng</label><input name="address" placeholder="VD: KCN Tân Thuận, Q7"></div>
        <div class="field"><label>Thời gian cần hàng</label><select name="deadline"><option>Trong tuần này</option><option>Trong 2 - 4 tuần</option><option>Trên 1 tháng</option><option>Đang lập dự toán</option></select></div>
      </div>
      <div class="field"><label>Yêu cầu thêm</label><textarea name="note" rows="2" placeholder="VD: cần kèm lắp đặt, bảo trì định kỳ, công nợ 30 ngày…"></textarea></div>
      <label class="check consent"><input type="checkbox" name="consent" required> <span>Tôi đồng ý để ${esc(DT.config.name)} liên hệ và xử lý thông tin theo <a class="link" href="${DT.api.policyUrl('bao-mat')}" target="_blank">chính sách bảo mật</a></span></label>
      <button class="btn btn-accent btn-block btn-lg" type="submit">GỬI YÊU CẦU BÁO GIÁ</button>
    </form>`, 'modal-lg quote-modal');
    const form = m.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      if (btn.disabled) return;
      const d = DT.u.formData(form);
      if (!d) { if (!form.consent.checked) DT.u.toast('Vui lòng tick đồng ý để chúng tôi liên hệ báo giá', 'error'); return; }
      if (d.email && !DT.u.validEmail(d.email)) { form.email.closest('.field').classList.add('invalid'); return; }
      const qtyOf = (l) => (one ? Math.max(1, parseInt(d.qty, 10) || 1) : l.qty);
      const items = lines.map((l) => `${l.product.name} (${l.product.sku}) - Số lượng: ${qtyOf(l)}`).join('\n');
      const total = lines.reduce((s, l) => s + qtyOf(l), 0);
      btn.disabled = true;
      let lead;
      try {
        lead = await DT.saveLead('b2b-quote', {
          company: d.company.trim(), name: d.name.trim(), phone: d.phone.replace(/[\s.]/g, ''), email: d.email, address: d.address,
          items, qty: String(total), sku: lines.map((l) => l.product.sku).join(', '), projectType: one ? 'Mua số lượng (trang sản phẩm)' : 'Báo giá cả giỏ hàng',
          note: [d.deadline && `Cần hàng: ${d.deadline}`, d.note].filter(Boolean).join('. '),
        });
      } catch (err) { DT.u.toast(err.message, 'error'); btn.disabled = false; return; }
      leadSuccess(lead, 'Đã nhận yêu cầu báo giá!');
    });
    // Đưa con trỏ vào ô đầu tiên, trừ khi khách đã bấm vào ô khác (tránh kéo con trỏ khi đang gõ)
    setTimeout(() => { if (!form.contains(document.activeElement)) form.company.focus(); }, 50);
    return { form, product: p0 };
  }

  // ---------------------------------------------------------------- Phụ kiện mua kèm (máy lạnh)
  const hpOf = (p) => parseFloat(String(p.attrs?.capacity || '').replace(',', '.')) || 0;
  function bundle(p) {
    if (p.cat !== 'may-lanh') return [];
    const hp = hpOf(p);
    return (DT.bundleRules || [])
      .filter((r) => (!r.subs || r.subs.includes(p.sub)) && (r.maxHp == null || hp <= r.maxHp) && (r.minHp == null || hp >= r.minHp))
      .map((r) => ({ ...r, product: DT.products.find((x) => x.sku === r.sku) }))
      .filter((r) => r.product && r.product.id !== p.id);
  }

  // ---------------------------------------------------------------- Khung chat
  const hm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  const hoursLabel = () => { const { open, close } = DT.u.hours(); return `${hm(open)} – ${hm(close)}`; };
  function chatInit() {
    const panel = document.getElementById('chat-panel');
    if (!panel || panel.dataset.bound) return;
    panel.dataset.bound = '1';
    const launcher = document.getElementById('fl-chat');
    const status = () => {
      const open = DT.u.isOpen();
      panel.classList.toggle('offline', !open);
      panel.querySelector('.cp-status').textContent = open
        ? 'Đang trực tuyến • phản hồi trong 5 phút'
        : `Ngoài giờ làm việc (${hoursLabel()}) • để lại số, chúng tôi gọi lại`;
    };
    const toggle = (on) => {
      const show = on ?? !panel.classList.contains('show');
      if (show) status();
      panel.classList.toggle('show', show);
      launcher?.setAttribute('aria-expanded', String(show));
      document.getElementById('chat-teaser')?.remove();
      try { sessionStorage.setItem('dt_chat_seen', '1'); } catch { /* bỏ qua */ }
      if (show) setTimeout(() => panel.querySelector('[name=phone]')?.focus({ preventScroll: true }), 150);
    };
    launcher?.addEventListener('click', () => toggle());
    panel.querySelector('.cp-x').addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('show')) toggle(false); });
    const form = panel.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      if (btn.disabled) return;
      const d = DT.u.formData(form);
      if (!d) return;
      btn.disabled = true;
      let lead;
      try {
        lead = await DT.saveLead('contact', {
          name: (d.name || '').trim() || 'Khách (khung chat)', phone: d.phone.replace(/[\s.]/g, ''), topic: d.topic,
          message: `Yêu cầu gọi lại từ khung chat${DT.u.isOpen() ? '' : ' (ngoài giờ)'} – trang: ${document.title}`,
        });
      } catch (err) { DT.u.toast(err.message, 'error'); btn.disabled = false; return; }
      form.innerHTML = `<div class="cp-done">${DT.icon('check')}<b>Đã nhận yêu cầu ${esc(lead.code || lead.id)}</b><p>${esc(DT.u.callbackText())}</p></div>`;
    });
    // Lời chào gợi mở (1 lần / phiên, không làm phiền trình duyệt tự động)
    let seen = false;
    try { seen = !!sessionStorage.getItem('dt_chat_seen'); } catch { /* bỏ qua */ }
    if (!seen && !navigator.webdriver && launcher) {
      setTimeout(() => {
        if (panel.classList.contains('show') || document.getElementById('chat-teaser')) return;
        const t = document.createElement('button');
        t.id = 'chat-teaser'; t.className = 'chat-teaser'; t.type = 'button';
        t.innerHTML = `<b>Cần tư vấn chọn máy?</b><span>${DT.u.isOpen() ? 'Chuyên viên đang trực, hỏi ngay nhé!' : 'Để lại số, chúng tôi gọi lại sáng mai.'}</span>`;
        t.addEventListener('click', () => toggle(true));
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 12000);
      }, 30000);
    }
  }

  // Nút mở khung chat (nằm trong cụm nút nổi) và khung chat (layout.js chèn vào cuối trang)
  const chatButton = () => `<button class="fl-chat" id="fl-chat" aria-label="Chat với tư vấn viên" aria-controls="chat-panel" aria-expanded="false">${DT.icon('chat')}<span class="fl-dot"></span></button>`;
  function chatHtml() {
    const c = DT.config;
    const opts = ['Tư vấn chọn máy lạnh / thiết bị', 'Báo giá cho doanh nghiệp / dự án', 'Lắp đặt, vệ sinh, sửa chữa', 'Kiểm tra đơn hàng', 'Khác'];
    return `<section class="chat-panel" id="chat-panel" aria-label="Hỗ trợ trực tuyến">
      <header class="cp-head"><span class="cp-av">${DT.icon('headset')}</span><span><b>Hỗ trợ khách hàng</b><small class="cp-status"></small></span><button type="button" class="cp-x" aria-label="Đóng">${DT.icon('close')}</button></header>
      <div class="cp-body">
        <p class="cp-hi">Xin chào 👋 Bạn cần tư vấn sản phẩm, báo giá hay đặt lịch kỹ thuật? Chọn cách liên hệ thuận tiện nhất:</p>
        <div class="cp-channels">
          ${c.zalo ? `<a class="cp-ch cp-zalo" href="${esc(DT.u.safeUrl(c.zalo))}" target="_blank" rel="noopener"><span>Zalo</span>Chat Zalo</a>` : ''}
          ${c.messenger ? `<a class="cp-ch cp-mess" href="${esc(DT.u.safeUrl(c.messenger))}" target="_blank" rel="noopener">${DT.icon('chat')}Messenger</a>` : ''}
          ${c.hotline ? `<a class="cp-ch cp-call" href="tel:${DT.u.tel(c.hotline)}">${DT.icon('phone')}${esc(c.hotline)}</a>` : ''}
        </div>
        <form class="cp-form" novalidate>
          <p class="cp-or">hoặc để lại số điện thoại, chúng tôi gọi lại</p>
          <div class="field"><input name="phone" type="tel" required data-validate="phone" placeholder="Số điện thoại *" autocomplete="tel" aria-label="Số điện thoại"><div class="err">Số điện thoại không hợp lệ</div></div>
          <div class="form-row"><div class="field"><input name="name" placeholder="Tên của bạn" autocomplete="name" aria-label="Tên của bạn"></div>
          <div class="field"><select name="topic" aria-label="Nhu cầu">${opts.map((o) => `<option>${o}</option>`).join('')}</select></div></div>
          <button class="btn btn-primary btn-block" type="submit">Gọi lại cho tôi</button>
          <small class="cp-note">Bằng việc gửi, bạn đồng ý để chúng tôi liên hệ theo <a class="link" href="${DT.api.policyUrl('bao-mat')}" target="_blank">chính sách bảo mật</a>.</small>
        </form>
      </div>
    </section>`;
  }

  return { leadSuccess, quote, bundle, chatInit, chatHtml, chatButton, hpOf };
})();

DT.onReady(() => DT.sales.chatInit());
