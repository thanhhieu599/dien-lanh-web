// Nguồn dữ liệu dùng chung: demo lưu trên trình duyệt, MySQL gọi API.
// Chọn adapter khi thực hiện thao tác vì backend khởi tạo sau module này.
window.DT = window.DT || {};
DT.dataSource = (() => {
  const LEADS = 'dt_leads_v1';
  const REVIEWS = 'dt_reviews_v1';
  const adminKey = () => DT.ADMIN_DEMO_KEY || 'dt_admin_demo_v1';
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const adminState = () => read(adminKey(), {});
  const phoneKey = (phone) => DT.promotions.phoneKey(phone);
  const codeKey = (code) => String(code || '').trim().toUpperCase();
  const api = () => {
    if (!DT.backend?.enabled) throw new Error('Backend API chưa được cấu hình.');
    return DT.backend;
  };
  function recordCouponUse(code, delta) {
    if (!code) return;
    const db = adminState();
    const coupon = db.coupons?.find((c) => c.code === code);
    if (coupon) {
      coupon.used_count = Math.max(0, Number(coupon.used_count || 0) + delta);
      db.touched = { ...db.touched, coupons: true };
      write(adminKey(), db);
    }
    (DT.couponCatalog || DT.coupons || []).filter((c) => c.code === code).forEach((c) => {
      c.used_count = Math.max(0, Number(c.used_count || 0) + delta);
    });
  }
  function reviewCatalog() {
    const stored = read(REVIEWS, {});
    // Hỗ trợ cả bản adapter cũ từng lưu danh sách phẳng.
    if (!Array.isArray(stored)) return stored;
    return stored.reduce((out, review) => {
      const id = review.product_id;
      if (id != null) (out[id] ||= []).push({ ...review, date: review.date || review.created_at });
      return out;
    }, {});
  }
  const demo = {
    findCoupon(code) {
      const db = adminState();
      if (!db.touched?.coupons) return undefined;
      const row = (db.coupons || []).find((c) => c.code === codeKey(code));
      return row ? DT.rows.coupon.toView(row) : null;
    },
    couponContext() { return { customers: adminState().crm_customers || [] }; },
    async validateCoupon({ coupon, lines, phone }) {
      if (!coupon) return { ok: false, msg: 'Mã giảm giá không tồn tại' };
      const result = DT.promotions.evaluate(coupon, lines, {
        phone, orders: DT.store.get().orders, ...this.couponContext(),
      });
      return { ...result, coupon };
    },
    async placeOrder({ totals: t, info, user }) {
      const orders = DT.store.get().orders;
      let number = Number(Date.now().toString().slice(-8));
      while (orders.some((o) => o.code === `DT${number}`)) number++;
      const order = {
        code: `DT${number}`, createdAt: new Date().toISOString(), status: 'pending',
        customer: info.customer, shipping: info.shipping, payment: info.payment,
        invoice: info.invoice || null, note: info.note || '',
        items: t.lines.map((l) => ({ id: l.id, name: l.product.name, price: l.product.price, qty: l.qty, install: l.install, options: l.options || {} })),
        subtotal: t.subtotal, install: t.install, shippingFee: t.shipping,
        discount: t.discount, coupon: t.coupon?.code || null, total: t.total,
        userId: user?.id || null, maintenance: !!info.maintenance, attribution: info.attribution || null,
      };
      recordCouponUse(order.coupon, 1);
      return order;
    },
    async trackOrder(code, phone) {
      if (!phoneKey(phone)) return null;
      return DT.store.get().orders.find((o) => o.code === codeKey(code) && phoneKey(o.customer?.phone) === phoneKey(phone)) || null;
    },
    async cancelOrder(code, phone) {
      const order = await this.trackOrder(code, phone);
      if (!order || order.status !== 'pending') throw new Error('Không thể hủy đơn hàng này');
      order.status = 'cancelled';
      recordCouponUse(order.coupon, -1);
      DT.store.save();
      return order;
    },
    async myOrders(user) {
      if (!user) return [];
      return DT.store.get().orders.filter((o) =>
        (o.userId != null && String(o.userId) === String(user.id)) ||
        (phoneKey(user.phone) && phoneKey(o.customer?.phone) === phoneKey(user.phone)),
      );
    },
    async submitLead(type, data) {
      const lead = { id: `L${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, data, status: 'new', createdAt: new Date().toISOString() };
      write(LEADS, [lead, ...read(LEADS, [])]);
      return lead;
    },
    async submitReview(productId, entry) {
      const stored = reviewCatalog();
      const review = { ...entry, date: new Date().toISOString(), verified: false };
      stored[productId] = [review, ...(stored[productId] || [])];
      write(REVIEWS, stored);
      return { pending: false, review };
    },
    localReviews(productId) { return reviewCatalog()[productId] || []; },
  };
  const mysql = {
    findCoupon() { return undefined; },
    couponContext() { return { skipCustomer: true }; },
    async validateCoupon({ code, lines, phone }) {
      const result = await api().rpc('validate_coupon_cart', {
        p_code: code, p_items: lines.map((l) => ({ id: l.id, qty: l.qty })), p_phone: phone || null,
      });
      if (!result.ok) return result;
      const row = result.coupon;
      return { ...result, remote: true, coupon: DT.rows.coupon.toView({ ...row, description: row.description || row.desc }) };
    },
    async placeOrder({ payload, info }) {
      const backend = api();
      const order = await backend.rpc('place_order', payload);
      backend.clearCache();
      if (info.maintenance || info.attribution) {
        try {
          const extras = await backend.rpc('order_extras', {
            p_code: order.code, p_phone: order.customer?.phone || info.customer.phone,
            p_maintenance: info.maintenance ? true : null, p_attribution: info.attribution || null,
          });
          order.maintenance = !!extras?.maintenance;
        } catch { /* Đơn đã đặt thành công; lỗi lưu thông tin phụ không tạo lại đơn. */ }
      }
      return order;
    },
    trackOrder(code, phone) { return api().rpc('track_order', { p_code: code, p_phone: phone }); },
    async cancelOrder(code, phone) {
      const order = await api().rpc('cancel_order', { p_code: code, p_phone: phone });
      api().clearCache();
      return order;
    },
    async myOrders(user) { return user ? api().rpc('my_orders') : []; },
    submitLead(type, data) {
      return api().rpc('submit_lead', { p_type: type, p_data: data, p_source_url: location.href });
    },
    async submitReview(productId, entry) {
      await api().insert('reviews', { ...entry, product_id: productId });
      return { pending: true };
    },
    localReviews() { return []; },
  };
  return { demo, mysql, current: () => DT.backend?.enabled ? mysql : demo };
})();
