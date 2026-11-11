// Thanh toán: chỉ có 2 phương thức là COD (trả tiền khi nhận hàng) và chuyển khoản ngân hàng (VietQR).
// Không dùng cổng thanh toán online (thẻ, ví điện tử, trả góp).
window.DT = window.DT || {};

DT.payments = (() => {
  // Phương thức hợp lệ, khớp với kiểm tra phía máy chủ (server/shop.php)
  const METHODS = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng / VietQR' };

  // Ảnh QR VietQR: mọi app ngân hàng quét được, tự điền số tiền + nội dung (mã đơn)
  function qrUrl(amount, content) {
    const c = DT.config;
    if (!c.bankBin || !c.bankAccount) return '';
    const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: content, accountName: c.bankOwner || '' });
    return `https://img.vietqr.io/image/${encodeURIComponent(c.bankBin)}-${encodeURIComponent(c.bankAccount)}-compact2.png?${q}`;
  }

  // Khối thanh toán dưới thông tin đơn (trang đặt hàng thành công, tra cứu đơn)
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
    return '';
  }

  // Gắn nút "Sao chép" số tài khoản / nội dung chuyển khoản
  function mount(root = document) {
    root.querySelectorAll('[data-copy]').forEach((b) => {
      b.onclick = () => { navigator.clipboard?.writeText(b.dataset.copy).then(() => DT.u.toast('Đã sao chép')).catch(() => {}); };
    });
  }

  return { METHODS, qrUrl, boxHtml, mount };
})();
