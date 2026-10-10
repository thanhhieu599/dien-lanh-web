// Trạng thái phía trình duyệt: giỏ hàng, yêu thích, so sánh, tài khoản, đơn hàng.
// Giai đoạn 1 lưu localStorage; giai đoạn 2 đồng bộ với backend qua DT.api.
window.DT = window.DT || {};

DT.store = (() => {
  const KEY = 'dt_shop_v1';
  const blank = () => ({ cart: [], wishlist: [], compare: [], viewed: [], user: null, users: [], orders: [], coupon: null });
  let state;
  try { state = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { state = blank(); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* chế độ ẩn danh */ }
    document.dispatchEvent(new CustomEvent('dt:change', { detail: state }));
  }
  const get = () => state;

  // ---------- Giỏ hàng
  function addToCart(id, qty = 1, opts = {}) {
    const p = DT.api.productById(id);
    if (!p) return false;
    const item = state.cart.find((i) => i.id === id);
    if (item) item.qty = Math.min(item.qty + qty, 99);
    else state.cart.push({ id, qty, install: !!opts.install });
    save();
    return true;
  }
  function setQty(id, qty) {
    const item = state.cart.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
    else item.qty = Math.min(qty, 99);
    save();
  }
  function setInstall(id, on) {
    const item = state.cart.find((i) => i.id === id);
    if (item) { item.install = on; save(); }
  }
  const removeFromCart = (id) => setQty(id, 0);
  const clearCart = () => { state.cart = []; state.coupon = null; save(); };
  const cartCount = () => state.cart.reduce((s, i) => s + i.qty, 0);

  // Tính tổng tiền giỏ hàng, gồm phí lắp đặt, vận chuyển và mã giảm giá
  function totals() {
    const cfg = DT.config;
    const lines = state.cart.map((i) => ({ ...i, product: DT.api.productById(i.id) })).filter((l) => l.product);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const install = lines.reduce((s, l) => s + (l.install && !l.product.freeInstall && l.product.cat === 'may-lanh' ? cfg.installFee * l.qty : 0), 0);
    let shipping = subtotal === 0 || subtotal >= cfg.freeShipThreshold ? 0 : cfg.shippingFee;
    let discount = 0;
    const c = state.coupon && DT.coupons.find((x) => x.code === state.coupon);
    if (c && subtotal >= c.min) {
      if (c.type === 'percent') discount = Math.min(subtotal * c.value / 100, c.max || Infinity);
      if (c.type === 'fixed') discount = c.value;
      if (c.type === 'ship') shipping = 0;
    }
    return { lines, subtotal, install, shipping, discount, coupon: c && subtotal >= c.min ? c : null, total: Math.max(0, subtotal + install + shipping - discount) };
  }
  function applyCoupon(code) {
    const c = DT.coupons.find((x) => x.code === String(code).trim().toUpperCase());
    if (!c) return { ok: false, msg: 'Mã giảm giá không tồn tại' };
    const { subtotal } = totals();
    if (subtotal < c.min) return { ok: false, msg: `Đơn hàng tối thiểu ${DT.u.money(c.min)} để dùng mã này` };
    state.coupon = c.code; save();
    return { ok: true, msg: `Đã áp dụng: ${c.desc}` };
  }
  const removeCoupon = () => { state.coupon = null; save(); };

  // ---------- Danh sách id (yêu thích, so sánh, đã xem)
  function toggle(list, id, limit) {
    const arr = state[list];
    const i = arr.indexOf(id);
    if (i >= 0) { arr.splice(i, 1); save(); return false; }
    if (limit && arr.length >= limit) return null;
    arr.push(id); save(); return true;
  }
  const toggleWishlist = (id) => toggle('wishlist', id);
  const toggleCompare = (id) => toggle('compare', id, 4);
  const clearCompare = () => { state.compare = []; save(); };
  function addViewed(id) {
    state.viewed = [id, ...state.viewed.filter((x) => x !== id)].slice(0, 12);
    save();
  }

  // ---------- Tài khoản (demo - giai đoạn 2 chuyển sang API có mã hóa mật khẩu)
  function register({ name, phone, email, password }) {
    if (state.users.some((u) => u.phone === phone)) return { ok: false, msg: 'Số điện thoại đã được đăng ký' };
    const user = { id: Date.now(), name, phone, email, password, addresses: [], createdAt: new Date().toISOString() };
    state.users.push(user);
    state.user = { id: user.id, name, phone, email };
    save();
    return { ok: true };
  }
  function login(phone, password) {
    const u = state.users.find((x) => x.phone === phone && x.password === password);
    if (!u) return { ok: false, msg: 'Sai số điện thoại hoặc mật khẩu' };
    state.user = { id: u.id, name: u.name, phone: u.phone, email: u.email };
    save();
    return { ok: true };
  }
  const logout = () => { state.user = null; save(); };
  function updateProfile(data) {
    if (!state.user) return;
    Object.assign(state.user, data);
    const u = state.users.find((x) => x.id === state.user.id);
    if (u) Object.assign(u, data);
    save();
  }
  const fullUser = () => state.user && state.users.find((x) => x.id === state.user.id);
  function saveAddresses(list) {
    const u = fullUser();
    if (u) { u.addresses = list; save(); }
  }

  // ---------- Đơn hàng
  function placeOrder(info) {
    const t = totals();
    if (!t.lines.length) return null;
    const code = 'DT' + Date.now().toString().slice(-8);
    const order = {
      code,
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: info.customer,
      shipping: info.shipping,
      payment: info.payment,
      invoice: info.invoice || null,
      note: info.note || '',
      items: t.lines.map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, install: l.install })),
      subtotal: t.subtotal, install: t.install, shippingFee: t.shipping, discount: t.discount, coupon: t.coupon?.code || null, total: t.total,
      userId: state.user?.id || null,
    };
    state.orders.unshift(order);
    state.cart = [];
    state.coupon = null;
    save();
    return order;
  }
  const findOrder = (code, phone) => state.orders.find((o) => o.code === String(code).trim().toUpperCase() && (!phone || o.customer.phone === phone.trim()));
  const myOrders = () => state.orders.filter((o) => state.user && (o.userId === state.user.id || o.customer.phone === state.user.phone));
  function cancelOrder(code) {
    const o = state.orders.find((x) => x.code === code);
    if (o && o.status === 'pending') { o.status = 'cancelled'; save(); return true; }
    return false;
  }

  return {
    get, save, addToCart, setQty, setInstall, removeFromCart, clearCart, cartCount, totals, applyCoupon, removeCoupon,
    toggleWishlist, toggleCompare, clearCompare, addViewed,
    register, login, logout, updateProfile, fullUser, saveAddresses,
    placeOrder, findOrder, myOrders, cancelOrder,
  };
})();

DT.orderStatus = {
  pending: { label: 'Chờ xác nhận', cls: 'warn' },
  confirmed: { label: 'Đã xác nhận', cls: 'info' },
  shipping: { label: 'Đang giao hàng', cls: 'info' },
  installing: { label: 'Đang lắp đặt', cls: 'info' },
  done: { label: 'Hoàn thành', cls: 'ok' },
  cancelled: { label: 'Đã hủy', cls: 'muted' },
};
