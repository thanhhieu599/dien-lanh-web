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
  const lineKey = (id, options = {}) => Object.keys(options).length ? `${id}:${JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)))}` : String(id);
  const findLine = (id, key) => state.cart.find((i) => i.id === id && (key === undefined || (i.key || lineKey(i.id, i.options)) === key));
  function addToCart(id, qty = 1, opts = {}) {
    const p = DT.api.productById(id);
    if (!p) return false;
    const groups = DT.api.optionGroups(p);
    const options = Object.fromEntries(groups.map((group) => [group.name, opts.options?.[group.name]]));
    if (groups.some((group) => !group.values.includes(options[group.name]))) {
      DT.u.toast('Vui lòng chọn đầy đủ thuộc tính sản phẩm', 'error');
      return false;
    }
    const key = lineKey(id, options);
    const item = findLine(id, key);
    const n = Math.min(Math.max(1, Math.floor(Number(qty)) || 1), 99);
    if (item) item.qty = Math.min(item.qty + n, 99);
    else state.cart.push({ id, key, qty: n, install: !!opts.install, options });
    save();
    return true;
  }
  function setQty(id, qty, key) {
    const item = findLine(id, key);
    if (!item) return;
    if (qty <= 0) state.cart = state.cart.filter((i) => i !== item);
    else item.qty = Math.min(qty, 99);
    save();
  }
  function setInstall(id, on, key) {
    const item = findLine(id, key);
    if (item) { item.install = on; save(); }
  }
  const removeFromCart = (id, key) => setQty(id, 0, key);
  const clearCart = () => { state.cart = []; state.coupon = null; save(); };
  const cartCount = () => state.cart.reduce((s, i) => s + i.qty, 0);
  // Bỏ khỏi giỏ / yêu thích / so sánh các sản phẩm đã ngừng kinh doanh (admin ẩn hoặc xóa).
  // Không chạy khi máy chủ lỗi (đang dùng dữ liệu dự phòng) để không xóa nhầm giỏ hàng của khách.
  function prune() {
    if (DT.backend?.offline) return;
    const ok = (id) => !!DT.api.productById(id);
    const before = JSON.stringify([state.cart, state.wishlist, state.compare]);
    state.cart = state.cart.filter((i) => ok(i.id));
    state.wishlist = (state.wishlist || []).filter(ok);
    state.compare = (state.compare || []).filter(ok);
    if (JSON.stringify([state.cart, state.wishlist, state.compare]) !== before) save();
  }

  // Tính tổng tiền giỏ hàng, gồm phí lắp đặt, vận chuyển và mã giảm giá
  function demoAdminState() {
    try { return JSON.parse(localStorage.getItem(DT.ADMIN_DEMO_KEY || 'dt_admin_demo_v1') || '{}'); } catch { return {}; }
  }
  function findCoupon(code) {
    if (!DT.backend?.enabled) {
      const db = demoAdminState();
      if (db.touched?.coupons) {
        const c = db.coupons.find((c) => c.code === code);
        return c ? { ...c, desc: c.description } : null;
      }
    }
    return (state.couponObj?.code === code ? state.couponObj : null) || (DT.couponCatalog || DT.coupons).find((c) => c.code === code);
  }
  function recordDemoCouponUse(code, delta) {
    if (!code) return;
    const db = demoAdminState();
    const c = db.coupons?.find((c) => c.code === code);
    if (c) {
      c.used_count = Math.max(0, Number(c.used_count || 0) + delta);
      db.touched = { ...db.touched, coupons: true };
      localStorage.setItem(DT.ADMIN_DEMO_KEY || 'dt_admin_demo_v1', JSON.stringify(db));
    }
    (DT.couponCatalog || DT.coupons).filter((c) => c.code === code).forEach((c) => { c.used_count = Math.max(0, Number(c.used_count || 0) + delta); });
  }
  function totals(phone = state.user?.phone) {
    const cfg = DT.config;
    const lines = state.cart.map((i) => ({ ...i, key: i.key || lineKey(i.id, i.options), product: DT.api.productById(i.id) })).filter((l) => l.product);
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const install = lines.reduce((s, l) => s + (l.install && !l.product.freeInstall && l.product.cat === 'may-lanh' ? cfg.installFee * l.qty : 0), 0);
    let shipping = subtotal === 0 || subtotal >= cfg.freeShipThreshold ? 0 : cfg.shippingFee;
    let discount = 0;
    const c = state.coupon && findCoupon(state.coupon);
    const result = c ? DT.promotions.evaluate(c, lines, { phone, orders: state.orders, customers: demoAdminState().crm_customers || [], skipCustomer: !!DT.backend?.enabled }) : null;
    if (result?.ok) { discount = result.discount; if (result.free_ship) shipping = 0; }
    return { lines, subtotal, install, shipping, discount, coupon: result?.ok ? c : null, couponError: result && !result.ok ? result.msg : null, total: Math.max(0, subtotal + install + shipping - discount) };
  }
  // Mã công khai kiểm tra tại chỗ; mã riêng hỏi server (validate_coupon)
  async function applyCoupon(code, phone = state.user?.phone) {
    code = String(code).trim().toUpperCase();
    const c = findCoupon(code);
    const { lines } = totals(phone);
    if (DT.backend.enabled) {
      const r = await DT.backend.rpc('validate_coupon_cart', { p_code: code, p_items: lines.map((line) => ({ id: line.id, qty: line.qty })), p_phone: phone || null });
      if (!r.ok) return { ok: false, msg: r.msg };
      const k = r.coupon;
      state.couponObj = { ...k, code: k.code, type: k.type, value: Number(k.value), max: k.max == null ? null : Number(k.max), min: Number(k.min), desc: k.description || k.desc };
      state.coupon = k.code; save();
      return { ok: true, msg: `Đã áp dụng: ${k.desc || k.code}` };
    }
    if (!c) return { ok: false, msg: 'Mã giảm giá không tồn tại' };
    const result = DT.promotions.evaluate(c, lines, { phone, orders: state.orders, customers: demoAdminState().crm_customers || [] });
    if (!result.ok) return result;
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
  // Có backend: PHP session + hồ sơ MySQL. Demo: lưu trên trình duyệt để thử giao diện.
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
    // Xóa thông tin tài khoản trên máy trước, rồi mới báo máy chủ
    state.user = null; state.myOrders = [];
    save();
    if (be()) await DT.backend.signOut();
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
    const t = totals(info.customer.phone);
    if (!t.lines.length) return null;
    if (state.coupon && t.couponError) throw new Error(t.couponError);
    for (const line of t.lines) {
      if (DT.api.optionGroups(line.product).some((group) => !group.values.includes(line.options?.[group.name]))) {
        throw new Error(`Vui lòng chọn lại thuộc tính cho ${line.product.name}`);
      }
    }
    let order;
    if (be()) {
      order = await DT.backend.rpc('place_order', {
        p_items: t.lines.map((l) => ({ id: l.id, qty: l.qty, install: !!l.install, options: l.options || {} })),
        p_customer: info.customer, p_shipping: info.shipping, p_payment: info.payment,
        p_invoice: info.invoice || null, p_note: info.note || null, p_coupon: t.coupon?.code || null,
      });
      DT.backend.clearCache(); // tồn kho / đã bán thay đổi
      // Đồng ý nhắc bảo trì + nguồn khách (quảng cáo): lỗi ở bước này không ảnh hưởng đơn đã đặt
      if (info.maintenance || info.attribution) {
        try {
          const x = await DT.backend.rpc('order_extras', { p_code: order.code, p_phone: order.customer?.phone || info.customer.phone, p_maintenance: info.maintenance ? true : null, p_attribution: info.attribution || null });
          order.maintenance = !!x?.maintenance;
        } catch { /* bỏ qua */ }
      }
    } else {
      const pickup = info.shipping.method === 'pickup';
      order = {
        code: 'DT' + Date.now().toString().slice(-8),
        createdAt: new Date().toISOString(),
        status: 'pending',
        customer: info.customer, shipping: info.shipping, payment: info.payment,
        invoice: info.invoice || null, note: info.note || '',
        items: t.lines.map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, install: l.install, options: l.options || {} })),
        subtotal: t.subtotal, install: t.install, shippingFee: pickup ? 0 : t.shipping, discount: t.discount, coupon: t.coupon?.code || null,
        total: t.total - (pickup ? t.shipping : 0),
        userId: state.user?.id || null,
        maintenance: !!info.maintenance,
        attribution: info.attribution || null,
      };
      recordDemoCouponUse(t.coupon?.code, 1);
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
    if (o && o.status === 'pending') { o.status = 'cancelled'; recordDemoCouponUse(o.coupon, -1); save(); return o; }
    throw new Error('Không thể hủy đơn hàng này');
  }

  return {
    get, save, addToCart, setQty, setInstall, removeFromCart, clearCart, cartCount, prune, totals, applyCoupon, removeCoupon,
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
