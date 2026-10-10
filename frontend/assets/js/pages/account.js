// Tài khoản: đăng nhập / đăng ký / tổng quan / đơn hàng / sổ địa chỉ / thông tin cá nhân
document.addEventListener('DOMContentLoaded', () => {
  const { $, $$, esc, money } = DT.u;
  const root = $('#account');

  function authView(tab = 'login') {
    root.innerHTML = `<div class="auth-wrap">
      <div class="auth-tabs"><button data-tab="login" class="${tab === 'login' ? 'active' : ''}">Đăng nhập</button><button data-tab="register" class="${tab === 'register' ? 'active' : ''}">Đăng ký</button></div>
      <div class="auth-body">
        <form id="login-form" class="${tab === 'login' ? '' : 'hidden'}" novalidate>
          <div class="field"><label>Số điện thoại</label><input name="phone" type="tel" required data-validate="phone" placeholder="0901 234 567"><div class="err">Số điện thoại không hợp lệ</div></div>
          <div class="field"><label>Mật khẩu</label><input name="password" type="password" required placeholder="••••••"><div class="err">Vui lòng nhập mật khẩu</div></div>
          <button class="btn btn-primary btn-block btn-lg">Đăng nhập</button>
          <p class="muted" style="text-align:center;margin-top:14px">Quên mật khẩu? Gọi <a class="link" href="tel:${DT.config.hotline.replace(/\s/g, '')}">${DT.config.hotline}</a></p>
        </form>
        <form id="register-form" class="${tab === 'register' ? '' : 'hidden'}" novalidate>
          <div class="field"><label>Họ và tên <span class="req">*</span></label><input name="name" required><div class="err">Vui lòng nhập họ tên</div></div>
          <div class="field"><label>Số điện thoại <span class="req">*</span></label><input name="phone" type="tel" required data-validate="phone"><div class="err">Số điện thoại không hợp lệ</div></div>
          <div class="field"><label>Email</label><input name="email" type="email"></div>
          <div class="field"><label>Mật khẩu <span class="req">*</span></label><input name="password" type="password" required minlength="6"><div class="err">Mật khẩu tối thiểu 6 ký tự</div></div>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" name="agree" required> <span>Tôi đồng ý với <a class="link" href="chinh-sach.html?type=bao-mat">chính sách bảo mật</a></span></label>
          <button class="btn btn-primary btn-block btn-lg">Tạo tài khoản</button>
        </form>
      </div>
      <div class="auth-perks"><b>Quyền lợi thành viên:</b><ul class="check-list" style="margin-top:8px">
        <li>${DT.icon('check')}Theo dõi đơn hàng, lịch sử mua hàng & bảo hành</li>
        <li>${DT.icon('check')}Nhắc lịch vệ sinh máy lạnh định kỳ</li>
        <li>${DT.icon('check')}Ưu đãi sinh nhật & mã giảm giá độc quyền</li></ul></div>
    </div>`;
  }

  function dashView(tab = 'overview') {
    const u = DT.store.get().user;
    const full = DT.store.fullUser() || { addresses: [] };
    const orders = DT.store.myOrders();
    const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const tabs = [['overview', 'home', 'Tổng quan'], ['orders', 'file', 'Đơn hàng của tôi'], ['addresses', 'pin', 'Sổ địa chỉ'], ['profile', 'user', 'Thông tin tài khoản'], ['wishlist', 'heart', 'Sản phẩm yêu thích']];
    let main = '';
    if (tab === 'overview') {
      main = `<h2>Xin chào, ${esc(u.name)}!</h2>
        <div class="stat-cards"><div><b>${orders.length}</b>Đơn hàng</div><div><b>${money(spent)}</b>Tổng chi tiêu</div><div><b>${DT.store.get().wishlist.length}</b>Sản phẩm yêu thích</div></div>
        <h3>Đơn hàng gần đây</h3>${orders.length ? orders.slice(0, 3).map(orderCard).join('') : DT.ui.empty('Bạn chưa có đơn hàng nào', '', '<a class="btn btn-primary" href="index.html">Mua sắm ngay</a>')}`;
    } else if (tab === 'orders') {
      main = `<h2>Đơn hàng của tôi</h2>${orders.length ? orders.map(orderCard).join('') : DT.ui.empty('Bạn chưa có đơn hàng nào', '', '<a class="btn btn-primary" href="index.html">Mua sắm ngay</a>')}`;
    } else if (tab === 'addresses') {
      main = `<h2>Sổ địa chỉ</h2>
        ${full.addresses.map((a, i) => `<div class="addr-card"><div><b>${esc(a.name)}</b> - ${esc(a.phone)} ${a.default ? '<span class="status info">Mặc định</span>' : ''}<br><span class="muted">${esc(a.address)}, ${esc(a.district)}, ${esc(a.province)}</span></div>
          <div>${a.default ? '' : `<button class="btn btn-link" data-default="${i}">Đặt mặc định</button>`}<button class="btn btn-link" data-del-addr="${i}">Xóa</button></div></div>`).join('') || '<p class="muted">Chưa có địa chỉ nào.</p>'}
        <form id="addr-form" class="section-box" style="box-shadow:none;border:1px solid var(--border)" novalidate><h3>Thêm địa chỉ mới</h3>
          <div class="form-row"><div class="field"><input name="name" required placeholder="Họ tên người nhận *" value="${esc(u.name)}"><div class="err">Bắt buộc</div></div><div class="field"><input name="phone" required data-validate="phone" placeholder="Số điện thoại *" value="${esc(u.phone)}"><div class="err">SĐT không hợp lệ</div></div></div>
          <div class="form-row"><div class="field"><input name="province" required placeholder="Tỉnh / Thành phố *"><div class="err">Bắt buộc</div></div><div class="field"><input name="district" required placeholder="Quận / Huyện *"><div class="err">Bắt buộc</div></div></div>
          <div class="field"><input name="address" required placeholder="Số nhà, đường, phường *"><div class="err">Bắt buộc</div></div>
          <button class="btn btn-primary">Lưu địa chỉ</button></form>`;
    } else if (tab === 'profile') {
      main = `<h2>Thông tin tài khoản</h2><form id="profile-form" style="max-width:480px" novalidate>
        <div class="field"><label>Họ và tên</label><input name="name" required value="${esc(u.name)}"><div class="err">Bắt buộc</div></div>
        <div class="field"><label>Số điện thoại</label><input value="${esc(u.phone)}" disabled></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(u.email || '')}"></div>
        <button class="btn btn-primary">Cập nhật</button></form>`;
    } else if (tab === 'wishlist') {
      const items = DT.store.get().wishlist.map(DT.api.productById).filter(Boolean);
      main = `<h2>Sản phẩm yêu thích</h2>${items.length ? DT.ui.grid(items, { cls: 'cols-4' }) : DT.ui.empty('Chưa có sản phẩm yêu thích')}`;
    }
    root.innerHTML = `<div class="account">
      <aside class="acc-nav"><div class="acc-user"><span class="avatar">${esc(u.name.trim().split(' ').pop()[0])}</span><div><b>${esc(u.name)}</b><small>${esc(u.phone)}</small></div></div>
        ${tabs.map(([id, ic, l]) => `<button data-acc="${id}" class="${tab === id ? 'active' : ''}">${DT.icon(ic)}${l}</button>`).join('')}
        <button id="logout">${DT.icon('logout')}Đăng xuất</button></aside>
      <section class="acc-main">${main}</section></div>`;
  }

  function orderCard(o) {
    const st = DT.orderStatus[o.status];
    return `<div class="order-card"><div class="oc-head"><span>Mã đơn <b>${o.code}</b> • ${new Date(o.createdAt).toLocaleDateString('vi-VN')}</span><span class="status ${st.cls}">${st.label}</span></div>
      <div class="oc-body">${o.items.slice(0, 2).map((it) => `<div class="co-item"><span class="nm">${esc(it.name)} × ${it.qty}</span><b>${money(it.price * it.qty)}</b></div>`).join('')}${o.items.length > 2 ? `<small class="muted">+ ${o.items.length - 2} sản phẩm khác</small>` : ''}</div>
      <div class="oc-foot"><span>Tổng tiền: <b class="price">${money(o.total)}</b></span><a class="btn btn-outline btn-sm" href="tra-cuu-don-hang.html?code=${o.code}&phone=${o.customer.phone}">Xem chi tiết</a></div></div>`;
  }

  const currentTab = () => location.hash.slice(1) || 'overview';
  function render() {
    if (DT.store.get().user) dashView(['overview', 'orders', 'addresses', 'profile', 'wishlist'].includes(currentTab()) ? currentTab() : 'overview');
    else authView(currentTab() === 'register' ? 'register' : 'login');
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) authView(t.dataset.tab);
    const a = e.target.closest('[data-acc]');
    if (a) { history.replaceState(null, '', '#' + a.dataset.acc); render(); }
    if (e.target.closest('#logout')) { DT.store.logout(); history.replaceState(null, '', location.pathname); render(); DT.u.toast('Đã đăng xuất'); }
    const del = e.target.closest('[data-del-addr]');
    const def = e.target.closest('[data-default]');
    if (del || def) {
      const list = [...(DT.store.fullUser().addresses || [])];
      if (del) list.splice(+del.dataset.delAddr, 1);
      if (def) list.forEach((x, i) => { x.default = i === +def.dataset.default; });
      DT.store.saveAddresses(list); render();
    }
  });

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const d = DT.u.formData(f);
    if (!d) return;
    const next = DT.u.param('next');
    if (f.id === 'login-form') {
      const r = DT.store.login(d.phone.replace(/[\s.]/g, ''), d.password);
      if (!r.ok) return DT.u.toast(r.msg, 'error');
      DT.u.toast('Đăng nhập thành công');
      if (next) location.href = next; else render();
    }
    if (f.id === 'register-form') {
      if (d.password.length < 6) { f.password.closest('.field').classList.add('invalid'); return; }
      const r = DT.store.register({ name: d.name.trim(), phone: d.phone.replace(/[\s.]/g, ''), email: d.email, password: d.password });
      if (!r.ok) return DT.u.toast(r.msg, 'error');
      DT.u.toast('Tạo tài khoản thành công. Chào mừng bạn!');
      if (next) location.href = next; else render();
    }
    if (f.id === 'profile-form') { DT.store.updateProfile({ name: d.name.trim(), email: d.email }); DT.u.toast('Đã cập nhật thông tin'); render(); }
    if (f.id === 'addr-form') {
      const list = [...(DT.store.fullUser().addresses || [])];
      list.push({ ...d, default: !list.length });
      DT.store.saveAddresses(list); DT.u.toast('Đã lưu địa chỉ'); render();
    }
  });

  window.addEventListener('hashchange', render);
  render();
});
