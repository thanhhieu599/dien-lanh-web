window.DT = window.DT || {};
DT.promotions = (() => {
  const phoneKey = (phone) =>
    String(phone || "")
      .replace(/[^0-9+]/g, "")
      .replace(/^\+?84/, "0");
  function evaluate(c, lines, context = {}) {
    const fail = (msg) => ({ ok: false, msg, discount: 0, free_ship: false });
    if (!c || c.active === false)
      return fail("Mã giảm giá không tồn tại hoặc đã tắt");
    const now = Date.now();
    if (
      (c.starts_at && now < new Date(c.starts_at).getTime()) ||
      (c.ends_at && now >= new Date(c.ends_at).getTime())
    )
      return fail("Mã giảm giá chưa có hiệu lực hoặc đã hết hạn");
    if (c.usage_limit != null && Number(c.used_count || 0) >= c.usage_limit)
      return fail("Mã giảm giá đã hết lượt sử dụng");
    const subtotal = lines.reduce(
      (sum, line) => sum + line.product.price * line.qty,
      0,
    );
    const eligible = lines.filter(({ product: p }) => {
      if (
        c.combine_discounts === false &&
        ((p.oldPrice || 0) > p.price || p.flashSale)
      )
        return false;
      if (c.scope === "products")
        return (c.product_ids || []).some((id) => String(id) === String(p.id));
      if (c.scope === "categories")
        return (c.category_ids || []).some((id) => DT.api.inCategory(p, id));
      return true;
    });
    const base = eligible.reduce(
      (sum, line) => sum + line.product.price * line.qty,
      0,
    );
    const qty = eligible.reduce((sum, line) => sum + line.qty, 0);
    if (!qty) return fail("Giỏ hàng chưa có sản phẩm đủ điều kiện áp dụng mã");
    if (subtotal < Number(c.min || 0))
      return fail(`Đơn hàng tối thiểu ${DT.u.money(c.min)} để dùng mã này`);
    if (
      c.condition_type === "eligible_min" &&
      base < Number(c.condition_value || 0)
    )
      return fail(
        `Giá trị sản phẩm được khuyến mãi tối thiểu ${DT.u.money(c.condition_value)}`,
      );
    if (
      c.condition_type === "eligible_qty" &&
      qty < Number(c.condition_value || 0)
    )
      return fail(
        `Cần ít nhất ${c.condition_value} sản phẩm đủ điều kiện khuyến mãi`,
      );
    if (!context.skipCustomer) {
      const phone = phoneKey(context.phone);
      if ((c.once_per_customer || c.customer_groups?.length) && !phone)
        return fail(
          "Vui lòng đăng nhập hoặc nhập số điện thoại thanh toán để áp dụng mã",
        );
      if (
        c.once_per_customer &&
        (context.orders || []).some(
          (o) =>
            o.coupon === c.code &&
            o.status !== "cancelled" &&
            phoneKey(o.customer?.phone) === phone,
        )
      )
        return fail("Khách hàng đã sử dụng mã này");
      if (c.customer_groups?.length) {
        const customers = (context.customers || []).filter(
          (customer) => phoneKey(customer.phone) === phone,
        );
        const matches = c.customer_groups.some((group) =>
          customers.some((customer) =>
            group === "vip"
              ? (customer.tags || []).includes("VIP")
              : group === "marketing"
                ? customer.marketing_opt_in === true
                : group.startsWith("tag:") &&
                  (customer.tags || []).includes(group.slice(4)),
          ),
        );
        if (!matches)
          return fail("Mã chỉ dành cho nhóm khách hàng đã được chọn");
      }
    }
    let discount =
      c.type === "percent"
        ? Math.floor((base * Number(c.value)) / 100)
        : c.type === "fixed"
          ? Math.min(base, Number(c.value))
          : 0;
    if (c.max != null && c.type === "percent")
      discount = Math.min(discount, Number(c.max));
    return {
      ok: true,
      msg: `Đã áp dụng: ${c.desc || c.description || c.code}`,
      discount: Math.max(0, Math.min(base, discount)),
      free_ship: c.type === "ship",
      base,
      qty,
    };
  }
  // Tổng tiền đơn hàng: PHẢI khớp orderQuote() trong server/shop.php (máy chủ là chuẩn khi chốt đơn).
  // Cả hai được kiểm bằng cùng bộ ca tests/fixtures/pricing.json.
  // method: 'delivery' | 'pickup'; coupon: kết quả evaluate() hợp lệ hoặc null
  function quote(lines, config = {}, method = "delivery", coupon = null) {
    const installFee = config.installFee ?? 300000;
    const freeShipThreshold = config.freeShipThreshold ?? 2000000;
    const shippingFee = config.shippingFee ?? 50000;
    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
    const install = lines.reduce(
      (sum, l) =>
        sum +
        (l.install && !l.product.freeInstall && l.product.cat === "may-lanh"
          ? installFee * l.qty
          : 0),
      0,
    );
    let shipping =
      method === "pickup" || subtotal === 0 || subtotal >= freeShipThreshold
        ? 0
        : shippingFee;
    const discount = coupon ? coupon.discount : 0;
    if (coupon?.free_ship) shipping = 0;
    return {
      subtotal,
      install,
      shipping,
      discount,
      total: Math.max(0, subtotal + install + shipping - discount),
    };
  }
  return { evaluate, quote, phoneKey };
})();
