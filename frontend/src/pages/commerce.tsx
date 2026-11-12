import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { dt, formValues, money, safeUrl, toast } from "../services/runtime";
import { useShop } from "../hooks/useShop";
import {
  Breadcrumb,
  Empty,
  Picture,
  ShopLink,
  useMeta,
} from "../components/common";
import { Field } from "../components/forms";
import { ProductGrid } from "../components/products";
import type { Row, Product } from "../types";

export function CartPage() {
  useShop();
  useMeta("Giỏ hàng");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const totals = dt.store.totals();
  async function coupon(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await dt.store.applyCoupon(code);
      toast(result.msg, !result.ok);
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(false);
    }
  }
  if (!totals.lines.length)
    return <Empty heading={1} title="Giỏ hàng của bạn đang trống" />;
  return (
    <>
      <Breadcrumb items={[{ label: "Giỏ hàng" }]} />
      <div className="container">
        <h1>Giỏ hàng ({dt.store.cartCount()})</h1>
        <div className="cart-layout">
          <section className="cart-items">
            {totals.lines.map((line: Row) => (
              <article className="cart-item" key={line.key}>
                <ShopLink href={dt.api.url(line.product)} className="ci-img">
                  <Picture product={line.product} />
                </ShopLink>
                <div className="ci-info">
                  <ShopLink className="ci-name" href={dt.api.url(line.product)}>
                    {line.product.name}
                  </ShopLink>
                  <p>{dt.api.optionText(line.options || {})}</p>
                  <b>{money(line.product.price)}</b>
                  <label>
                    Số lượng{" "}
                    <input
                      aria-label={`Số lượng ${line.product.name}`}
                      type="number"
                      min={1}
                      max={99}
                      value={line.qty}
                      onChange={(e) =>
                        dt.store.setQty(
                          line.id,
                          Math.max(
                            1,
                            Math.min(99, Number(e.target.value) || 1),
                          ),
                          line.key,
                        )
                      }
                    />
                  </label>
                  {line.product.cat === "may-lanh" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={line.install}
                        onChange={(e) =>
                          dt.store.setInstall(
                            line.id,
                            e.target.checked,
                            line.key,
                          )
                        }
                      />{" "}
                      Yêu cầu lắp đặt ({money(dt.config.installFee)}/máy)
                    </label>
                  )}
                  <button
                    className="link"
                    onClick={() => dt.store.removeFromCart(line.id, line.key)}
                  >
                    Xóa
                  </button>
                </div>
                <strong>{money(line.product.price * line.qty)}</strong>
              </article>
            ))}
          </section>
          <aside className="summary">
            <h2>Thông tin đơn hàng</h2>
            <Totals totals={totals} />
            <form className="react-coupon" onSubmit={coupon}>
              <input
                name="coupon"
                aria-label="Mã giảm giá"
                placeholder="Mã giảm giá"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                className="btn btn-outline"
                aria-busy={busy}
                disabled={busy}
              >
                Áp dụng
              </button>
            </form>
            <div className="coupon-chips">
              {dt.coupons.map((c: Row) => (
                <button
                  className="coupon-chip"
                  key={c.code}
                  onClick={() => setCode(c.code)}
                >
                  {c.code}
                </button>
              ))}
            </div>
            {totals.coupon && (
              <p>
                {totals.coupon.code}{" "}
                <button
                  className="link"
                  onClick={() => dt.store.removeCoupon()}
                >
                  Bỏ mã
                </button>
              </p>
            )}
            {totals.couponError && <p role="alert">{totals.couponError}</p>}
            <ShopLink
              href="thanh-toan.html"
              className="btn btn-primary btn-block btn-lg"
            >
              Tiến hành thanh toán
            </ShopLink>
            <ShopLink
              href="bao-gia-du-an.html"
              className="btn btn-outline btn-block"
            >
              Nhận báo giá doanh nghiệp
            </ShopLink>
          </aside>
        </div>
      </div>
    </>
  );
}
function Totals({ totals }: { totals: Row }) {
  return (
    <>
      <div className="sum-row">
        <span>Tạm tính</span>
        <b>{money(totals.subtotal)}</b>
      </div>
      <div className="sum-row">
        <span>Lắp đặt</span>
        <b>{money(totals.install)}</b>
      </div>
      <div className="sum-row">
        <span>Giao hàng</span>
        <b className="free-ship">{totals.shipping ? money(totals.shipping) : "Miễn phí"}</b>
      </div>
      <div className="sum-row">
        <span>Giảm giá</span>
        <b>-{money(totals.discount)}</b>
      </div>
      <div className="sum-total">
        <span>Tổng thanh toán</span>
        <b>{money(totals.total)}</b>
      </div>
    </>
  );
}
export function CheckoutPage() {
  // Giá / tồn kho mới nhất trước khi khách đặt (admin có thể vừa sửa)
  useEffect(() => { dt.backend?.refresh?.(); }, []);
  const state = useShop();
  const navigate = useNavigate();
  const [method, setMethod] = useState("delivery");
  const [invoice, setInvoice] = useState(false);
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);
  useMeta("Thanh toán");
  useEffect(() => {
    dt.analytics?.beginCheckout?.(dt.store.totals());
  }, []);
  const totals = dt.store.totals(undefined, method);
  const address =
    state.user?.addresses?.find((a: Row) => a.default) ||
    state.user?.addresses?.[0];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formValues(event.currentTarget);
    if (!dt.u.validPhone(data.phone)) {
      toast("Số điện thoại không hợp lệ", true);
      return;
    }
    setBusy(true);
    try {
      const order = await dt.store.placeOrder({
        customer: {
          gender: data.gender,
          name: data.name.trim(),
          phone: data.phone,
          email: data.email || "",
        },
        shipping:
          method === "pickup"
            ? {
                method,
                store: dt.stores.find((s) => String(s.id) === data.store)?.name,
              }
            : {
                method,
                province: data.province,
                district: data.district,
                address: data.address,
                date: data.date,
                slot: data.slot,
              },
        payment,
        invoice: invoice
          ? {
              company: data.company,
              taxCode: data.taxCode,
              address: data.companyAddress,
              email: data.invoiceEmail,
            }
          : null,
        note: data.note,
        maintenance: !!data.maintenance,
        attribution: dt.analytics?.attribution?.() || null,
      });
      if (!order) throw new Error("Giỏ hàng không còn sản phẩm");
      dt.analytics?.purchase?.(order);
      navigate(`/dat-hang-thanh-cong.html?code=${order.code}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  }
  if (!totals.lines.length)
    return <Empty heading={1} title="Giỏ hàng chưa có sản phẩm" />;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Giỏ hàng", href: "gio-hang.html" },
          { label: "Thanh toán" },
        ]}
      />
      <div className="container">
        <h1>Thanh toán</h1>
        <form id="co-form" className="checkout-layout" onSubmit={submit}>
          <div className="co-main">
            <section className="co-section">
              <h2>1. Thông tin khách hàng</h2>
              <Field
                label="Họ tên"
                name="name"
                required
                defaultValue={state.user?.name || ""}
              />
              <div className="form-row">
                <Field
                  label="Số điện thoại"
                  name="phone"
                  type="tel"
                  required
                  defaultValue={state.user?.phone || ""}
                />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={state.user?.email || ""}
                />
              </div>
              <Field label="Xưng hô">
                <select name="gender">
                  <option value="anh">Anh</option>
                  <option value="chi">Chị</option>
                </select>
              </Field>
            </section>
            <section className="co-section">
              <h2>2. Nhận hàng</h2>
              <div className="radio-cards">
                {[
                  ["delivery", "Giao hàng tận nơi"],
                  ["pickup", "Nhận tại cửa hàng"],
                ].map(([v, l]) => (
                  <label className="radio-card" key={v}>
                    <input
                      type="radio"
                      name="method"
                      value={v}
                      checked={method === v}
                      onChange={() => setMethod(v)}
                    />
                    {l}
                  </label>
                ))}
              </div>
              {method === "delivery" ? (
                <>
                  <div className="form-row">
                    <Field
                      label="Tỉnh / thành phố"
                      name="province"
                      required
                      defaultValue={address?.province || ""}
                    />
                    <Field
                      label="Quận / huyện"
                      name="district"
                      required
                      defaultValue={address?.district || ""}
                    />
                  </div>
                  <Field
                    label="Địa chỉ cụ thể"
                    name="address"
                    required
                    defaultValue={address?.address || ""}
                  />
                  <div className="form-row">
                    <Field
                      label="Ngày giao mong muốn"
                      name="date"
                      type="date"
                      min={dt.u.today()}
                    />
                    <Field label="Khung giờ">
                      <select name="slot">
                        <option>8:00 - 12:00</option>
                        <option>13:00 - 17:00</option>
                        <option>17:00 - 21:00</option>
                      </select>
                    </Field>
                  </div>
                </>
              ) : (
                <Field label="Cửa hàng">
                  <select name="store" required>
                    {dt.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.address}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Ghi chú">
                <textarea name="note" />
              </Field>
            </section>
            <section className="co-section">
              <h2>3. Phương thức thanh toán</h2>
              <div className="radio-cards">
                {Object.entries(dt.payments.METHODS as Record<string, string>)
                  .map(([v, l]) => (
                    <label className="radio-card" key={String(v)}>
                      <input
                        type="radio"
                        name="payment"
                        value={String(v)}
                        checked={payment === v}
                        onChange={() => setPayment(String(v))}
                      />
                      {l}
                    </label>
                  ))}
              </div>
              {payment === "bank" && (
                <div className="bank-info react-bank-info">
                  <p>{dt.config.bankName}</p>
                  <b>{dt.config.bankAccount}</b>
                  <p>{dt.config.bankOwner}</p>
                  <p>
                    Mã QR và nội dung chuyển khoản sẽ hiển thị sau khi đặt hàng.
                  </p>
                </div>
              )}
            </section>
            <section className="co-section">
              <h2>4. Hóa đơn</h2>
              <label className="check">
                <input
                  type="checkbox"
                  name="needInvoice"
                  checked={invoice}
                  onChange={(e) => setInvoice(e.target.checked)}
                />{" "}
                Xuất hóa đơn GTGT cho công ty
              </label>
              {invoice && (
                <>
                  <Field label="Tên công ty" name="company" required />
                  <Field label="Mã số thuế" name="taxCode" required />
                  <Field label="Địa chỉ công ty" name="companyAddress" />
                  <Field
                    label="Email nhận hóa đơn"
                    name="invoiceEmail"
                    type="email"
                  />
                </>
              )}
            </section>
          </div>
          <aside className="summary">
            <h2>Đơn hàng của bạn</h2>
            {totals.lines.map((line: Row) => (
              <p key={line.key}>
                {line.product.name} × {line.qty}
              </p>
            ))}
            <Totals totals={totals} />
            <label className="check">
              <input type="checkbox" name="agree" required /> Tôi đồng ý với{" "}
              <ShopLink href="chinh-sach.html?type=thanh-toan">
                điều khoản mua hàng
              </ShopLink>
            </label>
            <button
              className="btn btn-primary btn-block btn-lg"
              disabled={busy || dt.backend.offline}
            >
              {busy ? "Đang gửi đơn hàng…" : "ĐẶT HÀNG"}
            </button>
          </aside>
        </form>
      </div>
    </>
  );
}
const statusLabel = (status: string) => dt.orderStatus[status]?.label || status;
export function OrderDetails({
  order: initial,
  canCancel = true,
}: {
  order: Row;
  canCancel?: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function cancel() {
    if (!confirm(`Bạn muốn hủy đơn ${order.code}?`)) return;
    setBusy(true);
    try {
      const updated = await dt.store.cancelOrder(
        order.code,
        order.customer.phone,
      );
      setOrder(updated);
      toast("Đã hủy đơn hàng");
    } catch (e) {
      toast(String(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-box react-order">
      <h2>Đơn hàng {order.code}</h2>
      <p>
        <b>{statusLabel(order.status)}</b> ·{" "}
        {dt.paymentStatus[order.paymentStatus || "unpaid"]?.label}
      </p>
      <p>Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}</p>
      <ul className="timeline">
        {["pending", "confirmed", "shipping", "done"].map((s, i) => (
          <li
            className={
              i <=
              ["pending", "confirmed", "shipping", "done"].indexOf(order.status)
                ? "done"
                : ""
            }
            key={s}
          >
            {statusLabel(s)}
          </li>
        ))}
      </ul>
      <p>
        {order.customer.name} · {order.customer.phone}
      </p>
      <p>
        {order.shipping.method === "pickup"
          ? `Nhận tại: ${order.shipping.store}`
          : [
              order.shipping.address,
              order.shipping.district,
              order.shipping.province,
            ]
              .filter(Boolean)
              .join(", ")}
      </p>
      <table className="specs">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i: Row, index: number) => (
            <tr key={index}>
              <td>
                {i.name}
                <small>{dt.api.optionText(i.options || {})}</small>
              </td>
              <td>{i.qty}</td>
              <td>{money(i.price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sum-total">
        Tổng thanh toán: <b>{money(order.total)}</b>
      </p>
      {order.payment === "bank" &&
        order.paymentStatus !== "paid" &&
        order.status !== "cancelled" && (
          <div className="pay-box">
            <h3>Chuyển khoản để hoàn tất đơn hàng</h3>
            {dt.payments.qrUrl(order.total, order.code) && (
              <img
                className="react-qr"
                src={dt.payments.qrUrl(order.total, order.code)}
                alt={`Mã QR thanh toán đơn ${order.code}`}
              />
            )}
            <p>
              {dt.config.bankName} · {dt.config.bankAccount} ·{" "}
              {dt.config.bankOwner}
            </p>
            <p>
              Nội dung: <b>{order.code}</b>
            </p>
          </div>
        )}
      {canCancel &&
        ["pending", "confirmed"].includes(order.status) &&
        order.paymentStatus !== "paid" && (
          <button
            className="btn btn-outline"
            aria-busy={busy}
            disabled={busy}
            onClick={cancel}
          >
            Hủy đơn hàng
          </button>
        )}
    </section>
  );
}
export function TrackingPage({ code = "" }: { code?: string }) {
  const [order, setOrder] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useMeta("Tra cứu đơn hàng");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = formValues(e.currentTarget);
    try {
      const o = await dt.store.trackOrder(data.code, data.phone);
      if (!o) throw new Error("Không tìm thấy đơn hàng");
      setOrder(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOrder(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container react-narrow">
      <h1>Tra cứu đơn hàng</h1>
      <form className="section-box react-form" onSubmit={submit}>
        <Field label="Mã đơn hàng" name="code" required defaultValue={code} />
        <Field
          label="Số điện thoại đặt hàng"
          name="phone"
          type="tel"
          required
        />
        <button className="btn btn-primary" aria-busy={busy} disabled={busy}>
          Tra cứu đơn hàng
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      {order && <OrderDetails key={order.code} order={order} />}
    </div>
  );
}
export function SuccessPage({ code }: { code: string }) {
  useShop();
  useMeta("Đặt hàng thành công");
  const order = dt.store.findOrder(code);
  return order ? (
    <div className="container react-narrow">
      <h1>Đặt hàng thành công!</h1>
      <p>Cảm ơn bạn đã mua hàng tại {dt.config.name}.</p>
      <OrderDetails order={order} />
      <ShopLink className="btn btn-primary" href="index.html">
        Tiếp tục mua sắm
      </ShopLink>
    </div>
  ) : (
    <TrackingPage code={code} />
  );
}
export function CollectionPage({ compare = false }: { compare?: boolean }) {
  const state = useShop();
  useMeta(compare ? "So sánh sản phẩm" : "Sản phẩm yêu thích");
  const products = dt.products.filter((p) =>
    (compare ? state.compare : state.wishlist).includes(p.id),
  );
  return (
    <div className="container">
      <h1>{compare ? "So sánh sản phẩm" : "Sản phẩm yêu thích"}</h1>
      {!compare ? (
        <ProductGrid products={products} />
      ) : products.length ? (
        <div className="react-table-scroll">
          <table className="compare-table specs">
            <thead>
              <tr>
                <th>Thông tin</th>
                {products.map((p) => (
                  <th key={p.id}>
                    <button
                      aria-label={`Bỏ ${p.name}`}
                      onClick={() => dt.store.toggleCompare(p.id)}
                    >
                      ×
                    </button>
                    <Picture product={p} />
                    <ShopLink href={dt.api.url(p)}>{p.name}</ShopLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                "price",
                "rating",
                "stock",
                ...new Set(products.flatMap((p) => Object.keys(p.specs))),
              ].map((key) => (
                <tr key={key}>
                  <th>
                    {(
                      {
                        price: "Giá",
                        rating: "Đánh giá",
                        stock: "Tồn kho",
                      } as Row
                    )[key] || key}
                  </th>
                  {products.map((p) => (
                    <td key={p.id}>
                      {key === "price"
                        ? money(p.price)
                        : key === "rating"
                          ? p.rating
                          : key === "stock"
                            ? p.stock
                            : p.specs[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Chưa có sản phẩm để so sánh" />
      )}
    </div>
  );
}
