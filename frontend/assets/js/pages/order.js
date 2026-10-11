// Đặt hàng thành công (dat-hang-thanh-cong.html) & tra cứu đơn hàng (tra-cuu-don-hang.html)
DT.orderView = (o) => {
  const { esc, money } = DT.u;
  const st = DT.orderStatus[o.status];
  const pay = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', card: 'Thẻ ATM / Visa / Master (VNPay)', wallet: 'Ví MoMo', installment: 'Trả góp 0%' }[o.payment];
  const ps = DT.paymentStatus[o.paymentStatus || 'unpaid'];
  const flow = ['pending', 'confirmed', 'shipping', 'installing', 'done'];
  const idx = o.status === 'cancelled' ? -1 : flow.indexOf(o.status);
  const labels = { pending: 'Đặt hàng thành công', confirmed: 'Đã xác nhận đơn', shipping: 'Đang giao hàng', installing: 'Đang lắp đặt', done: 'Giao & lắp đặt hoàn tất' };
  return `
    <div class="order-info">
      <div class="sum-row"><span>Mã đơn hàng</span><span class="price">${o.code}</span></div>
      <div class="sum-row"><span>Trạng thái</span><span><span class="status ${st.cls}">${st.label}</span></span></div>
      <div class="sum-row"><span>Ngày đặt</span><span>${new Date(o.createdAt).toLocaleString('vi-VN')}</span></div>
      <div class="sum-row"><span>Người nhận</span><span>${esc(o.customer.gender || '')} ${esc(o.customer.name)} - ${esc(o.customer.phone)}</span></div>
      <div class="sum-row"><span>Nhận hàng</span><span>${o.shipping.method === 'pickup' ? `Tại ${esc(o.shipping.store)}` : `${esc(o.shipping.address)}, ${esc(o.shipping.district)}, ${esc(o.shipping.province)}`}</span></div>
      <div class="sum-row"><span>Thanh toán</span><span>${pay} <span class="status ${ps.cls}">${ps.label}</span></span></div>
      ${o.invoice ? `<div class="sum-row"><span>Hóa đơn VAT</span><span>${esc(o.invoice.company)} - MST ${esc(o.invoice.taxCode)}</span></div>` : ''}
    </div>
    ${DT.payments ? DT.payments.boxHtml(o) : ''}
    <ul class="timeline">${o.status === 'cancelled' ? '<li class="done"><b>Đơn hàng đã hủy</b></li>' : flow.map((s, i) => `<li class="${i <= idx ? 'done' : ''}"><b>${labels[s]}</b>${i === 0 ? `<small>${new Date(o.createdAt).toLocaleString('vi-VN')}</small>` : ''}</li>`).join('')}</ul>
    <div class="order-items">${o.items.map((it) => {
      const p = DT.api.productById(it.id);
      return `<div class="co-item"><span class="ci-img">${p ? DT.productImage(p, 0) : ''}<em>${it.qty}</em></span><span class="nm">${esc(it.name)}${it.install ? ' <small class="muted">(+ lắp đặt)</small>' : ''}</span><b>${money(it.price * it.qty)}</b></div>`;
    }).join('')}</div>
    <div class="order-info">
      <div class="sum-row"><span>Tạm tính</span><span>${money(o.subtotal)}</span></div>
      ${o.install ? `<div class="sum-row"><span>Phí lắp đặt</span><span>${money(o.install)}</span></div>` : ''}
      <div class="sum-row"><span>Vận chuyển</span><span>${o.shippingFee ? money(o.shippingFee) : 'Miễn phí'}</span></div>
      ${o.discount ? `<div class="sum-row discount"><span>Giảm giá ${o.coupon ? `(${o.coupon})` : ''}</span><span>-${money(o.discount)}</span></div>` : ''}
      <div class="sum-total"><span>Tổng thanh toán</span><b>${money(o.total)}</b></div>
    </div>`;
};

DT.onReady(() => {
  const { $ } = DT.u;
  const page = document.body.dataset.page;

  if (page === 'success') {
    let o = DT.store.findOrder(DT.u.param('code') || '');
    if (!o) { $('#success').innerHTML = DT.ui.empty('Không tìm thấy đơn hàng', '', '<a class="btn btn-primary" href="index.html">Về trang chủ</a>', 'h1'); return; }
    const render = () => {
      $('#success').innerHTML = `<div class="success-ic">${DT.icon('check')}</div>
      <h1 style="font-size:24px">Đặt hàng thành công!</h1>
      <p class="muted">Cảm ơn ${DT.u.esc(o.customer.gender || '')} <b>${DT.u.esc(o.customer.name)}</b>. Nhân viên ${DT.u.esc(DT.config.name)} sẽ gọi xác nhận trong vòng 15 phút (giờ làm việc).</p>
      ${DT.orderView(o)}
      <div class="qv-btns"><a class="btn btn-outline" href="index.html">Tiếp tục mua sắm</a><a class="btn btn-primary" href="tra-cuu-don-hang.html?code=${encodeURIComponent(o.code)}&phone=${encodeURIComponent(o.customer.phone)}">Theo dõi đơn hàng</a></div>`;
      DT.payments.mount($('#success'));
    };
    render();
    // Cập nhật trạng thái mới nhất (vd: vừa thanh toán xong, hoặc chuyển khoản đã được đối soát)
    if (DT.backend.enabled) {
      DT.store.trackOrder(o.code, o.customer.phone).then((fresh) => { if (fresh) { o = DT.store.rememberOrder(fresh); render(); } }).catch(() => {});
    }
  }

  if (page === 'tracking') {
    const form = $('#track-form');
    const show = async (code, phone) => {
      $('#track-result').innerHTML = '<div class="section-box"><p class="muted">Đang tra cứu…</p></div>';
      let o = null;
      try { o = await DT.store.trackOrder(code, phone); } catch (err) { DT.u.toast(err.message, 'error'); }
      $('#track-result').innerHTML = o
        ? `<div class="section-box">${DT.orderView(o)}${o.status === 'pending' && o.paymentStatus !== 'paid' ? '<button class="btn btn-light" id="cancel-order">Hủy đơn hàng</button>' : ''}</div>`
        : `<div class="section-box">${DT.ui.empty('Không tìm thấy đơn hàng', 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại đặt hàng.')}</div>`;
      if (o) DT.payments.mount($('#track-result'));
      const btn = $('#cancel-order');
      if (btn) {
        btn.onclick = async () => {
          if (!confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) return;
          try { await DT.store.cancelOrder(o.code, phone); DT.u.toast('Đã hủy đơn hàng'); show(code, phone); } catch (err) { DT.u.toast(err.message, 'error'); }
        };
      }
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = DT.u.formData(form);
      if (d) show(d.code, d.phone);
    });
    const code = DT.u.param('code');
    if (code) { form.code.value = code; form.phone.value = DT.u.param('phone') || ''; show(code, form.phone.value); }
  }
});
