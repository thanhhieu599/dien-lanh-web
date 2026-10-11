// Thanh toán online qua Edge Function "payments" (supabase/functions/payments):
// VNPay (thẻ ATM / Visa / Master / JCB / QR ngân hàng), ví MoMo, chuyển khoản VietQR (đối soát tự động qua SePay).
window.DT = window.DT || {};

DT.payments = (() => {
  const cfg = DT.BACKEND || {};
  const base = () => `${String(cfg.url || '').replace(/\/+$/, '')}/functions/v1/payments`;
  let cached = null;

  async function call(path, body) {
    let res;
    try {
      res = await fetch(`${base()}/${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('Không kết nối được máy chủ thanh toán, vui lòng kiểm tra mạng');
    }
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline');
    return d;
  }

  // Cổng nào đang bật (quản trị cấu hình khóa trên Supabase). Chế độ demo: không có cổng nào.
  function config() {
    if (!DT.backend?.enabled) return Promise.resolve({ vnpay: false, momo: false, bankAuto: false });
    cached = cached || call('config').catch(() => ({ vnpay: false, momo: false, bankAuto: false }));
    return cached;
  }

  const PROVIDER = { card: 'vnpay', wallet: 'momo' };
  const start = (code, phone, provider) => call('create', { code, phone, provider });
  const verifyReturn = (params) => call('return', { params });

  async function redirect(code, phone, provider) {
    const { payUrl } = await start(code, phone, provider);
    location.href = payUrl;
  }

  // Ảnh QR VietQR: mọi app ngân hàng quét được, tự điền số tiền + nội dung (mã đơn)
  function qrUrl(amount, content) {
    const c = DT.config;
    if (!c.bankBin || !c.bankAccount) return '';
    const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: content, accountName: c.bankOwner || '' });
    return `https://img.vietqr.io/image/${encodeURIComponent(c.bankBin)}-${encodeURIComponent(c.bankAccount)}-compact2.png?${q}`;
  }

  // Khối thanh toán dưới thông tin đơn (trang đặt hàng thành công, tra cứu đơn, kết quả thanh toán)
  function boxHtml(o) {
    const { esc, money } = DT.u;
    if (!o || o.status === 'cancelled' || o.paymentStatus === 'paid') return '';
    if (o.payment === 'bank') {
      const qr = qrUrl(o.total, o.code);
      return `<div class="pay-box">
        <h3>${DT.icon('building')} Chuyển khoản để hoàn tất đơn hàng</h3>
        <div class="pay-qr">${qr ? `<img src="${esc(qr)}" alt="Mã QR chuyển khoản đơn ${esc(o.code)}" width="220" height="220" loading="lazy">` : ''}
          <div class="pay-acc">
            <div><span>Ngân hàng</span><b>${esc(DT.config.bankName)}</b></div>
            <div><span>Số tài khoản</span><b>${esc(DT.config.bankAccount)}</b> <button type="button" class="link" data-copy="${esc(String(DT.config.bankAccount).replace(/\s/g, ''))}">Sao chép</button></div>
            <div><span>Chủ tài khoản</span><b>${esc(DT.config.bankOwner || DT.config.company)}</b></div>
            <div><span>Số tiền</span><b class="price">${money(o.total)}</b></div>
            <div><span>Nội dung</span><b>${esc(o.code)}</b> <button type="button" class="link" data-copy="${esc(o.code)}">Sao chép</button></div>
          </div></div>
        <p class="muted" data-bank-note>Quét mã QR bằng app ngân hàng: số tiền và nội dung được điền sẵn. ${o.paymentStatus === 'partial' ? '<b>Đơn hàng đã nhận thanh toán một phần, vui lòng chuyển phần còn lại hoặc gọi hotline.</b>' : ''}</p>
      </div>`;
    }
    if (o.payment === 'card' || o.payment === 'wallet') {
      return `<div class="pay-box" data-paybox data-code="${esc(o.code)}" data-phone="${esc(o.customer?.phone || '')}" data-method="${o.payment}">
        <h3>${DT.icon('card')} Đơn hàng chưa được thanh toán</h3><p class="muted">Đang kiểm tra cổng thanh toán…</p></div>`;
    }
    return '';
  }

  // Gắn nút thanh toán vào khối data-paybox (cần biết cổng nào đang bật)
  async function mount(root = document) {
    root.querySelectorAll('[data-copy]').forEach((b) => {
      b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy).then(() => DT.u.toast('Đã sao chép')).catch(() => {}); };
    });
    const box = root.querySelector('[data-paybox]');
    const bankNote = root.querySelector('[data-bank-note]');
    const c = await config();
    if (bankNote && c.bankAuto) bankNote.insertAdjacentHTML('beforeend', ' Hệ thống <b>tự xác nhận</b> trong 1–2 phút sau khi nhận tiền.');
    if (!box) return;
    const p = box.querySelector('p');
    const opts = [c.vnpay && ['vnpay', 'Thanh toán qua VNPay', 'Thẻ ATM nội địa, Visa, Master, JCB, QR ngân hàng'],
      c.momo && ['momo', 'Thanh toán bằng ví MoMo', 'Quét mã bằng ứng dụng MoMo']].filter(Boolean);
    if (!opts.length) {
      p.innerHTML = DT.backend?.enabled
        ? `Nhân viên sẽ gọi hướng dẫn thanh toán. Cần hỗ trợ gấp: <a class="link" href="tel:${DT.u.tel(DT.config.hotline)}">${DT.u.esc(DT.config.hotline)}</a>.`
        : 'Chế độ demo: chưa kết nối cổng thanh toán (xem docs/PHASE4.md để kích hoạt VNPay / MoMo).';
      return;
    }
    const preferred = PROVIDER[box.dataset.method];
    opts.sort((a, b) => (b[0] === preferred) - (a[0] === preferred));
    p.outerHTML = `<div class="pay-btns">${opts.map(([k, l, s], i) => `<button type="button" class="btn ${i ? 'btn-outline' : 'btn-accent'} btn-lg" data-pay="${k}"><b>${l}</b><small>${s}</small></button>`).join('')}</div>`;
    box.querySelectorAll('[data-pay]').forEach((b) => {
      b.onclick = async () => {
        box.querySelectorAll('[data-pay]').forEach((x) => { x.disabled = true; });
        b.querySelector('b').textContent = 'Đang chuyển tới cổng thanh toán…';
        try { await redirect(box.dataset.code, box.dataset.phone, b.dataset.pay); } catch (e) {
          DT.u.toast(e.message, 'error');
          box.querySelectorAll('[data-pay]').forEach((x) => { x.disabled = false; });
          b.querySelector('b').textContent = opts.find(([k]) => k === b.dataset.pay)[1];
        }
      };
    });
  }

  return { config, start, redirect, verifyReturn, qrUrl, boxHtml, mount, PROVIDER };
})();
