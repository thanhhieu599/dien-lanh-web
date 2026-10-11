// Kiểm thử luồng thanh toán trên trình duyệt thật, chế độ đã kết nối Supabase:
//   website (mã nguồn) -> PostgREST giả lập bằng PostgreSQL cục bộ -> Edge Function "payments" thật
//   -> cổng VNPay / MoMo giả lập (ký đúng chuẩn) -> trang kết quả.
// Chạy: PGHOST=localhost PGUSER=postgres PGPASSWORD=... node --experimental-strip-types tests/browser/payments.test.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { handle as payments } from '../../supabase/functions/payments/handler.ts';
import { makeFetch, sql } from '../../supabase/functions/tests/pgrest-shim.ts';
// @ts-ignore: module JS
import { blockExternal, check, chromium, done, pagesServer } from './lib.mjs';
// @ts-ignore: module JS
import { momoIpnRaw, momoSign, vnpaySign } from '../../supabase/functions/tests/reference.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
execFileSync(path.join(ROOT, 'supabase/tests/run-local.sh'), ['dt_e2e'], { stdio: 'ignore' });
sql(`update public.notifications set status = 'done'`);

const { server, base } = await pagesServer(ROOT);
const SB = 'http://supabase.test';
const env: Record<string, string> = {
  SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: 'eyJservice', SITE_URL: `${base}frontend/`,
  VNPAY_TMN_CODE: 'DTTEST01', VNPAY_HASH_SECRET: 'VNPAYSECRET0123456789',
  MOMO_PARTNER_CODE: 'MOMODT01', MOMO_ACCESS_KEY: 'ACCESSKEY', MOMO_SECRET_KEY: 'MOMOSECRET', SEPAY_API_KEY: 'sepay-key',
};
let vnpayOutcome = '00';
const fnFetch = makeFetch(async (url, init) => {
  if (url.includes('momo.vn/v2/gateway/api/create')) {
    const b = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ resultCode: 0, payUrl: `https://test-payment.momo.vn/fake?o=${b.orderId}&r=${b.requestId}&a=${b.amount}&i=${encodeURIComponent(b.orderInfo)}` }));
  }
  return new Response('{}', { status: 404 });
});

// PostgREST tối thiểu cho website (khách vãng lai = role anon)
const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
function restGet(u: URL): string {
  const table = u.pathname.split('/').pop()!.replace(/\W/g, '');
  const cols = (u.searchParams.get('select') || '*').split(',').map((c) => (c === '*' ? '*' : `"${c.replace(/\W/g, '')}"`)).join(', ');
  const where: string[] = [];
  for (const [k, v] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = v.match(/^eq\.(.*)$/);
    if (m) where.push(`"${k.replace(/\W/g, '')}" = ${lit(m[1])}`);
  }
  const order = (u.searchParams.get('order') || '').split(',').filter(Boolean).map((o) => { const [c, d] = o.split('.'); return `"${c.replace(/\W/g, '')}" ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ');
  const q = `select coalesce(json_agg(t), '[]') from (select ${cols} from public.${table}${where.length ? ` where ${where.join(' and ')}` : ''}${order ? ` order by ${order}` : ''}${u.searchParams.get('limit') ? ` limit ${Number(u.searchParams.get('limit'))}` : ''}) t`;
  return sql(q, 'anon');
}

const browser = await chromium();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await blockExternal(context, [SB, 'https://sandbox.vnpayment.vn', 'https://test-payment.momo.vn', 'https://img.vietqr.io']);
await context.route('**/assets/js/backend-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.DT = window.DT || {}; DT.BACKEND = { url: '${SB}', anonKey: 'anon-key', phoneEmailDomain: 'sdt.test', cacheMinutes: 5 };` }));
await context.route(`${SB}/**`, async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
  const cors = { 'Access-Control-Allow-Origin': '*' };
  if (u.pathname.startsWith('/functions/v1/payments')) {
    const res = await payments(new Request(req.url(), { method: req.method(), headers: { ...req.headers(), 'x-forwarded-for': '1.2.3.4' }, body: req.method() === 'POST' ? req.postData() : undefined }), env, { fetch: fnFetch });
    return route.fulfill({ status: res.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: res.status === 204 ? '' : await res.text() });
  }
  if (u.pathname.startsWith('/rest/v1/rpc/')) {
    const fn = u.pathname.split('/').pop()!;
    const args = JSON.parse(req.postData() || '{}');
    try {
      const out = sql(`select public.${fn.replace(/\W/g, '')}(${Object.entries(args).map(([k, v]) => `${k.replace(/\W/g, '')} => ${v === null ? 'NULL' : lit(typeof v === 'object' ? JSON.stringify(v) : String(v))}`).join(', ')})`, 'anon');
      return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: out || 'null' });
    } catch (e) {
      return route.fulfill({ status: 400, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'P0001', message: (e as Error).message }) });
    }
  }
  if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: restGet(u) });
  return route.fulfill({ status: 404, body: '{}' });
});
// Cổng VNPay giả: ký kết quả bằng đúng khóa rồi chuyển khách về returnUrl (giống VNPay thật)
await context.route('https://sandbox.vnpayment.vn/**', (route) => {
  const q = Object.fromEntries(new URL(route.request().url()).searchParams);
  check(q.vnp_SecureHash === vnpaySign(env.VNPAY_HASH_SECRET, q), `VNPay nhận link có chữ ký hợp lệ (${q.vnp_TxnRef}, ${Number(q.vnp_Amount) / 100}₫)`);
  const ok = vnpayOutcome === '00';
  const cb: Record<string, string> = { vnp_Amount: q.vnp_Amount, vnp_BankCode: 'NCB', vnp_OrderInfo: q.vnp_OrderInfo, vnp_PayDate: '20261011101500',
    vnp_ResponseCode: vnpayOutcome, vnp_TmnCode: q.vnp_TmnCode, vnp_TransactionNo: ok ? '14226112' : '0', vnp_TransactionStatus: ok ? '00' : '02', vnp_TxnRef: q.vnp_TxnRef };
  cb.vnp_SecureHash = vnpaySign(env.VNPAY_HASH_SECRET, cb);
  return route.fulfill({ status: 302, headers: { Location: `${q.vnp_ReturnUrl}?${new URLSearchParams(cb)}` } });
});
await context.route('https://test-payment.momo.vn/fake**', (route) => {
  const s = new URL(route.request().url()).searchParams;
  const p: Record<string, unknown> = { partnerCode: env.MOMO_PARTNER_CODE, orderId: s.get('o'), requestId: s.get('r'), amount: s.get('a'), orderInfo: s.get('i'),
    orderType: 'momo_wallet', transId: '4088878653', resultCode: '0', message: 'Thành công.', payType: 'qr', responseTime: '1760151000000', extraData: '' };
  p.signature = momoSign(env.MOMO_SECRET_KEY, momoIpnRaw(env.MOMO_ACCESS_KEY, p));
  return route.fulfill({ status: 302, headers: { Location: `${env.SITE_URL}ket-qua-thanh-toan.html?${new URLSearchParams(p as Record<string, string>)}` } });
});
await context.route('https://img.vietqr.io/**', (r) => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"/>' }));

const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
const fe = `${base}frontend/`;

async function checkout(payment: string, phone: string) {
  await page.goto(`${fe}san-pham.html?id=1003`);
  await page.waitForSelector('.pd-title h1');
  await page.evaluate(() => { DT.store.clearCart(); DT.store.addToCart(1003, 1); });
  await page.goto(`${fe}thanh-toan.html`);
  await page.waitForSelector('#co-form');
  await page.fill('[name=name]', 'Nguyễn Kiểm Thử');
  await page.fill('[name=phone]', phone);
  await page.fill('[name=email]', 'test@example.com');
  await page.check('[name=method][value=pickup]');
  await page.check(`[name=payment][value=${payment}]`);
  await page.click('#co-form button[type=submit]');
}
const orderOf = (phone: string) => JSON.parse(sql(`select row_to_json(o) from public.orders o where phone = '${phone}' order by id desc limit 1`));

console.log('1. Thẻ qua VNPay - thành công');
await checkout('card', '0981000001');
await page.waitForURL(/ket-qua-thanh-toan\.html\?code=DT/);
await page.waitForSelector('h1');
check((await page.locator('h1').first().textContent()) === 'Thanh toán thành công!', 'trang kết quả: Thanh toán thành công');
check(await page.locator('.status.ok', { hasText: 'Đã thanh toán' }).count() >= 1, 'đơn hiển thị "Đã thanh toán"');
let o = orderOf('0981000001');
check(o.payment_status === 'paid' && o.payment === 'card', `database: đơn ${o.code} đã thanh toán`);
check(!page.url().includes('vnp_'), 'thanh địa chỉ đã xóa tham số giao dịch');

console.log('2. VNPay - khách hủy, thanh toán lại');
vnpayOutcome = '24';
await checkout('card', '0981000002');
await page.waitForURL(/ket-qua-thanh-toan\.html\?code=DT/);
await page.waitForSelector('[data-pay="vnpay"]');
check((await page.locator('h1').first().textContent()) === 'Thanh toán chưa thành công', 'báo chưa thành công');
check((await page.locator('#pay-result p.muted').first().textContent())!.includes('Bạn đã hủy giao dịch'), 'lý do: Bạn đã hủy giao dịch');
check(await page.locator('[data-pay="momo"]').count() === 1, 'có thêm lựa chọn MoMo');
vnpayOutcome = '00';
await page.click('[data-pay="vnpay"]');
await page.waitForURL(/ket-qua-thanh-toan\.html\?code=DT/);
await page.waitForSelector('h1:has-text("Thanh toán thành công!")');
o = orderOf('0981000002');
check(o.payment_status === 'paid', 'thanh toán lại thành công');
check(sql(`select string_agg(txn_ref || ':' || status, ',' order by id) from public.payments where order_id = ${o.id}`) === `${o.code}P01:failed,${o.code}P02:paid`, 'lịch sử giao dịch: P01 thất bại, P02 thành công');

console.log('3. Ví MoMo');
await checkout('wallet', '0981000003');
await page.waitForURL(/ket-qua-thanh-toan\.html\?code=DT/);
await page.waitForSelector('h1:has-text("Thanh toán thành công!")');
check(orderOf('0981000003').payment_status === 'paid', 'MoMo: đơn đã thanh toán');

console.log('4. Chuyển khoản VietQR + SePay tự xác nhận');
await checkout('bank', '0981000004');
await page.waitForURL(/dat-hang-thanh-cong\.html\?code=DT/);
await page.waitForSelector('.pay-qr img');
o = orderOf('0981000004');
const qr = await page.locator('.pay-qr img').getAttribute('src');
check(qr!.startsWith('https://img.vietqr.io/image/970436-0071000000000-compact2.png') && qr!.includes(`amount=${o.total}`) && qr!.includes(`addInfo=${o.code}`), 'mã QR có sẵn số tiền & nội dung = mã đơn');
await page.waitForSelector('[data-bank-note] b');
check((await page.locator('[data-bank-note]').textContent())!.includes('tự xác nhận'), 'báo khách hệ thống tự xác nhận');
const hook = await payments(new Request(`${SB}/functions/v1/payments/sepay`, { method: 'POST', headers: { Authorization: 'Apikey sepay-key' },
  body: JSON.stringify({ id: 777, content: `CT ${o.code} chuyen khoan`, transferType: 'in', transferAmount: o.total }) }), env, { fetch: fnFetch });
check((await hook.json()).result.result === 'ok', 'SePay báo tiền vào');
await page.reload();
await page.waitForSelector('.status.ok:has-text("Đã thanh toán")');
check(await page.locator('.pay-qr').count() === 0, 'tải lại trang: đã thanh toán, ẩn mã QR');

console.log('5. Tra cứu đơn chưa thanh toán -> nút thanh toán');
vnpayOutcome = '24';
await checkout('card', '0981000005');
await page.waitForURL(/ket-qua-thanh-toan/);
o = orderOf('0981000005');
await page.goto(`${fe}tra-cuu-don-hang.html?code=${o.code}&phone=0981000005`);
await page.waitForSelector('[data-pay="vnpay"]');
check(await page.locator('#cancel-order').count() === 1, 'đơn chưa thanh toán: vẫn hủy được');
vnpayOutcome = '00';
await page.click('[data-pay="vnpay"]');
await page.waitForSelector('h1:has-text("Thanh toán thành công!")');
await page.goto(`${fe}tra-cuu-don-hang.html?code=${o.code}&phone=0981000005`);
await page.waitForSelector('.order-info');
check(await page.locator('[data-pay]').count() === 0 && await page.locator('#cancel-order').count() === 0, 'đã thanh toán: ẩn nút thanh toán & nút hủy');

console.log('6. Thông báo được xếp hàng');
check(Number(sql(`select count(*) from public.notifications where event = 'order_paid' and status = 'pending'`)) === 5, '5 sự kiện "đã thanh toán" chờ gửi');

check(errors.length === 0, `không có lỗi JavaScript${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
done();
