// Kết quả thanh toán (ket-qua-thanh-toan.html): VNPay / MoMo chuyển khách về đây kèm tham số giao dịch.
// Trang gửi tham số cho máy chủ kiểm tra chữ ký (khóa bí mật chỉ nằm trên máy chủ) rồi hiển thị kết quả.
DT.onReady(async () => {
  const { $, esc } = DT.u;
  const box = $('#pay-result');
  const params = Object.fromEntries(new URLSearchParams(location.search));
  if (!params.vnp_TxnRef && !params.partnerCode) {
    // Tải lại trang sau khi đã xác nhận (URL chỉ còn ?code=): hiện trạng thái đơn mới nhất
    const local = params.code && DT.store.findOrder(params.code);
    if (local) {
      let o = local;
      if (DT.backend.enabled) { try { const fresh = await DT.store.trackOrder(local.code, local.customer.phone); if (fresh) o = DT.store.rememberOrder(fresh); } catch { /* giữ bản cũ */ } }
      const paid = o.paymentStatus === 'paid';
      box.innerHTML = `<div class="success-ic ${paid ? '' : 'fail'}">${DT.icon(paid ? 'check' : 'alert')}</div>
        <h1 style="font-size:24px">${paid ? 'Đơn hàng đã được thanh toán' : 'Đơn hàng chưa được thanh toán'}</h1>
        ${DT.orderView(o)}
        <div class="qv-btns"><a class="btn btn-outline" href="index.html">Tiếp tục mua sắm</a><a class="btn btn-primary" href="tra-cuu-don-hang.html?code=${encodeURIComponent(o.code)}&phone=${encodeURIComponent(o.customer.phone)}">Theo dõi đơn hàng</a></div>`;
      DT.payments.mount(box);
      return;
    }
    box.innerHTML = DT.ui.empty('Không có thông tin giao dịch', 'Bạn có thể tra cứu đơn hàng bằng mã đơn và số điện thoại.', '<a class="btn btn-primary" href="tra-cuu-don-hang.html">Tra cứu đơn hàng</a>', 'h1');
    return;
  }
  box.innerHTML = '<p class="muted">Đang xác nhận kết quả thanh toán…</p>';
  let r;
  try {
    r = await DT.payments.verifyReturn(params);
  } catch (e) {
    box.innerHTML = DT.ui.empty('Chưa xác nhận được giao dịch', esc(e.message), `<a class="btn btn-primary" href="tra-cuu-don-hang.html">Tra cứu đơn hàng</a> <a class="btn btn-outline" href="tel:${DT.u.tel(DT.config.hotline)}">Gọi ${esc(DT.config.hotline)}</a>`, 'h1');
    return;
  }
  const code = r.order?.code || '';
  // Bỏ tham số khỏi thanh địa chỉ (tránh lộ / gửi lại khi tải lại trang)
  history.replaceState(null, '', `ket-qua-thanh-toan.html?code=${encodeURIComponent(code)}`);
  const local = code && DT.store.findOrder(code);
  let order = local || null;
  if (local && DT.backend.enabled) {
    try { const fresh = await DT.store.trackOrder(code, local.customer.phone); if (fresh) order = DT.store.rememberOrder(fresh); } catch { /* giữ bản cũ */ }
  }
  const trackLink = `tra-cuu-don-hang.html?code=${encodeURIComponent(code)}${order ? `&phone=${encodeURIComponent(order.customer.phone)}` : ''}`;
  if (r.success) {
    box.innerHTML = `<div class="success-ic">${DT.icon('check')}</div>
      <h1 style="font-size:24px">Thanh toán thành công!</h1>
      <p class="muted">Đơn hàng <b>${esc(code)}</b> đã được thanh toán. ${esc(DT.config.name)} sẽ liên hệ xác nhận lịch giao & lắp đặt.</p>
      ${order ? DT.orderView(order) : ''}
      <div class="qv-btns"><a class="btn btn-outline" href="index.html">Tiếp tục mua sắm</a><a class="btn btn-primary" href="${trackLink}">Theo dõi đơn hàng</a></div>`;
  } else {
    box.innerHTML = `<div class="success-ic fail">${DT.icon('alert')}</div>
      <h1 style="font-size:24px">Thanh toán chưa thành công</h1>
      <p class="muted">${esc(r.message || 'Giao dịch không thành công')}. Đơn hàng <b>${esc(code)}</b> vẫn được giữ, bạn có thể thanh toán lại hoặc chọn hình thức khác qua hotline <a class="link" href="tel:${DT.u.tel(DT.config.hotline)}">${esc(DT.config.hotline)}</a>.</p>
      ${order ? DT.orderView(order) : `<a class="btn btn-primary" href="${trackLink}">Tra cứu đơn hàng để thanh toán lại</a>`}`;
  }
  DT.payments.mount(box);
});
