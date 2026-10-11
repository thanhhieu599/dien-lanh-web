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
    const c = state.coupon && (DT.coupons.find((x) => x.code === state.coupon) || (state.couponObj?.code === state.coupon ? state.couponObj : null));
    if (c && subtotal >= c.min) {
      // Cùng công thức với hàm coupon_discount() trên server
      if (c.type === 'percent') discount = Math.min(Math.floor(subtotal * c.value / 100), c.max || Infinity);
      if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
      if (c.type === 'ship') shipping = 0;
    }
    return { lines, subtotal, install, shipping, discount, coupon: c && subtotal >= c.min ? c : null, total: Math.max(0, subtotal + install + shipping - discount) };
  }
  // Mã công khai kiểm tra tại chỗ; mã riêng hỏi server (validate_coupon)
  async function applyCoupon(code) {
    code = String(code).trim().toUpperCase();
    const c = DT.coupons.find((x) => x.code === code);
    const { subtotal } = totals();
    if (!c && DT.backend.enabled) {
      const r = await DT.backend.rpc('validate_coupon', { p_code: code, p_subtotal: subtotal });
      if (!r.ok) return { ok: false, msg: r.msg };
      const k = r.coupon;
      state.couponObj = { code: k.code, type: k.type, value: Number(k.value), max: k.max == null ? null : Number(k.max), min: Number(k.min), desc: k.desc };
      state.coupon = k.code; save();
      return { ok: true, msg: `Đã áp dụng: ${k.desc || k.code}` };
    }
    if (!c) return { ok: false, msg: 'Mã giảm giá không tồn tại' };
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

  // ---------- Tài khoản
  // Có backend: Supabase Auth + bảng profiles. Demo: lưu trên trình duyệt (không mã hóa, chỉ để thử).
  const be = () => DT.backend.enabled;
  async function register({ name, phone, email, password }) {
    if (be()) {
      try { state.user = await DT.backend.signUp({ name, phone, email, password }); } catch (e) { return { ok: false, msg: e.message }; }
      save(); return { ok: true };
    }
    if (state.users.some((u) => u.phone === phone)) return { ok: false, msg: 'Số điện thoại đã được đăng ký' };
    const user = { id: Date.now(), name, phone, email, password, addresses: [], createdAt: new Date().toISOString() };
    state.users.push(user);
    state.user = { id: user.id, name, phone, email };
    save();
    return { ok: true };
  }
  async function login(phone, password) {
    if (be()) {
      try { state.user = await DT.backend.signIn(phone, password); } catch (e) { return { ok: false, msg: e.message }; }
      save(); return { ok: true };
    }
    const u = state.users.find((x) => x.phone === phone && x.password === password);
    if (!u) return { ok: false, msg: 'Sai số điện thoại hoặc mật khẩu' };
    state.user = { id: u.id, name: u.name, phone: u.phone, email: u.email };
    save();
    return { ok: true };
  }
  async function logout() {
    if (be()) await DT.backend.signOut();
    state.user = null; state.myOrders = [];
    save();
  }
  async function updateProfile(data) {
    if (!state.user) return;
    if (be()) {
      const rows = await DT.backend.update('profiles', `id=eq.${state.user.id}`, data);
      if (rows[0]) state.user = { ...state.user, ...rows[0] };
    } else {
      Object.assign(state.user, data);
      const u = state.users.find((x) => x.id === state.user.id);
      if (u) Object.assign(u, data);
    }
    save();
  }
  const fullUser = () => (be() ? state.user : state.user && state.users.find((x) => x.id === state.user.id));
  async function saveAddresses(list) {
    if (be()) return updateProfile({ addresses: list });
    const u = fullUser();
    if (u) { u.addresses = list; save(); }
  }

  // ---------- Đơn hàng
  // Có backend: place_order() tính lại giá trên server; đơn trả về được lưu tạm để hiện trang thành công.
  async function placeOrder(info) {
    const t = totals();
    if (!t.lines.length) return null;
    let order;
    if (be()) {
      order = await DT.backend.rpc('place_order', {
        p_items: t.lines.map((l) => ({ id: l.id, qty: l.qty, install: !!l.install })),
        p_customer: info.customer, p_shipping: info.shipping, p_payment: info.payment,
        p_invoice: info.invoice || null, p_note: info.note || null, p_coupon: t.coupon?.code || null,
      });
      DT.backend.clearCache(); // tồn kho / đã bán thay đổi
    } else {
      const pickup = info.shipping.method === 'pickup';
      order = {
        code: 'DT' + Date.now().toString().slice(-8),
        createdAt: new Date().toISOString(),
        status: 'pending',
        customer: info.customer, shipping: info.shipping, payment: info.payment,
        invoice: info.invoice || null, note: info.note || '',
        items: t.lines.map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, install: l.install })),
        subtotal: t.subtotal, install: t.install, shippingFee: pickup ? 0 : t.shipping, discount: t.discount, coupon: t.coupon?.code || null,
        total: t.total - (pickup ? t.shipping : 0),
        userId: state.user?.id || null,
      };
    }
    state.orders.unshift(order);
    state.orders = state.orders.slice(0, 50);
    state.cart = [];
    state.coupon = null;
    state.couponObj = null;
    save();
    return order;
  }
  // Lưu bản mới nhất từ máy chủ vào danh sách đơn trên trình duyệt (trang thành công / kết quả thanh toán)
  function rememberOrder(o) {
    const i = state.orders.findIndex((x) => x.code === o.code);
    if (i >= 0) state.orders[i] = { ...state.orders[i], ...o }; else state.orders.unshift(o);
    save();
    return i >= 0 ? state.orders[i] : o;
  }
  const normPhone = (p) => String(p || '').replace(/[\s.\-]/g, '');
  // Tra cứu trong bộ nhớ trình duyệt (trang đặt hàng thành công)
  const findOrder = (code, phone) => state.orders.find((o) => o.code === String(code).trim().toUpperCase() && (!phone || o.customer.phone === normPhone(phone)));
  async function trackOrder(code, phone) {
    if (be()) return DT.backend.rpc('track_order', { p_code: code, p_phone: phone });
    return findOrder(code, phone) || null;
  }
  function myOrders() {
    if (be()) return state.myOrders || [];
    return state.orders.filter((o) => state.user && (o.userId === state.user.id || o.customer.phone === state.user.phone));
  }
  async function syncMyOrders() {
    if (be() && state.user) { state.myOrders = await DT.backend.rpc('my_orders'); save(); }
    return myOrders();
  }
  async function cancelOrder(code, phone) {
    if (be()) {
      const o = await DT.backend.rpc('cancel_order', { p_code: code, p_phone: phone });
      DT.backend.clearCache();
      return o;
    }
    const o = state.orders.find((x) => x.code === code);
    if (o && o.status === 'pending') { o.status = 'cancelled'; save(); return o; }
    throw new Error('Không thể hủy đơn hàng này');
  }

  return {
    get, save, addToCart, setQty, setInstall, removeFromCart, clearCart, cartCount, totals, applyCoupon, removeCoupon,
    toggleWishlist, toggleCompare, clearCompare, addViewed,
    register, login, logout, updateProfile, fullUser, saveAddresses,
    placeOrder, findOrder, rememberOrder, trackOrder, myOrders, syncMyOrders, cancelOrder,
  };
})();

DT.paymentStatus = {
  unpaid: { label: 'Chưa thanh toán', cls: 'warn' },
  partial: { label: 'Thanh toán một phần', cls: 'warn' },
  paid: { label: 'Đã thanh toán', cls: 'ok' },
  refunded: { label: 'Đã hoàn tiền', cls: 'muted' },
};

DT.orderStatus = {
  pending: { label: 'Chờ xác nhận', cls: 'warn' },
  confirmed: { label: 'Đã xác nhận', cls: 'info' },
  shipping: { label: 'Đang giao hàng', cls: 'info' },
  installing: { label: 'Đang lắp đặt', cls: 'info' },
  done: { label: 'Hoàn thành', cls: 'ok' },
  cancelled: { label: 'Đã hủy', cls: 'muted' },
};
