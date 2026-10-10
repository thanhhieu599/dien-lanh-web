// Thanh toán
document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc, money } = DT.u;
  if (!DT.store.get().cart.length) { location.replace('gio-hang.html'); return; }
  const user = DT.store.get().user;
  const full = DT.store.fullUser();
  const addr = full?.addresses?.find((a) => a.default) || full?.addresses?.[0];

  const provinces = ['TP. Hồ Chí Minh', 'Bình Dương', 'Đồng Nai', 'Long An', 'Bà Rịa - Vũng Tàu', 'Tây Ninh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Tỉnh/thành khác'];

  $('#checkout').innerHTML = `<form id="co-form" class="cart-layout" novalidate>
    <div>
      <section class="co-section"><h2><span class="n">1</span>Thông tin người mua</h2>
        ${user ? '' : `<p class="muted">Đã có tài khoản? <a class="link" href="tai-khoan.html?next=thanh-toan.html">Đăng nhập</a> để thanh toán nhanh hơn.</p>`}
        <div class="field"><label>Xưng hô</label><div style="display:flex;gap:16px"><label class="check"><input type="radio" name="gender" value="Anh" checked> Anh</label><label class="check"><input type="radio" name="gender" value="Chị"> Chị</label></div></div>
        <div class="form-row">
          <div class="field"><label>Họ và tên <span class="req">*</span></label><input name="name" required value="${esc(user?.name || '')}"><div class="err">Vui lòng nhập họ tên</div></div>
          <div class="field"><label>Số điện thoại <span class="req">*</span></label><input name="phone" type="tel" required data-validate="phone" value="${esc(user?.phone || '')}"><div class="err">Số điện thoại không hợp lệ</div></div>
        </div>
        <div class="field"><label>Email (nhận hóa đơn & thông tin đơn hàng)</label><input name="email" type="email" value="${esc(user?.email || '')}"><div class="err">Email không hợp lệ</div></div>
      </section>

      <section class="co-section"><h2><span class="n">2</span>Hình thức nhận hàng</h2>
        <div class="radio-cards" style="grid-template-columns:1fr 1fr;margin-bottom:14px">
          <label class="radio-card"><input type="radio" name="method" value="delivery" checked><span class="rc-ic">${DT.icon('truck')}</span><span><b>Giao tận nơi</b><small>Giao & lắp đặt tại nhà</small></span></label>
          <label class="radio-card"><input type="radio" name="method" value="pickup"><span class="rc-ic">${DT.icon('pin')}</span><span><b>Nhận tại cửa hàng</b><small>Miễn phí, có sẵn sau 2h</small></span></label>
        </div>
        <div id="delivery-fields">
          <div class="form-row">
            <div class="field"><label>Tỉnh / Thành phố <span class="req">*</span></label><select name="province" required><option value="">-- Chọn --</option>${provinces.map((p) => `<option ${addr?.province === p ? 'selected' : ''}>${p}</option>`).join('')}</select><div class="err">Vui lòng chọn tỉnh/thành</div></div>
            <div class="field"><label>Quận / Huyện <span class="req">*</span></label><input name="district" required value="${esc(addr?.district || '')}"><div class="err">Vui lòng nhập quận/huyện</div></div>
          </div>
          <div class="field"><label>Địa chỉ cụ thể <span class="req">*</span></label><input name="address" required placeholder="Số nhà, tên đường, phường/xã" value="${esc(addr?.address || '')}"><div class="err">Vui lòng nhập địa chỉ</div></div>
          <div class="form-row">
            <div class="field"><label>Ngày giao mong muốn</label><input name="date" type="date" min="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="field"><label>Khung giờ</label><select name="slot"><option>8:00 - 12:00</option><option>13:00 - 17:00</option><option>17:00 - 21:00</option></select></div>
          </div>
        </div>
        <div id="pickup-fields" class="hidden">
          <div class="field"><label>Chọn cửa hàng <span class="req">*</span></label><select name="store">${DT.stores.map((s) => `<option value="${s.id}">${esc(s.name)} - ${esc(s.address)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Ghi chú</label><textarea name="note" placeholder="Ví dụ: Gọi trước khi giao, tầng 3 không có thang máy…"></textarea></div>
      </section>

      <section class="co-section"><h2><span class="n">3</span>Phương thức thanh toán</h2>
        <div class="radio-cards">
          <label class="radio-card"><input type="radio" name="payment" value="cod" checked><span class="rc-ic">${DT.icon('home')}</span><span><b>Thanh toán khi nhận hàng (COD)</b><small>Kiểm tra hàng trước khi thanh toán</small></span></label>
          <label class="radio-card"><input type="radio" name="payment" value="bank"><span class="rc-ic">${DT.icon('building')}</span><span><b>Chuyển khoản ngân hàng / QR</b><small>Xác nhận tự động trong 5 phút</small></span></label>
          <label class="radio-card"><input type="radio" name="payment" value="card"><span class="rc-ic">${DT.icon('card')}</span><span><b>Thẻ ATM / Visa / Master / JCB</b><small>Qua cổng thanh toán VNPay</small></span></label>
          <label class="radio-card"><input type="radio" name="payment" value="wallet"><span class="rc-ic">${DT.icon('phone')}</span><span><b>Ví MoMo / ZaloPay</b><small>Quét mã thanh toán</small></span></label>
          <label class="radio-card"><input type="radio" name="payment" value="installment"><span class="rc-ic">${DT.icon('percent')}</span><span><b>Trả góp 0%</b><small>Qua thẻ tín dụng hoặc công ty tài chính</small></span></label>
        </div>
        <div class="bank-info" id="bank-info">
          <b>Thông tin chuyển khoản</b><br>Ngân hàng: Vietcombank - CN TP.HCM<br>Số tài khoản: <b>0071 000 000 000</b><br>Chủ tài khoản: ${esc(DT.config.company)}<br>Nội dung: <b>Mã đơn hàng + SĐT</b> (hiển thị sau khi đặt)
        </div>
      </section>

      <section class="co-section"><h2><span class="n">4</span>Hóa đơn</h2>
        <label class="check"><input type="checkbox" name="needInvoice" id="need-invoice"> Xuất hóa đơn GTGT cho công ty</label>
        <div class="invoice-fields" id="invoice-fields">
          <div class="form-row">
            <div class="field"><label>Tên công ty <span class="req">*</span></label><input name="company"><div class="err">Vui lòng nhập tên công ty</div></div>
            <div class="field"><label>Mã số thuế <span class="req">*</span></label><input name="taxCode"><div class="err">Vui lòng nhập MST</div></div>
          </div>
          <div class="field"><label>Địa chỉ công ty</label><input name="companyAddress"></div>
          <div class="field"><label>Email nhận hóa đơn</label><input name="invoiceEmail" type="email"></div>
        </div>
      </section>
    </div>
    <div id="co-summary"></div>
  </form>`;

  const form = $('#co-form');
  function renderSummary() {
    const t = DT.store.totals();
    $('#co-summary').innerHTML = `<div class="summary">
      <h3>Đơn hàng (${DT.store.cartCount()} sản phẩm) <a class="link" href="gio-hang.html" style="float:right;font-size:13px">Sửa</a></h3>
      <div class="co-items">${t.lines.map(({ product: p, qty }) => `<div class="co-item"><span class="ci-img">${DT.productImage(p, 0)}<em>${qty}</em></span><span class="nm">${esc(p.name)}</span><b>${money(p.price * qty)}</b></div>`).join('')}</div>
      <div class="sum-row"><span>Tạm tính</span><span>${money(t.subtotal)}</span></div>
      ${t.install ? `<div class="sum-row"><span>Phí lắp đặt</span><span>${money(t.install)}</span></div>` : ''}
      <div class="sum-row"><span>Phí vận chuyển</span><span id="ship-fee">${t.shipping && form.method.value === 'delivery' ? money(t.shipping) : 'Miễn phí'}</span></div>
      ${t.discount ? `<div class="sum-row discount"><span>Giảm giá (${t.coupon.code})</span><span>-${money(t.discount)}</span></div>` : ''}
      <div class="sum-total"><span>Tổng thanh toán</span><b>${money(t.total - (form.method.value === 'pickup' ? t.shipping : 0))}</b></div>
      <div class="sum-note">(Đã bao gồm VAT nếu có)</div>
      <label class="check" style="margin-bottom:14px;font-size:13px"><input type="checkbox" name="agree" checked> <span>Tôi đồng ý với <a class="link" href="chinh-sach.html?type=bao-mat" target="_blank">chính sách bảo mật</a> và <a class="link" href="chinh-sach.html?type=doi-tra" target="_blank">điều khoản mua hàng</a></span></label>
      <button type="submit" class="btn btn-accent btn-block btn-lg">ĐẶT HÀNG</button>
    </div>`;
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'method') {
      const pickup = form.method.value === 'pickup';
      $('#delivery-fields').classList.toggle('hidden', pickup);
      $('#pickup-fields').classList.toggle('hidden', !pickup);
      $$('#delivery-fields [name=province], #delivery-fields [name=district], #delivery-fields [name=address]').forEach((f) => { f.required = !pickup; });
      renderSummary();
    }
    if (e.target.name === 'payment') $('#bank-info').classList.toggle('show', form.payment.value === 'bank');
    if (e.target.id === 'need-invoice') {
      $('#invoice-fields').classList.toggle('show', e.target.checked);
      ['company', 'taxCode'].forEach((n) => { form[n].required = e.target.checked; });
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = DT.u.formData(form);
    if (!d) {
      DT.u.toast('Vui lòng kiểm tra lại thông tin còn thiếu', 'error');
      $('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (d.email && !DT.u.validEmail(d.email)) { form.email.closest('.field').classList.add('invalid'); return; }
    if (!form.agree.checked) { DT.u.toast('Vui lòng đồng ý điều khoản mua hàng', 'error'); return; }
    const pickup = d.method === 'pickup';
    const order = DT.store.placeOrder({
      customer: { gender: d.gender, name: d.name.trim(), phone: d.phone.replace(/[\s.]/g, ''), email: d.email },
      shipping: pickup
        ? { method: 'pickup', store: DT.stores.find((s) => s.id === Number(d.store))?.name }
        : { method: 'delivery', province: d.province, district: d.district, address: d.address, date: d.date, slot: d.slot },
      payment: d.payment,
      invoice: d.needInvoice ? { company: d.company, taxCode: d.taxCode, address: d.companyAddress, email: d.invoiceEmail } : null,
      note: d.note,
    });
    if (order && pickup) { order.total -= order.shippingFee; order.shippingFee = 0; DT.store.save(); }
    if (order) location.href = `dat-hang-thanh-cong.html?code=${order.code}`;
  });

  renderSummary();
});
