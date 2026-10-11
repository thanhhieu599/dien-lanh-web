// Kiểm thử end-to-end: Edge Functions + database thật (PostgreSQL cục bộ, đã chạy migrations + seed).
// Mô phỏng VNPay / MoMo / SePay gọi về đúng định dạng & chữ ký; các API Zalo / Resend / Telegram được giả lập.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle as payments } from '../payments/handler.ts';
import { handle as notify } from '../notify/handler.ts';
import { makeFetch, sql, SUPABASE_URL } from './pgrest-shim.ts';
// @ts-ignore: module JS tham chiếu
import { momoIpnRaw, momoSign, vnpaySign } from './reference.mjs';

const env: Record<string, string> = {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'eyJservice', SITE_URL: 'https://shop.vn/frontend/',
  VNPAY_TMN_CODE: 'DTTEST01', VNPAY_HASH_SECRET: 'VNPAYSECRET0123456789',
  MOMO_PARTNER_CODE: 'MOMODT01', MOMO_ACCESS_KEY: 'ACCESSKEY', MOMO_SECRET_KEY: 'MOMOSECRET',
  SEPAY_API_KEY: 'sepay-key-123', NOTIFY_SECRET: 'notify-secret',
  RESEND_API_KEY: 're_test', EMAIL_FROM: 'D&T <don@trangthietbi.vn>', STAFF_EMAILS: 'sales@trangthietbi.vn, ceo@trangthietbi.vn',
  ZALO_BOT_TOKEN: '123:abc', ZALO_BOT_CHAT_IDS: 'chatA,chatB', TELEGRAM_BOT_TOKEN: '999:tg', TELEGRAM_CHAT_IDS: '-100',
  ZALO_APP_ID: 'app1', ZALO_APP_SECRET: 'appsecret', ZALO_OA_REFRESH_TOKEN: 'rt-0', ZNS_TEMPLATE_ORDER: '231', ZNS_TEMPLATE_PAID: '232',
};

// Bên ngoài (MoMo, Zalo, Resend, Telegram) - ghi lại các lần gọi
const calls: { url: string; body: any; headers: any }[] = [];
let failResend = false;
const external = async (url: string, init: RequestInit) => {
  const body = typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body;
  calls.push({ url, body, headers: init.headers });
  if (url.includes('momo.vn')) return new Response(JSON.stringify({ resultCode: 0, payUrl: `https://test-payment.momo.vn/pay/${body.orderId}` }));
  if (url.includes('api.resend.com')) return failResend ? new Response('{"message":"rate limit"}', { status: 429 }) : new Response('{"id":"e1"}');
  if (url.includes('bot-api.zaloplatforms.com') || url.includes('api.telegram.org')) return new Response('{"ok":true,"result":{}}');
  if (url.includes('oauth.zaloapp.com')) return new Response(JSON.stringify({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: '90000' }));
  if (url.includes('business.openapi.zalo.me')) return new Response('{"error":0,"message":"Success","data":{"msg_id":"m1"}}');
  return new Response('{}', { status: 404 });
};
const deps = { fetch: makeFetch(external) };
const req = (path: string, init: RequestInit = {}) => new Request(`${SUPABASE_URL}/functions/v1/${path}`, init);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } });

function placeOrder(payment: string, phone: string, id = 1001, email = 'khach@example.com') {
  return JSON.parse(sql(`select public.place_order('[{"id":${id},"qty":1}]', '{"name":"Khách E2E","phone":"${phone}","email":"${email}"}', '{"method":"pickup","store":"Q7"}', '${payment}')`));
}
const payStatus = (code: string) => sql(`select payment_status from public.orders where code = '${code}'`);

test('cấu hình cổng', async () => {
  const r = await (await payments(req('payments/config'), env, deps)).json();
  assert.deepEqual(r, { vnpay: true, momo: true, bankAuto: true });
});

test('VNPay: tạo link -> IPN -> đơn đã thanh toán, IPN lặp / sai chữ ký / sai tiền', async () => {
  const o = placeOrder('card', '0961111111');
  const bad = await payments(post('payments/create', { code: o.code, phone: '0960000000', provider: 'vnpay' }), env, deps);
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /Không tìm thấy đơn hàng/);

  const res = await payments(post('payments/create', { code: o.code, phone: '0961 111 111', provider: 'vnpay', bankCode: 'NCB' }, { 'x-forwarded-for': '14.161.1.2, 10.0.0.1' }), env, deps);
  assert.equal(res.status, 200);
  const { payUrl, txnRef } = await res.json();
  const q = Object.fromEntries(new URL(payUrl).searchParams);
  assert.equal(q.vnp_TxnRef, `${o.code}P01`);
  assert.equal(q.vnp_Amount, String(o.total * 100));
  assert.equal(q.vnp_IpAddr, '14.161.1.2');
  assert.equal(q.vnp_BankCode, 'NCB');
  assert.equal(q.vnp_ReturnUrl, 'https://shop.vn/frontend/ket-qua-thanh-toan.html');
  assert.equal(q.vnp_SecureHash, vnpaySign(env.VNPAY_HASH_SECRET, q));

  const cb: Record<string, string> = { vnp_Amount: q.vnp_Amount, vnp_BankCode: 'NCB', vnp_OrderInfo: q.vnp_OrderInfo, vnp_PayDate: '20261011101500',
    vnp_ResponseCode: '00', vnp_TmnCode: env.VNPAY_TMN_CODE, vnp_TransactionNo: '14226112', vnp_TransactionStatus: '00', vnp_TxnRef: txnRef };
  const ipn = (p: Record<string, string>) => payments(req(`payments/vnpay-ipn?${new URLSearchParams(p)}`), env, deps).then((r) => r.json());

  assert.deepEqual(await ipn({ ...cb, vnp_SecureHash: 'abc' }), { RspCode: '97', Message: 'Invalid Checksum' });
  const wrongAmt = { ...cb, vnp_Amount: '100' };
  assert.deepEqual(await ipn({ ...wrongAmt, vnp_SecureHash: vnpaySign(env.VNPAY_HASH_SECRET, wrongAmt) }), { RspCode: '04', Message: 'Invalid amount' });
  const unknown = { ...cb, vnp_TxnRef: 'DT0000000000P01' };
  assert.deepEqual(await ipn({ ...unknown, vnp_SecureHash: vnpaySign(env.VNPAY_HASH_SECRET, unknown) }), { RspCode: '01', Message: 'Order not found' });
  assert.equal(payStatus(o.code), 'unpaid');

  const signed = { ...cb, vnp_SecureHash: vnpaySign(env.VNPAY_HASH_SECRET, cb), vnp_SecureHashType: 'HmacSHA512' };
  assert.deepEqual(await ipn(signed), { RspCode: '00', Message: 'Confirm Success' });
  assert.equal(payStatus(o.code), 'paid');
  assert.deepEqual(await ipn(signed), { RspCode: '02', Message: 'Order already confirmed' });

  // Khách quay về trang kết quả (IPN đã tới trước) -> vẫn báo thành công
  const ret = await (await payments(post('payments/return', { params: signed }), env, deps)).json();
  assert.equal(ret.success, true);
  assert.equal(ret.order.code, o.code);
  assert.equal(ret.order.paymentStatus, 'paid');
  // Tham số bị sửa
  const tampered = await payments(post('payments/return', { params: { ...signed, vnp_Amount: '1' } }), env, deps);
  assert.equal(tampered.status, 400);
});

test('VNPay: khách hủy trên cổng -> trang kết quả báo lỗi, thanh toán lại được', async () => {
  const o = placeOrder('card', '0962222222', 1002);
  const { txnRef, payUrl } = await (await payments(post('payments/create', { code: o.code, phone: '0962222222', provider: 'vnpay' }), env, deps)).json();
  const q = Object.fromEntries(new URL(payUrl).searchParams);
  const cb: Record<string, string> = { vnp_Amount: q.vnp_Amount, vnp_ResponseCode: '24', vnp_TmnCode: env.VNPAY_TMN_CODE, vnp_TransactionNo: '0', vnp_TransactionStatus: '02', vnp_TxnRef: txnRef };
  cb.vnp_SecureHash = vnpaySign(env.VNPAY_HASH_SECRET, cb);
  const ret = await (await payments(post('payments/return', { params: cb }), env, deps)).json();
  assert.equal(ret.success, false);
  assert.equal(ret.message, 'Bạn đã hủy giao dịch');
  assert.equal(ret.order.paymentStatus, 'unpaid');
  const again = await (await payments(post('payments/create', { code: o.code, phone: '0962222222', provider: 'vnpay' }), env, deps)).json();
  assert.equal(again.txnRef, `${o.code}P02`);
});

test('MoMo: tạo giao dịch -> IPN 204 -> đã thanh toán; trang kết quả kiểm chữ ký redirect', async () => {
  const o = placeOrder('wallet', '0963333333', 1003);
  const { payUrl, txnRef } = await (await payments(post('payments/create', { code: o.code, phone: '0963333333', provider: 'momo' }), env, deps)).json();
  assert.equal(payUrl, `https://test-payment.momo.vn/pay/${txnRef}`);
  const created = calls.find((c) => c.url.includes('momo.vn') && c.body.orderId === txnRef)!;
  assert.equal(created.body.ipnUrl, `${SUPABASE_URL}/functions/v1/payments/momo-ipn`);
  assert.equal(created.body.amount, o.total);

  const p: Record<string, unknown> = { partnerCode: env.MOMO_PARTNER_CODE, orderId: txnRef, requestId: created.body.requestId, amount: o.total,
    orderInfo: created.body.orderInfo, orderType: 'momo_wallet', transId: 4088878653, resultCode: 0, message: 'Thành công.', payType: 'qr', responseTime: 1760151000000, extraData: '' };
  p.signature = momoSign(env.MOMO_SECRET_KEY, momoIpnRaw(env.MOMO_ACCESS_KEY, p));
  assert.equal((await payments(post('payments/momo-ipn', { ...p, signature: 'x' }), env, deps)).status, 400);
  assert.equal(payStatus(o.code), 'unpaid');
  assert.equal((await payments(post('payments/momo-ipn', p), env, deps)).status, 204);
  assert.equal(payStatus(o.code), 'paid');
  const q = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
  const ret = await (await payments(post('payments/return', { params: q }), env, deps)).json();
  assert.equal(ret.success, true);
});

test('MoMo: đơn trên 50 triệu bị chặn với hướng dẫn rõ ràng', async () => {
  const o = placeOrder('wallet', '0964444444', 1001);
  sql(`update public.orders set total = 60000000 where code = '${o.code}'`);
  const r = await payments(post('payments/create', { code: o.code, phone: '0964444444', provider: 'momo' }), env, deps);
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /hạn mức ví MoMo/);
});

test('SePay: xác thực khóa, đối soát chuyển khoản', async () => {
  const o = placeOrder('bank', '0965555555', 1004);
  const hook = (body: unknown, key = env.SEPAY_API_KEY) => payments(post('payments/sepay', body, { Authorization: `Apikey ${key}` }), env, deps);
  assert.equal((await hook({ id: 1 }, 'sai')).status, 401);
  const tx = { id: 92704, gateway: 'Vietcombank', transactionDate: '2026-10-11 10:00:00', accountNumber: '0071000000000', code: null,
    content: `IBFT ${o.code.toLowerCase()} chuyen tien`, transferType: 'in', transferAmount: o.total, accumulated: 1, referenceCode: 'FT1', description: '' };
  const r = await (await hook(tx)).json();
  assert.equal(r.success, true);
  assert.equal(r.result.result, 'ok');
  assert.equal(payStatus(o.code), 'paid');
  assert.equal((await (await hook(tx)).json()).result.result, 'already', 'webhook gửi lại không cộng trùng');
  assert.equal((await (await hook({ ...tx, id: 5, transferType: 'out' })).json()).result, 'skip_out');
});

test('notify: gửi đủ kênh, lỗi 1 kênh thì chỉ thử lại kênh đó', async () => {
  const run = () => notify(req('notify', { method: 'POST', headers: { 'x-notify-secret': env.NOTIFY_SECRET } }), env, deps).then((r) => r.json());
  assert.equal((await notify(req('notify', { method: 'POST', headers: { 'x-notify-secret': 'sai' } }), env, deps)).status, 401);
  const status = await (await notify(req('notify/status', { headers: { 'x-notify-secret': env.NOTIFY_SECRET } }), env, deps)).json();
  assert.deepEqual(status, { email: true, staffEmails: 2, zaloBot: true, telegram: true, zns: true });

  sql(`update public.notifications set status = 'done'`);  // bỏ sự kiện từ các test trước
  const o = placeOrder('cod', '0966666666', 1005, 'nguoimua@example.com');
  sql(`select public.submit_lead('b2b-quote', '{"name":"Chị Lan","phone":"0977777777","company":"Cty FDI","items":"30 máy lạnh âm trần"}')`);
  calls.length = 0;
  failResend = true;
  const r1 = await run();
  assert.deepEqual(r1, { processed: 2, done: 0, retry: 2 });
  const zalo = calls.filter((c) => c.url.includes('zaloplatforms'));
  assert.equal(zalo.length, 4, '2 sự kiện x 2 chat');
  assert.equal(zalo[0].url, 'https://bot-api.zaloplatforms.com/bot123:abc/sendMessage');
  assert.match(zalo[0].body.text, new RegExp(`ĐƠN MỚI ${o.code}`));
  assert.match(zalo[2].body.text, /BÁO GIÁ DỰ ÁN \(B2B\)/);
  const zns = calls.find((c) => c.url.includes('message/template'))!;
  assert.equal(zns.headers.access_token, 'at-1');
  assert.equal(zns.body.phone, '84966666666');
  assert.equal(zns.body.template_id, '231');
  assert.equal(JSON.parse(sql(`select public.integration_token_get('zalo_oa')`)).refresh_token, 'rt-1', 'lưu refresh token mới');
  const row = JSON.parse(sql(`select row_to_json(n) from public.notifications n join public.orders o on o.id = n.order_id where o.code = '${o.code}'`));
  assert.equal(row.status, 'pending');
  assert.equal(row.results.zalo_staff.ok, true);
  assert.equal(row.results.email_staff.ok, false);
  assert.match(row.results.email_staff.error, /Resend 429/);

  // Lần sau: chỉ gửi lại email
  sql(`update public.notifications set next_at = now() where status = 'pending'`);
  calls.length = 0;
  failResend = false;
  const r2 = await run();
  assert.deepEqual(r2, { processed: 2, done: 2, retry: 0 });
  assert.equal(calls.filter((c) => c.url.includes('zaloplatforms') || c.url.includes('telegram') || c.url.includes('zalo.me')).length, 0, 'không gửi trùng Zalo/Telegram/ZNS');
  const emails = calls.filter((c) => c.url.includes('resend'));
  assert.deepEqual(emails.map((e) => e.body.to), [['sales@trangthietbi.vn', 'ceo@trangthietbi.vn'], ['nguoimua@example.com'], ['sales@trangthietbi.vn', 'ceo@trangthietbi.vn']]);
  assert.equal(emails[0].body.reply_to, 'nguoimua@example.com', 'trả lời email đi thẳng tới khách');
  assert.equal(sql(`select count(*) from public.notifications where status <> 'done'`), '0');

  // Đổi trạng thái + thanh toán -> email + ZNS mẫu PAID cho khách, nhân viên không bị làm phiền khi tự đổi trạng thái
  sql(`update public.orders set status = 'confirmed' where code = '${o.code}'`);
  sql(`update public.orders set payment_status = 'paid' where code = '${o.code}'`);
  calls.length = 0;
  assert.deepEqual(await run(), { processed: 2, done: 2, retry: 0 });
  assert.ok(calls.some((c) => c.url.includes('message/template') && c.body.template_id === '232'), 'ZNS đã thanh toán');
  assert.equal(calls.filter((c) => c.url.includes('zaloplatforms')).length, 2, 'chỉ báo nhân viên sự kiện thanh toán (2 chat)');
  assert.ok(calls.some((c) => c.url.includes('resend') && /Đơn hàng .*: Đã xác nhận/.test(c.body.subject)));
});

test('notify/test gửi tin thử', async () => {
  calls.length = 0;
  const r = await (await notify(req('notify/test', { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }), env, deps)).json();
  assert.deepEqual(r.results, { zalo_staff: 'ok', telegram_staff: 'ok', email_staff: 'ok' });
});
