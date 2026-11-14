// Trạng thái phía trình duyệt: giỏ hàng, yêu thích, so sánh, tài khoản, đơn hàng.
// Giai đoạn 1 lưu localStorage; giai đoạn 2 đồng bộ với backend qua DT.api.
window.DT = window.DT || {};

DT.store = (() => {
  const KEY = "dt_shop_v1";
  const blank = () => ({
    cart: [],
    wishlist: [],
    compare: [],
    viewed: [],
    user: null,
    users: [],
    orders: [],
    coupon: null,
  });
  let state;
  try {
    state = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    state = blank();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* chế độ ẩn danh */
    }
    document.dispatchEvent(new CustomEvent("dt:change", { detail: state }));
  }
  const get = () => state;

  // ---------- Giỏ hàng
  const lineKey = (id, options = {}) =>
    Object.keys(options).length
      ? `${id}:${JSON.stringify(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)))}`
      : String(id);
  const findLine = (id, key) =>
    state.cart.find(
      (i) =>
        i.id === id &&
        (key === undefined || (i.key || lineKey(i.id, i.options)) === key),
    );
  // Số lượng tối đa của 1 sản phẩm trong giỏ = tồn kho (cộng mọi dòng cùng sản phẩm), tối đa 99
  function maxQty(id, exceptItem) {
    const p = DT.api.productById(id);
    const stock = Number(p?.stock);
    const cap = Number.isFinite(stock) ? Math.min(99, stock) : 99;
    const others = state.cart.filter((i) => String(i.id) === String(id) && i !== exceptItem).reduce((s, i) => s + i.qty, 0);
    return Math.max(0, cap - others);
  }
  function addToCart(id, qty = 1, opts = {}) {
    const p = DT.api.productById(id);
    if (!p) return false;
    if (Number(p.stock) <= 0) {
      DT.u.toast("Sản phẩm đã hết hàng", "error");
      return false;
    }
    const groups = DT.api.optionGroups(p);
    const options = Object.fromEntries(
      groups.map((group) => [group.name, opts.options?.[group.name]]),
    );
    if (groups.some((group) => !group.values.includes(options[group.name]))) {
      DT.u.toast("Vui lòng chọn đầy đủ thuộc tính sản phẩm", "error");
      return false;
    }
    const key = lineKey(id, options);
    const item = findLine(id, key);
    const n = Math.min(Math.max(1, Math.floor(Number(qty)) || 1), 99);
    const limit = maxQty(id, item);
    if (limit <= 0) {
      DT.u.toast(`Chỉ còn ${Number(p.stock)} sản phẩm trong kho`, "error");
      return false;
    }
    if (item && item.qty + n > limit) DT.u.toast(`Chỉ còn ${Number(p.stock)} sản phẩm trong kho`, "error");
    if (item) item.qty = Math.min(item.qty + n, limit);
    else state.cart.push({ id, key, qty: Math.min(n, limit), install: !!opts.install, options });
    save();
    return true;
  }
  function setQty(id, qty, key) {
    const item = findLine(id, key);
    if (!item) return;
    if (qty <= 0) state.cart = state.cart.filter((i) => i !== item);
    else {
      const limit = Math.max(1, maxQty(id, item));
      if (qty > limit) DT.u.toast(`Chỉ còn ${limit} sản phẩm trong kho`, "error");
      item.qty = Math.min(qty, limit);
    }
    save();
  }
  function setInstall(id, on, key) {
    const item = findLine(id, key);
    if (item) {
      item.install = on;
      save();
    }
  }
  const removeFromCart = (id, key) => setQty(id, 0, key);
  const clearCart = () => {
    state.cart = [];
    state.coupon = null;
    save();
  };
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
    if (JSON.stringify([state.cart, state.wishlist, state.compare]) !== before)
      save();
  }

  // Tính tổng tiền giỏ hàng, gồm phí lắp đặt, vận chuyển và mã giảm giá
  // Đơn hàng, mã giảm giá, lead, đánh giá: demo hay MySQL do core/datasource.js quyết định
  const source = () => DT.dataSource.current();
  function findCoupon(code) {
    const own = source().findCoupon(code);
    if (own !== undefined) return own;
    return (
      (state.couponObj?.code === code ? state.couponObj : null) ||
      (DT.couponCatalog || DT.coupons).find((c) => c.code === code)
    );
  }
  // method: 'delivery' | 'pickup'. Công thức trong DT.promotions.quote (khớp server/shop.php orderQuote)
  function totals(phone = state.user?.phone, method = "delivery") {
    const lines = state.cart
      .map((i) => ({
        ...i,
        key: i.key || lineKey(i.id, i.options),
        product: DT.api.productById(i.id),
      }))
      .filter((l) => l.product);
    const c = state.coupon && findCoupon(state.coupon);
    const result = c
      ? DT.promotions.evaluate(c, lines, {
          phone,
          orders: state.orders,
          ...source().couponContext(),
        })
      : null;
    const quote = DT.promotions.quote(
      lines,
      DT.config,
      method,
      result?.ok ? result : null,
    );
    return {
      lines,
      ...quote,
      coupon: result?.ok ? c : null,
      couponError: result && !result.ok ? result.msg : null,
    };
  }
  // Mã công khai kiểm tra tại chỗ; mã riêng hỏi server (validate_coupon)
  async function applyCoupon(code, phone = state.user?.phone) {
    code = String(code).trim().toUpperCase();
    const { lines } = totals(phone);
    const r = await source().validateCoupon({
      code,
      coupon: findCoupon(code),
      lines,
      phone,
    });
    if (!r.ok) return { ok: false, msg: r.msg };
    if (r.remote) state.couponObj = r.coupon; // mã riêng do máy chủ xác nhận: giữ lại để tính tổng tiền
    state.coupon = r.coupon.code;
    save();
    return { ok: true, msg: `Đã áp dụng: ${r.coupon.desc || r.coupon.code}` };
  }
  const removeCoupon = () => {
    state.coupon = null;
    save();
  };

  // ---------- Danh sách id (yêu thích, so sánh, đã xem)
  function toggle(list, id, limit) {
    const arr = state[list];
    const i = arr.indexOf(id);
    if (i >= 0) {
      arr.splice(i, 1);
      save();
      return false;
    }
    if (limit && arr.length >= limit) return null;
    arr.push(id);
    save();
    return true;
  }
  const toggleWishlist = (id) => toggle("wishlist", id);
  const toggleCompare = (id) => toggle("compare", id, 4);
  const clearCompare = () => {
    state.compare = [];
    save();
  };
  function addViewed(id) {
    state.viewed = [id, ...state.viewed.filter((x) => x !== id)].slice(0, 12);
    save();
  }

  // ---------- Tài khoản
  // Có backend: PHP session + hồ sơ MySQL. Demo: lưu trên trình duyệt để thử giao diện.
  const be = () => DT.backend.enabled;
  async function register({ name, phone, email, password }) {
    if (be()) {
      try {
        state.user = await DT.backend.signUp({ name, phone, email, password });
      } catch (e) {
        return { ok: false, msg: e.message };
      }
      save();
      return { ok: true };
    }
    if (state.users.some((u) => u.phone === phone))
      return { ok: false, msg: "Số điện thoại đã được đăng ký" };
    const user = {
      id: Date.now(),
      name,
      phone,
      email,
      password,
      addresses: [],
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    state.user = { id: user.id, name, phone, email };
    save();
    return { ok: true };
  }
  async function login(phone, password) {
    if (be()) {
      try {
        state.user = await DT.backend.signIn(phone, password);
      } catch (e) {
        return { ok: false, msg: e.message };
      }
      save();
      return { ok: true };
    }
    const u = state.users.find(
      (x) => x.phone === phone && x.password === password,
    );
    if (!u) return { ok: false, msg: "Sai số điện thoại hoặc mật khẩu" };
    state.user = { id: u.id, name: u.name, phone: u.phone, email: u.email };
    save();
    return { ok: true };
  }
  async function logout() {
    // Xóa thông tin tài khoản trên máy trước, rồi mới báo máy chủ
    state.user = null;
    state.myOrders = [];
    save();
    if (be()) await DT.backend.signOut();
  }
  async function changePassword(current, password) {
    if (!state.user) return { ok: false, msg: "Vui lòng đăng nhập" };
    if (String(password || "").length < 8) return { ok: false, msg: "Mật khẩu mới cần ít nhất 8 ký tự" };
    if (be()) {
      try {
        await DT.backend.changePassword(current, password);
      } catch (e) {
        return { ok: false, msg: e.message };
      }
      return { ok: true, msg: "Đã đổi mật khẩu" };
    }
    const u = state.users.find((x) => x.id === state.user.id);
    if (!u || u.password !== current) return { ok: false, msg: "Mật khẩu hiện tại không đúng" };
    u.password = password;
    save();
    return { ok: true, msg: "Đã đổi mật khẩu" };
  }
  async function updateProfile(data) {
    if (!state.user) return;
    if (be()) {
      const rows = await DT.backend.update(
        "profiles",
        `id=eq.${state.user.id}`,
        data,
      );
      if (rows[0]) state.user = { ...state.user, ...rows[0] };
    } else {
      Object.assign(state.user, data);
      const u = state.users.find((x) => x.id === state.user.id);
      if (u) Object.assign(u, data);
    }
    save();
  }
  const fullUser = () =>
    be()
      ? state.user
      : state.user && state.users.find((x) => x.id === state.user.id);
  async function saveAddresses(list) {
    if (be()) return updateProfile({ addresses: list });
    const u = fullUser();
    if (u) {
      u.addresses = list;
      save();
    }
  }

  // ---------- Đơn hàng
  // Có backend: place_order() tính lại giá trên server; đơn trả về được lưu tạm để hiện trang thành công.
  async function placeOrder(info) {
    const t = totals(info.customer.phone, info.shipping?.method);
    if (!t.lines.length) return null;
    if (state.coupon && t.couponError) throw new Error(t.couponError);
    for (const line of t.lines) {
      if (
        DT.api
          .optionGroups(line.product)
          .some((group) => !group.values.includes(line.options?.[group.name]))
      ) {
        throw new Error(
          `Vui lòng chọn lại thuộc tính cho ${line.product.name}`,
        );
      }
    }
    const order = await source().placeOrder({
      payload: {
        p_items: t.lines.map((l) => ({
          id: l.id,
          qty: l.qty,
          install: !!l.install,
          options: l.options || {},
        })),
        p_customer: info.customer,
        p_shipping: info.shipping,
        p_payment: info.payment,
        p_invoice: info.invoice || null,
        p_note: info.note || null,
        p_coupon: t.coupon?.code || null,
        p_request_id: info.requestId || null,
      },
      totals: t,
      info,
      user: state.user,
    });
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
    if (i >= 0) state.orders[i] = { ...state.orders[i], ...o };
    else state.orders.unshift(o);
    save();
    return i >= 0 ? state.orders[i] : o;
  }
  const normPhone = (p) => String(p || "").replace(/[\s.\-]/g, "");
  // Tra cứu trong bộ nhớ trình duyệt (trang đặt hàng thành công)
  const findOrder = (code, phone) =>
    state.orders.find(
      (o) =>
        o.code === String(code).trim().toUpperCase() &&
        (!phone || o.customer.phone === normPhone(phone)),
    );
  const trackOrder = (code, phone) => source().trackOrder(code, phone);
  const myOrders = () => state.myOrders || [];
  async function syncMyOrders() {
    state.myOrders = await source().myOrders(state.user);
    save();
    return myOrders();
  }
  const cancelOrder = (code, phone) => source().cancelOrder(code, phone);

  return {
    get,
    save,
    addToCart,
    setQty,
    setInstall,
    removeFromCart,
    clearCart,
    cartCount,
    prune,
    totals,
    applyCoupon,
    removeCoupon,
    toggleWishlist,
    toggleCompare,
    clearCompare,
    addViewed,
    register,
    login,
    logout,
    changePassword,
    updateProfile,
    fullUser,
    saveAddresses,
    placeOrder,
    findOrder,
    rememberOrder,
    trackOrder,
    myOrders,
    syncMyOrders,
    cancelOrder,
  };
})();

DT.paymentStatus = {
  unpaid: { label: "Chưa thanh toán", cls: "warn" },
  partial: { label: "Thanh toán một phần", cls: "warn" },
  paid: { label: "Đã thanh toán", cls: "ok" },
  refunded: { label: "Đã hoàn tiền", cls: "muted" },
};

DT.orderStatus = {
  pending: { label: "Chờ xác nhận", cls: "warn" },
  confirmed: { label: "Đã xác nhận", cls: "info" },
  shipping: { label: "Đang giao hàng", cls: "info" },
  installing: { label: "Đang lắp đặt", cls: "info" },
  done: { label: "Hoàn thành", cls: "ok" },
  cancelled: { label: "Đã hủy", cls: "muted" },
};
