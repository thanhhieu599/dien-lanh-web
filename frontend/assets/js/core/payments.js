// Thanh toán: chỉ có 2 phương thức là COD (trả tiền khi nhận hàng) và chuyển khoản ngân hàng.
// Chuyển khoản: hiện ảnh mã QR ngân hàng do quản trị tải lên + số tài khoản; nhân viên xác nhận thanh toán thủ công.
// Không dùng cổng thanh toán online (thẻ, ví điện tử, trả góp).
window.DT = window.DT || {};

DT.payments = (() => {
  // Phương thức hợp lệ, khớp với kiểm tra phía máy chủ (server/shop.php)
  const METHODS = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng' };

  // Ảnh mã QR ngân hàng tĩnh (Cài đặt › Liên hệ & chuyển khoản › Ảnh mã QR ngân hàng). Không tự điền số tiền:
  // khách nhập số tiền + nội dung là mã đơn. Tham số giữ để tương thích chỗ gọi cũ.
  function qrUrl(_amount, _content) {
    const src = String(DT.config.bankQr || '').trim();
    if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(src)) return src; // ảnh demo lưu dạng data URL
    const url = DT.u.safeUrl(src);
    return /^(tel|mailto|zalo):/i.test(url) ? '' : url;
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
        <p class="muted" data-bank-note>${qr ? 'Quét mã QR bằng app ngân hàng, nhập' : 'Chuyển khoản qua app ngân hàng, nhập'} đúng <b>số tiền</b> và <b>nội dung là mã đơn</b>. Cửa hàng xác nhận đơn sau khi kiểm tra tiền đã về tài khoản. ${o.paymentStatus === 'partial' ? '<b>Đơn hàng đã nhận thanh toán một phần, vui lòng chuyển phần còn lại hoặc gọi hotline.</b>' : ''}</p>
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
