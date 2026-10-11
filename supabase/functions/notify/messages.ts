// Nội dung thông báo cho nhân viên (Zalo/Telegram/email) và khách hàng (email/ZNS).
import { esc, money, vnDate } from '../_shared/format.ts';
import type { Env } from '../_shared/http.ts';

// deno-lint-ignore no-explicit-any
export type Json = Record<string, any>;

export interface NotifyEvent {
  id: number;
  event: 'order_new' | 'order_status' | 'order_paid' | 'lead_new' | 'cart_reminder' | 'maintenance_reminder';
  data: Json;
  attempts: number;
  results: Record<string, { ok: boolean; at?: string; error?: string }>;
  order?: Json | null;
  lead?: Json | null;
}

export interface Ctx {
  env: Env;
  store: Json;   // settings 'store' (tên, hotline, ngân hàng...)
}

export const PAY: Json = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', card: 'Thẻ ATM / Visa / Master (VNPay)', wallet: 'Ví MoMo', installment: 'Trả góp 0%' };
export const STATUS: Json = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng', installing: 'Đang lắp đặt', done: 'Hoàn thành', cancelled: 'Đã hủy' };
export const PAY_STATUS: Json = { unpaid: 'Chưa thanh toán', partial: 'Thanh toán một phần', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' };
const LEAD_TYPE: Json = { contact: 'LIÊN HỆ', service: 'ĐẶT LỊCH DỊCH VỤ', 'b2b-quote': 'YÊU CẦU BÁO GIÁ DỰ ÁN (B2B)', newsletter: 'ĐĂNG KÝ NHẬN TIN' };
const LEAD_FIELDS: Json = {
  company: 'Công ty', name: 'Người liên hệ', position: 'Chức vụ', phone: 'Điện thoại', email: 'Email', projectType: 'Loại dự án',
  items: 'Sản phẩm / số lượng', budget: 'Ngân sách', service: 'Dịch vụ', address: 'Địa chỉ', date: 'Ngày hẹn', qty: 'Số lượng máy',
  note: 'Mô tả', topic: 'Chủ đề', message: 'Nội dung', sku: 'Mã SP',
};
const CUSTOMER_STATUS: Json = {
  confirmed: 'đã được xác nhận. Chúng tôi sẽ giao hàng theo lịch hẹn và gọi cho Quý khách trước khi giao.',
  shipping: 'đang được giao đến Quý khách. Vui lòng để ý điện thoại để nhận hàng.',
  installing: 'đang được kỹ thuật viên lắp đặt.',
  done: 'đã hoàn thành. Cảm ơn Quý khách đã tin chọn chúng tôi!',
  cancelled: 'đã được hủy. Nếu Quý khách đã thanh toán, số tiền sẽ được hoàn lại trong 3–7 ngày làm việc.',
};

const siteUrl = (env: Env) => (env.SITE_URL || 'https://thanhhieu599.github.io/dien-lanh-web/frontend/').replace(/\/?$/, '/');
const adminUrl = (env: Env) => (env.ADMIN_URL || siteUrl(env).replace(/frontend\/$/, 'admin/')).replace(/\/?$/, '/');
const trackUrl = (env: Env, o: Json) => `${siteUrl(env)}tra-cuu-don-hang.html?code=${encodeURIComponent(o.code)}&phone=${encodeURIComponent(o.customer?.phone || '')}`;
const shopName = (c: Ctx) => c.store.name || c.env.SHOP_NAME || 'Tên thương hiệu';
const cartUrl = (env: Env) => `${siteUrl(env)}gio-hang.html`;
// Link đặt lịch vệ sinh từ lời nhắc bảo trì (có UTM để đo số khách quay lại từ lời nhắc)
export const maintUrl = (env: Env, channel: string) => `${siteUrl(env)}dich-vu.html?svc=ve-sinh&utm_source=nhac-bao-tri&utm_medium=${channel}&utm_campaign=bao-tri-dinh-ky#book-form`;
const cartLines = (d: Json) => (d.items || []).map((i: Json) => `• ${i.qty} x ${i.name} — ${money(i.price * i.qty)}`);

function shippingLine(o: Json): string {
  const s = o.shipping || {};
  if (s.method === 'pickup') return `Nhận tại cửa hàng: ${s.store || ''}`;
  const when = s.date ? ` (hẹn ${vnDate(s.date, false)}${s.slot ? ` ${s.slot}` : ''})` : '';
  return `Giao tận nơi: ${[s.address, s.district, s.province].filter(Boolean).join(', ')}${when}`;
}

const itemLines = (o: Json) => (o.items || []).map((i: Json) => `• ${i.qty} x ${i.name}${i.install ? ' (+ lắp đặt)' : ''} — ${money(i.price * i.qty)}`);

// Ảnh QR chuyển khoản chuẩn VietQR (napas247), app ngân hàng nào cũng quét được
export function vietQr(store: Json, amount: number, content: string): string | null {
  if (!store.bankBin || !store.bankAccount) return null;
  const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: content, accountName: store.bankOwner || '' });
  return `https://img.vietqr.io/image/${encodeURIComponent(store.bankBin)}-${encodeURIComponent(store.bankAccount)}-compact2.png?${q}`;
}

// ================================================================== Nhân viên
export function staffText(ev: NotifyEvent, c: Ctx): string | null {
  const o = ev.order; const l = ev.lead;
  if (o && ev.event === 'order_new') {
    const cu = o.customer || {};
    return [
      `🛒 ĐƠN MỚI ${o.code} — ${money(o.total)}`,
      `Khách: ${[cu.gender, cu.name].filter(Boolean).join(' ')} — ${cu.phone || ''}${cu.email ? ` — ${cu.email}` : ''}`,
      shippingLine(o),
      `Thanh toán: ${PAY[o.payment] || o.payment} (${PAY_STATUS[o.paymentStatus] || o.paymentStatus})`,
      'Sản phẩm:', ...itemLines(o),
      ...(o.discount ? [`Giảm giá${o.coupon ? ` (${o.coupon})` : ''}: -${money(o.discount)}`] : []),
      ...(o.invoice ? [`Xuất VAT: ${o.invoice.company || ''} — MST ${o.invoice.taxCode || ''}`] : []),
      ...(o.note ? [`Ghi chú: ${o.note}`] : []),
      `Xử lý: ${adminUrl(c.env)}#/orders/${o.id}`,
    ].join('\n');
  }
  if (o && ev.event === 'order_paid') {
    const partial = ev.data?.paymentStatus === 'partial';
    return [
      partial ? `⚠️ CHUYỂN KHOẢN THIẾU — ĐƠN ${o.code}` : `💰 ĐÃ THANH TOÁN — ĐƠN ${o.code}`,
      `Tổng đơn: ${money(o.total)} — ${PAY[o.payment] || o.payment}`,
      `Khách: ${o.customer?.name || ''} — ${o.customer?.phone || ''}`,
      ...(o.status === 'cancelled' ? ['❗ Đơn đã HỦY nhưng khách đã thanh toán → cần hoàn tiền'] : []),
      ...(partial ? ['Khách chuyển chưa đủ tiền, vui lòng gọi xác nhận.'] : []),
      `Chi tiết: ${adminUrl(c.env)}#/orders/${o.id}`,
    ].join('\n');
  }
  if (o && ev.event === 'order_status' && ev.data?.status === 'cancelled') {
    return [`❌ ĐƠN ${o.code} ĐÃ HỦY — ${money(o.total)}`, `Khách: ${o.customer?.name || ''} — ${o.customer?.phone || ''}`,
      ...(o.paymentStatus === 'paid' ? ['❗ Đơn đã thanh toán → cần hoàn tiền'] : []), `Chi tiết: ${adminUrl(c.env)}#/orders/${o.id}`].join('\n');
  }
  if (ev.event === 'cart_reminder') {
    const d = ev.data || {};
    return [
      `🛒 GIỎ HÀNG CHƯA ĐẶT — ${money(d.total || 0)}`,
      `Khách: ${[d.gender, d.name].filter(Boolean).join(' ') || '(chưa nhập tên)'} — ${d.phone || ''}${d.email ? ` — ${d.email}` : ''}`,
      'Sản phẩm trong giỏ:', ...cartLines(d),
      'Khách đã vào trang thanh toán 2 giờ trước nhưng chưa đặt. Gọi tư vấn để chốt đơn.',
    ].join('\n');
  }
  if (ev.event === 'maintenance_reminder') {
    const d = ev.data || {};
    return [
      `🔧 ĐẾN HẠN VỆ SINH MÁY LẠNH — lần ${d.cycle || 1} (${d.months || 6} tháng sau lắp đặt)`,
      `Khách: ${[d.gender, d.name].filter(Boolean).join(' ')} — ${d.phone || ''}${d.email ? ` — ${d.email}` : ''}`,
      `Đơn ${d.orderCode || ev.order?.code || ''}: ${d.items || ''}`,
      'Đã gửi lời nhắc cho khách (nếu có email / Zalo). Gọi chăm sóc, đặt lịch vệ sinh để giữ khách.',
      ...(ev.order?.id ? [`Đơn hàng: ${adminUrl(c.env)}#/orders/${ev.order.id}`] : []),
    ].join('\n');
  }
  if (l && ev.event === 'lead_new') {
    const d: Json = { ...(l.data || {}), name: l.name || l.data?.name, phone: l.phone || l.data?.phone, email: l.email || l.data?.email, company: l.company || l.data?.company };
    const lines = Object.entries(LEAD_FIELDS).filter(([k]) => d[k]).map(([k, label]) => `${label}: ${String(d[k]).slice(0, 300)}`);
    return [`📋 ${LEAD_TYPE[l.type] || 'YÊU CẦU MỚI'} ${l.code}`, ...lines, `Xử lý: ${adminUrl(c.env)}#/leads/${l.id}`].join('\n');
  }
  return null;
}

const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

export function staffEmail(ev: NotifyEvent, c: Ctx) {
  const text = staffText(ev, c);
  if (!text) return null;
  const subject = text.split('\n')[0].replace(/^[^\p{L}\p{N}]+/u, '');
  return { subject: `[${shopName(c)}] ${subject}`, text, html: layout(c, `<p style="font-size:15px;line-height:1.6">${nl2br(text)}</p>`) };
}

// ================================================================== Khách hàng
function layout(c: Ctx, inner: string): string {
  const s = c.store;
  return `<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<div style="max-width:600px;margin:0 auto;padding:16px">
<div style="background:#0b5ed7;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:18px;font-weight:bold">${esc(shopName(c))}</div>
<div style="background:#fff;padding:20px;border-radius:0 0 10px 10px">${inner}</div>
<p style="font-size:12px;color:#6b7280;text-align:center;margin-top:14px">${esc(s.company || '')}${s.hotline ? ` • Hotline ${esc(s.hotline)}` : ''}${s.email ? ` • ${esc(s.email)}` : ''}</p>
</div></body></html>`;
}

function orderTable(o: Json): string {
  const row = (a: string, b: string, bold = false) => `<tr><td style="padding:6px 0;color:#4b5563">${a}</td><td style="padding:6px 0;text-align:right${bold ? ';font-weight:bold;color:#d70018;font-size:16px' : ''}">${b}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
${(o.items || []).map((i: Json) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.install ? ' <small>(+ lắp đặt)</small>' : ''} <b>x${i.qty}</b></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.qty)}</td></tr>`).join('')}
${row('Tạm tính', money(o.subtotal))}${o.install ? row('Phí lắp đặt', money(o.install)) : ''}${row('Vận chuyển', o.shippingFee ? money(o.shippingFee) : 'Miễn phí')}
${o.discount ? row(`Giảm giá${o.coupon ? ` (${esc(o.coupon)})` : ''}`, `-${money(o.discount)}`) : ''}${row('Tổng thanh toán', money(o.total), true)}
</table>`;
}

const button = (href: string, label: string) => `<p style="text-align:center;margin:22px 0"><a href="${esc(href)}" style="background:#0b5ed7;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">${label}</a></p>`;

export function customerEmail(ev: NotifyEvent, c: Ctx) {
  if (ev.event === 'maintenance_reminder') {
    const d = ev.data || {};
    if (!d.email) return null;
    const name = [d.gender, d.name].filter(Boolean).join(' ') || 'Quý khách';
    const html = `<p>Kính chào ${esc(name)},</p>
<p>Đã ${esc(String(d.months || 6))} tháng kể từ khi <b>${esc(shopName(c))}</b> lắp đặt máy lạnh cho Quý khách (đơn <b>${esc(d.orderCode || '')}</b>: ${esc(d.items || '')}).</p>
<p>Nhà sản xuất khuyến nghị <b>vệ sinh máy lạnh định kỳ 6 tháng/lần</b> để:</p>
<ul style="font-size:14px;line-height:1.7;color:#374151"><li>Máy lạnh sâu, tiết kiệm điện (dàn bám bụi có thể làm tăng 15–30% điện năng)</li><li>Không khí sạch, hạn chế vi khuẩn, nấm mốc</li><li>Phát hiện sớm thiếu gas, chảy nước; giữ điều kiện bảo hành</li></ul>
${button(maintUrl(c.env, 'email'), 'Đặt lịch vệ sinh')}
<p style="font-size:13px;color:#4b5563">Hoặc gọi ${esc(c.store.hotline || '')} để được hẹn giờ phù hợp. Nếu không muốn nhận nhắc lịch, Quý khách chỉ cần trả lời email này.</p>`;
    return { to: d.email, subject: `Đến lịch vệ sinh máy lạnh định kỳ — ${shopName(c)}`, html: layout(c, html),
      text: `Đã ${d.months || 6} tháng từ khi lắp đặt máy lạnh (đơn ${d.orderCode || ''}). Đặt lịch vệ sinh: ${maintUrl(c.env, 'email')}` };
  }
  if (ev.event === 'cart_reminder') {
    const d = ev.data || {};
    if (!d.email) return null;
    const name = [d.gender, d.name].filter(Boolean).join(' ') || 'Quý khách';
    const rows = (d.items || []).map((i: Json) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)} <b>x${i.qty}</b></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.qty)}</td></tr>`).join('');
    const html = `<p>Kính chào ${esc(name)},</p><p>Quý khách còn sản phẩm trong giỏ hàng tại <b>${esc(shopName(c))}</b> nhưng chưa hoàn tất đặt hàng. Chúng tôi đã giữ lại để Quý khách tiếp tục bất cứ lúc nào:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:8px 0;color:#4b5563">Tạm tính</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#d70018">${money(d.total || 0)}</td></tr></table>
${button(cartUrl(c.env), 'Hoàn tất đơn hàng')}<p style="font-size:13px;color:#4b5563">Cần tư vấn chọn công suất, lắp đặt hay báo giá số lượng? Gọi ${esc(c.store.hotline || '')} hoặc trả lời email này.</p>`;
    return { to: d.email, subject: `Bạn còn sản phẩm trong giỏ hàng — ${shopName(c)}`, html: layout(c, html),
      text: `Quý khách còn sản phẩm trong giỏ hàng (${money(d.total || 0)}). Hoàn tất đơn: ${cartUrl(c.env)}` };
  }
  const o = ev.order;
  const to = o?.customer?.email;
  if (!o || !to) return null;
  const name = [o.customer.gender, o.customer.name].filter(Boolean).join(' ');
  const hello = `<p>Kính chào ${esc(name)},</p>`;
  const track = button(trackUrl(c.env, o), 'Theo dõi đơn hàng');
  if (ev.event === 'order_new') {
    let pay = '';
    if (o.payment === 'bank' && o.paymentStatus !== 'paid') {
      const qr = vietQr(c.store, o.total, o.code);
      pay = `<div style="background:#eef5ff;border-radius:8px;padding:14px;margin:14px 0;font-size:14px">
<b>Thông tin chuyển khoản</b><br>Ngân hàng: ${esc(c.store.bankName || '')}<br>Số tài khoản: <b>${esc(c.store.bankAccount || '')}</b><br>Chủ tài khoản: ${esc(c.store.bankOwner || c.store.company || '')}<br>
Số tiền: <b>${money(o.total)}</b><br>Nội dung: <b>${esc(o.code)}</b>${qr ? `<br><img src="${esc(qr)}" alt="QR chuyển khoản" width="220" style="margin-top:10px">` : ''}</div>`;
    }
    const html = `${hello}<p>Cảm ơn Quý khách đã đặt hàng tại <b>${esc(shopName(c))}</b>. Đơn hàng <b>${esc(o.code)}</b> đã được ghi nhận, nhân viên sẽ gọi xác nhận trong giờ làm việc.</p>
<p style="font-size:14px;color:#4b5563">${esc(shippingLine(o))}<br>Thanh toán: ${esc(PAY[o.payment] || o.payment)} — ${esc(PAY_STATUS[o.paymentStatus] || '')}</p>
${orderTable(o)}${pay}${track}`;
    return { to, subject: `Xác nhận đơn hàng ${o.code} — ${shopName(c)}`, html: layout(c, html),
      text: `Cảm ơn Quý khách đã đặt hàng. Mã đơn ${o.code}, tổng ${money(o.total)}. Theo dõi: ${trackUrl(c.env, o)}` };
  }
  if (ev.event === 'order_paid' && ev.data?.paymentStatus === 'paid') {
    const html = `${hello}<p>${esc(shopName(c))} đã nhận đủ <b>${money(o.total)}</b> cho đơn hàng <b>${esc(o.code)}</b>${o.paidAt ? ` lúc ${esc(vnDate(o.paidAt))}` : ''}. Cảm ơn Quý khách!</p>${orderTable(o)}${track}`;
    return { to, subject: `Đã nhận thanh toán đơn ${o.code}`, html: layout(c, html), text: `Đã nhận thanh toán ${money(o.total)} cho đơn ${o.code}. ${trackUrl(c.env, o)}` };
  }
  if (ev.event === 'order_status' && CUSTOMER_STATUS[ev.data?.status]) {
    const msg = `Đơn hàng ${o.code} ${CUSTOMER_STATUS[ev.data.status]}`;
    return { to, subject: `Đơn hàng ${o.code}: ${STATUS[ev.data.status]}`, html: layout(c, `${hello}<p>${esc(msg)}</p>${track}`), text: `${msg} ${trackUrl(c.env, o)}` };
  }
  return null;
}

// ZNS: chỉ gửi tham số có trong danh sách ZNS_PARAMS (phải trùng tên tham số của mẫu đã đăng ký với Zalo)
export function znsMessage(ev: NotifyEvent, c: Ctx) {
  const env0 = c.env;
  if (ev.event === 'cart_reminder') {
    const d = ev.data || {};
    if (!env0.ZNS_TEMPLATE_CART || !d.phone) return null;
    const all: Record<string, string | number> = { customer_name: String(d.name || 'Quý khách').slice(0, 30), total: Number(d.total || 0), product_name: String(d.items?.[0]?.name || '').slice(0, 100), item_count: (d.items || []).length };
    const keys = String(env0.ZNS_PARAMS_CART || 'customer_name,total').split(',').map((s) => s.trim()).filter((k) => k in all);
    return { phone: d.phone, templateId: env0.ZNS_TEMPLATE_CART, data: Object.fromEntries(keys.map((k) => [k, all[k]])), trackingId: `N${ev.id}` };
  }
  if (ev.event === 'maintenance_reminder') {
    const d = ev.data || {};
    if (!env0.ZNS_TEMPLATE_MAINT || !d.phone) return null;
    const all: Record<string, string | number> = {
      customer_name: String(d.name || 'Quý khách').slice(0, 30), order_code: String(d.orderCode || ''), months: Number(d.months || 6),
      product_name: String(d.items || '').slice(0, 100), order_date: d.doneAt ? vnDate(d.doneAt, false) : '',
    };
    const keys = String(env0.ZNS_PARAMS_MAINT || 'customer_name,order_code').split(',').map((s) => s.trim()).filter((k) => k in all);
    return { phone: d.phone, templateId: env0.ZNS_TEMPLATE_MAINT, data: Object.fromEntries(keys.map((k) => [k, all[k]])), trackingId: `N${ev.id}` };
  }
  const o = ev.order;
  if (!o?.customer?.phone) return null;
  const env = c.env;
  const templateId = ev.event === 'order_new' ? env.ZNS_TEMPLATE_ORDER
    : ev.event === 'order_status' && CUSTOMER_STATUS[ev.data?.status] ? env.ZNS_TEMPLATE_STATUS
    : ev.event === 'order_paid' && ev.data?.paymentStatus === 'paid' ? env.ZNS_TEMPLATE_PAID : '';
  if (!templateId) return null;
  const all: Record<string, string | number> = {
    customer_name: String(o.customer.name || '').slice(0, 30),
    order_code: o.code,
    order_date: vnDate(o.createdAt, false),
    total: Number(o.total),
    status: STATUS[ev.event === 'order_status' ? ev.data.status : o.status] || '',
    payment_status: PAY_STATUS[o.paymentStatus] || '',
    payment_method: PAY[o.payment] || '',
  };
  const keys = String(env.ZNS_PARAMS || 'customer_name,order_code,order_date,total,status').split(',').map((s) => s.trim()).filter((k) => k in all);
  return { phone: o.customer.phone, templateId, data: Object.fromEntries(keys.map((k) => [k, all[k]])), trackingId: `N${ev.id}` };
}
