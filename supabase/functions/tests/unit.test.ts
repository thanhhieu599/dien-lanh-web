// Kiểm thử đơn vị: chữ ký VNPay/MoMo đối chiếu với cài đặt tham chiếu, nội dung thông báo.
// Chạy: ./supabase/functions/tests/run.sh
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as vnpay from '../_shared/vnpay.ts';
import * as momo from '../_shared/momo.ts';
import { vnStamp } from '../_shared/format.ts';
import { customerEmail, staffText, znsMessage } from '../notify/messages.ts';
// @ts-ignore: module JS tham chiếu
import { momoIpnRaw, momoSign, vnpaySign } from './reference.mjs';

const VN = { tmnCode: 'DTTEST01', hashSecret: 'SECRETKEYVNPAYTEST1234567890ABCD', payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', returnUrl: 'https://shop.vn/frontend/ket-qua-thanh-toan.html' };

test('VNPay: URL thanh toán ký đúng như code mẫu chính thức', async () => {
  const now = new Date('2026-10-11T03:04:05Z');
  const url = await vnpay.buildPaymentUrl(VN, { txnRef: 'DT2610111234P01', amount: 16860000, orderInfo: 'Thanh toan don hang DT2610111234', ip: '1.2.3.4', now });
  const u = new URL(url);
  const params = Object.fromEntries(u.searchParams);
  assert.equal(u.origin + u.pathname, VN.payUrl);
  assert.equal(params.vnp_Amount, '1686000000');
  assert.equal(params.vnp_CreateDate, '20261011100405', 'giờ GMT+7');
  assert.equal(params.vnp_ExpireDate, '20261011101905', 'hết hạn sau 15 phút');
  assert.equal(params.vnp_OrderInfo, 'Thanh toan don hang DT2610111234');
  assert.equal(params.vnp_SecureHash, vnpaySign(VN.hashSecret, params), 'trùng chữ ký tham chiếu');
  assert.ok(url.includes('vnp_OrderInfo=Thanh+toan+don+hang'), 'khoảng trắng mã hóa thành +');
  assert.ok(url.includes(`vnp_ReturnUrl=${encodeURIComponent(VN.returnUrl)}`));
});

test('VNPay: kiểm tra IPN hợp lệ / bị sửa', async () => {
  const p: Record<string, string> = {
    vnp_Amount: '1686000000', vnp_BankCode: 'NCB', vnp_BankTranNo: 'VNP14226112', vnp_CardType: 'ATM',
    vnp_OrderInfo: 'Thanh toan don hang DT2610111234', vnp_PayDate: '20261011101500', vnp_ResponseCode: '00',
    vnp_TmnCode: VN.tmnCode, vnp_TransactionNo: '14226112', vnp_TransactionStatus: '00', vnp_TxnRef: 'DT2610111234P01',
  };
  p.vnp_SecureHash = vnpaySign(VN.hashSecret, p);
  p.vnp_SecureHashType = 'HmacSHA512';
  const ok = await vnpay.verify(VN, p);
  assert.deepEqual([ok.valid, ok.success, ok.amount, ok.txnRef, ok.transactionNo], [true, true, 16860000, 'DT2610111234P01', '14226112']);
  assert.equal((await vnpay.verify(VN, { ...p, vnp_SecureHash: p.vnp_SecureHash.toUpperCase() })).valid, true, 'không phân biệt hoa thường');
  assert.equal((await vnpay.verify(VN, { ...p, vnp_Amount: '100' })).valid, false, 'sửa số tiền');
  assert.equal((await vnpay.verify({ hashSecret: 'khac' }, p)).valid, false, 'sai khóa');
  assert.equal((await vnpay.verify(VN, { ...p, vnp_SecureHash: '' })).valid, false, 'thiếu chữ ký');
  const cancel = { ...p, vnp_ResponseCode: '24', vnp_TransactionStatus: '02' };
  cancel.vnp_SecureHash = vnpaySign(VN.hashSecret, cancel);
  const r = await vnpay.verify(VN, cancel);
  assert.deepEqual([r.valid, r.success], [true, false]);
});

test('vnStamp theo giờ Việt Nam qua ngày', () => {
  assert.equal(vnStamp(new Date('2026-12-31T17:30:00Z')), '20270101003000');
});

const MM = { partnerCode: 'MOMODT01', accessKey: 'F8BBA842ECF85', secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz', endpoint: 'https://test-payment.momo.vn',
  requestType: 'captureWallet', redirectUrl: 'https://shop.vn/ket-qua-thanh-toan.html', ipnUrl: 'https://x.supabase.co/functions/v1/payments/momo-ipn' };

test('MoMo: tạo giao dịch ký đúng, đọc payUrl', async () => {
  let sent: any;
  const fake = (async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://test-payment.momo.vn/v2/gateway/api/create');
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ resultCode: 0, payUrl: 'https://test-payment.momo.vn/pay/abc' }));
  }) as typeof fetch;
  const payUrl = await momo.createPayment(MM, { orderId: 'DT2610111234P02', amount: 5000000, orderInfo: 'Thanh toan don hang DT2610111234' }, fake);
  assert.equal(payUrl, 'https://test-payment.momo.vn/pay/abc');
  const raw = `accessKey=${MM.accessKey}&amount=5000000&extraData=&ipnUrl=${MM.ipnUrl}&orderId=DT2610111234P02&orderInfo=Thanh toan don hang DT2610111234` +
    `&partnerCode=${MM.partnerCode}&redirectUrl=${MM.redirectUrl}&requestId=${sent.requestId}&requestType=captureWallet`;
  assert.equal(sent.signature, momoSign(MM.secretKey, raw));
  assert.equal(sent.amount, 5000000);
  const bad = (async () => new Response(JSON.stringify({ resultCode: 22, message: 'Số tiền không hợp lệ' }))) as unknown as typeof fetch;
  await assert.rejects(momo.createPayment(MM, { orderId: 'X', amount: 1, orderInfo: 'x' }, bad), /Số tiền không hợp lệ/);
});

test('MoMo: kiểm tra IPN', async () => {
  const p: Record<string, unknown> = { partnerCode: MM.partnerCode, orderId: 'DT2610111234P02', requestId: 'DT2610111234P02-1', amount: 5000000,
    orderInfo: 'Thanh toan don hang DT2610111234', orderType: 'momo_wallet', transId: 4088878653, resultCode: 0, message: 'Thành công.',
    payType: 'qr', responseTime: 1760151000000, extraData: '' };
  p.signature = momoSign(MM.secretKey, momoIpnRaw(MM.accessKey, p));
  const r = await momo.verify(MM, p);
  assert.deepEqual([r.valid, r.success, r.amount, r.transId], [true, true, 5000000, '4088878653']);
  assert.equal((await momo.verify(MM, { ...p, amount: 1 })).valid, false);
  assert.equal((await momo.verify({ ...MM, partnerCode: 'KHAC' }, p)).valid, false, 'sai partnerCode');
  // Dạng query string (redirect) - mọi giá trị là chuỗi
  const q = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
  assert.equal((await momo.verify(MM, q)).valid, true);
});

const order = {
  id: 7, code: 'DT2610111234', createdAt: '2026-10-11T03:00:00Z', status: 'pending', paymentStatus: 'unpaid', payment: 'bank',
  customer: { gender: 'Anh', name: 'Nguyễn Văn <An>', phone: '0901234567', email: 'an@example.com' },
  shipping: { method: 'delivery', province: 'TP. Hồ Chí Minh', district: 'Q7', address: '12 NTT', date: '2026-10-12', slot: '8:00 - 12:00' },
  items: [{ id: 1001, name: 'Máy lạnh 1HP', price: 8000000, qty: 2, install: true }],
  subtotal: 16000000, install: 600000, shippingFee: 0, discount: 0, total: 16600000, invoice: { company: 'Cty ABC', taxCode: '0312345678' }, note: 'Gọi trước',
};
const ctx = { env: { SITE_URL: 'https://shop.vn/frontend/', ZNS_TEMPLATE_ORDER: '231' }, store: { name: 'Tên thương hiệu', bankBin: '970436', bankAccount: '0071000000000', bankOwner: 'CONG TY D T', bankName: 'Vietcombank' } };

test('Thông báo nhân viên: đơn mới, thanh toán, lead', () => {
  const t = staffText({ id: 1, event: 'order_new', data: {}, attempts: 1, results: {}, order }, ctx)!;
  assert.match(t, /^🛒 ĐƠN MỚI DT2610111234 — 16\.600\.000₫/);
  assert.match(t, /2 x Máy lạnh 1HP \(\+ lắp đặt\)/);
  assert.match(t, /hẹn 12\/10\/2026 8:00 - 12:00/);
  assert.match(t, /Xuất VAT: Cty ABC — MST 0312345678/);
  assert.match(t, /https:\/\/shop\.vn\/admin\/#\/orders\/7/);
  const paid = staffText({ id: 2, event: 'order_paid', data: { paymentStatus: 'partial' }, attempts: 1, results: {}, order }, ctx)!;
  assert.match(paid, /CHUYỂN KHOẢN THIẾU/);
  assert.equal(staffText({ id: 3, event: 'order_status', data: { status: 'shipping' }, attempts: 1, results: {}, order }, ctx), null, 'nhân viên tự đổi trạng thái -> không báo');
  const lead = staffText({ id: 4, event: 'lead_new', data: {}, attempts: 1, results: {}, lead: { id: 9, code: 'L1', type: 'b2b-quote', name: 'Chị Lan', phone: '0911', company: 'FDI Co', data: { items: '30 máy lạnh âm trần', budget: '500 triệu' } } }, ctx)!;
  assert.match(lead, /BÁO GIÁ DỰ ÁN \(B2B\) L1/);
  assert.match(lead, /Sản phẩm \/ số lượng: 30 máy lạnh âm trần/);
  assert.match(lead, /#\/leads\/9/);
});

test('Email khách: xác nhận đơn có QR chuyển khoản, chống chèn HTML', () => {
  const m = customerEmail({ id: 1, event: 'order_new', data: {}, attempts: 1, results: {}, order }, ctx)!;
  assert.equal(m.to, 'an@example.com');
  assert.match(m.html, /img\.vietqr\.io\/image\/970436-0071000000000-compact2\.png\?amount=16600000&amp;addInfo=DT2610111234/);
  assert.ok(m.html.includes('Nguyễn Văn &lt;An&gt;') && !m.html.includes('<An>'));
  assert.match(m.html, /tra-cuu-don-hang\.html\?code=DT2610111234&amp;phone=0901234567/);
  assert.equal(customerEmail({ id: 1, event: 'order_new', data: {}, attempts: 1, results: {}, order: { ...order, customer: { name: 'X', phone: '09' } } }, ctx), null, 'không có email');
  const st = customerEmail({ id: 1, event: 'order_status', data: { status: 'shipping' }, attempts: 1, results: {}, order }, ctx)!;
  assert.match(st.subject, /Đang giao hàng/);
});

test('ZNS: chỉ gửi khi có mẫu, đúng tham số', () => {
  const z = znsMessage({ id: 5, event: 'order_new', data: {}, attempts: 1, results: {}, order }, ctx)!;
  assert.equal(z.templateId, '231');
  assert.deepEqual(z.data, { customer_name: 'Nguyễn Văn <An>', order_code: 'DT2610111234', order_date: '11/10/2026', total: 16600000, status: 'Chờ xác nhận' });
  assert.equal(znsMessage({ id: 5, event: 'order_paid', data: { paymentStatus: 'paid' }, attempts: 1, results: {}, order }, ctx), null, 'chưa cấu hình mẫu PAID');
});

test('Nhắc giỏ hàng bỏ dở: nhân viên, email khách, ZNS', () => {
  const ev = { id: 21, event: 'cart_reminder' as const, attempts: 1, results: {}, data: { phone: '0977000111', name: 'Lan <b>', gender: 'Chị', email: 'lan@example.com', total: 17800000, items: [{ id: 1001, name: 'Máy lạnh 1HP', price: 8900000, qty: 2 }] } };
  const t = staffText(ev, ctx)!;
  assert.match(t, /^🛒 GIỎ HÀNG CHƯA ĐẶT — 17\.800\.000₫/);
  assert.match(t, /Chị Lan <b> — 0977000111 — lan@example\.com/);
  assert.match(t, /2 x Máy lạnh 1HP — 17\.800\.000₫/);
  const e = customerEmail(ev, ctx)!;
  assert.equal(e.to, 'lan@example.com');
  assert.match(e.html, /Lan &lt;b&gt;/, 'tên khách được escape');
  assert.match(e.html, /https:\/\/shop\.vn\/frontend\/gio-hang\.html/);
  assert.equal(customerEmail({ ...ev, data: { ...ev.data, email: null } }, ctx), null, 'không có email thì không gửi');
  assert.equal(znsMessage(ev, ctx), null, 'chưa cấu hình mẫu ZNS giỏ hàng thì không gửi');
  const z = znsMessage(ev, { ...ctx, env: { ...ctx.env, ZNS_TEMPLATE_CART: '555' } })!;
  assert.deepEqual(z, { phone: '0977000111', templateId: '555', data: { customer_name: 'Lan <b>', total: 17800000 }, trackingId: 'N21' });
});
