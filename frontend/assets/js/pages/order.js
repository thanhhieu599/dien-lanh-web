// Đặt hàng thành công (dat-hang-thanh-cong.html) & tra cứu đơn hàng (tra-cuu-don-hang.html)
DT.orderView = (o) => {
  const { esc, money } = DT.u;
  const st = DT.orderStatus[o.status];
  const pay = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', card: 'Thẻ ATM / Visa / Master', wallet: 'Ví điện tử', installment: 'Trả góp 0%' }[o.payment];
  const flow = ['pending', 'confirmed', 'shipping', 'done'];
  const idx = o.status === 'cancelled' ? -1 : flow.indexOf(o.status);
  const labels = { pending: 'Đặt hàng thành công', confirmed: 'Đã xác nhận đơn', shipping: 'Đang giao hàng', done: 'Giao & lắp đặt hoàn tất' };
  return `
    <div class="order-info">
      <div class="sum-row"><span>Mã đơn hàng</span><span class="price">${o.code}</span></div>
      <div class="sum-row"><span>Trạng thái</span><span><span class="status ${st.cls}">${st.label}</span></span></div>
      <div class="sum-row"><span>Ngày đặt</span><span>${new Date(o.createdAt).toLocaleString('vi-VN')}</span></div>
      <div class="sum-row"><span>Người nhận</span><span>${esc(o.customer.gender || '')} ${esc(o.customer.name)} - ${esc(o.customer.phone)}</span></div>
      <div class="sum-row"><span>Nhận hàng</span><span>${o.shipping.method === 'pickup' ? `Tại ${esc(o.shipping.store)}` : `${esc(o.shipping.address)}, ${esc(o.shipping.district)}, ${esc(o.shipping.province)}`}</span></div>
      <div class="sum-row"><span>Thanh toán</span><span>${pay}</span></div>
      ${o.invoice ? `<div class="sum-row"><span>Hóa đơn VAT</span><span>${esc(o.invoice.company)} - MST ${esc(o.invoice.taxCode)}</span></div>` : ''}
    </div>
    ${o.payment === 'bank' && o.status === 'pending' ? `<div class="bank-info show" style="text-align:left;margin-bottom:16px">Vui lòng chuyển khoản <b class="price">${money(o.total)}</b> tới STK <b>0071 000 000 000</b> - Vietcombank - ${esc(DT.config.company)}.<br>Nội dung: <b>${o.code} ${esc(o.customer.phone)}</b></div>` : ''}
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

document.addEventListener('DOMContentLoaded', () => {
  const { $ } = DT.u;
  const page = document.body.dataset.page;

  if (page === 'success') {
    const o = DT.store.findOrder(DT.u.param('code') || '');
    if (!o) { $('#success').innerHTML = DT.ui.empty('Không tìm thấy đơn hàng', '', '<a class="btn btn-primary" href="index.html">Về trang chủ</a>'); return; }
    $('#success').innerHTML = `<div class="success-ic">${DT.icon('check')}</div>
      <h1 style="font-size:24px">Đặt hàng thành công!</h1>
      <p class="muted">Cảm ơn ${DT.u.esc(o.customer.gender || '')} <b>${DT.u.esc(o.customer.name)}</b>. Nhân viên ${DT.u.esc(DT.config.name)} sẽ gọi xác nhận trong vòng 15 phút (giờ làm việc).</p>
      ${DT.orderView(o)}
      <div class="qv-btns"><a class="btn btn-outline" href="index.html">Tiếp tục mua sắm</a><a class="btn btn-primary" href="tra-cuu-don-hang.html?code=${o.code}&phone=${o.customer.phone}">Theo dõi đơn hàng</a></div>`;
  }

  if (page === 'tracking') {
    const form = $('#track-form');
    const show = (code, phone) => {
      const o = DT.store.findOrder(code, phone);
      $('#track-result').innerHTML = o
        ? `<div class="section-box">${DT.orderView(o)}${o.status === 'pending' ? '<button class="btn btn-light" id="cancel-order">Hủy đơn hàng</button>' : ''}</div>`
        : `<div class="section-box">${DT.ui.empty('Không tìm thấy đơn hàng', 'Vui lòng kiểm tra lại mã đơn hàng và số điện thoại đặt hàng.')}</div>`;
      const btn = $('#cancel-order');
      if (btn) btn.onclick = () => { if (confirm('Bạn chắc chắn muốn hủy đơn hàng này?') && DT.store.cancelOrder(o.code)) { DT.u.toast('Đã hủy đơn hàng'); show(code, phone); } };
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
