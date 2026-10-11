// Edge Function "payments": tạo link thanh toán, nhận IPN VNPay / MoMo, webhook chuyển khoản SePay.
//   GET  /payments/config       -> cổng nào đang bật (website dùng để hiện lựa chọn)
//   POST /payments/create       {code, phone, provider: vnpay|momo, bankCode?} -> {payUrl}
//   GET  /payments/vnpay-ipn    VNPay gọi (khai báo URL này trong trang quản trị merchant VNPay)
//   POST /payments/momo-ipn     MoMo gọi (gửi kèm mỗi giao dịch)
//   POST /payments/return       {params} trang ket-qua-thanh-toan.html gửi tham số cổng trả về để kiểm tra
//   POST /payments/sepay        SePay gọi khi tài khoản ngân hàng có tiền vào
import { clientIp, CORS, HttpError, json, readJson, subPath } from '../_shared/http.ts';
import type { Env, Fetch } from '../_shared/http.ts';
import { createDb } from '../_shared/db.ts';
import type { Db } from '../_shared/db.ts';
import { safeEqual } from '../_shared/crypto.ts';
import * as vnpay from '../_shared/vnpay.ts';
import * as momo from '../_shared/momo.ts';

export interface Deps { fetch?: Fetch; db?: Db; now?: () => Date }

const DEFAULT_SITE = 'https://thanhhieu599.github.io/dien-lanh-web/frontend/';
const siteUrl = (env: Env) => (env.SITE_URL || DEFAULT_SITE).replace(/\/?$/, '/');
const returnUrl = (env: Env) => `${siteUrl(env)}ket-qua-thanh-toan.html`;

function vnpayCfg(env: Env): vnpay.VnpayConfig | null {
  if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET) return null;
  return {
    tmnCode: env.VNPAY_TMN_CODE,
    hashSecret: env.VNPAY_HASH_SECRET,
    payUrl: env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: returnUrl(env),
  };
}

function momoCfg(env: Env): momo.MomoConfig | null {
  if (!env.MOMO_PARTNER_CODE || !env.MOMO_ACCESS_KEY || !env.MOMO_SECRET_KEY) return null;
  return {
    partnerCode: env.MOMO_PARTNER_CODE,
    accessKey: env.MOMO_ACCESS_KEY,
    secretKey: env.MOMO_SECRET_KEY,
    endpoint: env.MOMO_ENDPOINT || 'https://test-payment.momo.vn',
    requestType: env.MOMO_REQUEST_TYPE || 'captureWallet',
    redirectUrl: returnUrl(env),
    ipnUrl: `${(env.SUPABASE_URL || '').replace(/\/+$/, '')}/functions/v1/payments/momo-ipn`,
    partnerName: env.SHOP_NAME || 'D&T Dien Lanh',
  };
}

// Kết quả payment_confirm -> mã phản hồi IPN của VNPay
const VNPAY_RSP: Record<string, [string, string]> = {
  ok: ['00', 'Confirm Success'],
  failed: ['00', 'Confirm Success'],
  already: ['02', 'Order already confirmed'],
  not_found: ['01', 'Order not found'],
  amount_mismatch: ['04', 'Invalid amount'],
};

export async function handle(req: Request, env: Env, deps: Deps = {}): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const route = subPath(req, 'payments');
  const fetchFn = deps.fetch || fetch;
  const db = () => deps.db || createDb(env, fetchFn);
  try {
    // ------------------------------------------------------------ cấu hình công khai
    if (route === 'config' && req.method === 'GET') {
      return json({ vnpay: !!vnpayCfg(env), momo: !!momoCfg(env), bankAuto: !!env.SEPAY_API_KEY });
    }

    // ------------------------------------------------------------ tạo link thanh toán
    if (route === 'create' && req.method === 'POST') {
      const b = await readJson(req);
      const provider = String(b.provider || '');
      const code = String(b.code || '').trim();
      const phone = String(b.phone || '').trim();
      if (!code || !phone) throw new HttpError('Thiếu mã đơn hàng hoặc số điện thoại');
      const vc = vnpayCfg(env); const mc = momoCfg(env);
      if (provider === 'vnpay' && !vc) throw new HttpError('Cổng VNPay chưa được kích hoạt');
      if (provider === 'momo' && !mc) throw new HttpError('Ví MoMo chưa được kích hoạt');
      if (provider !== 'vnpay' && provider !== 'momo') throw new HttpError('Cổng thanh toán không hợp lệ');
      const p = await db().rpc<{ txnRef: string; amount: number; code: string }>('payment_start', { p_code: code, p_phone: phone, p_provider: provider });
      const orderInfo = `Thanh toan don hang ${p.code}`;
      let payUrl: string;
      if (provider === 'vnpay') {
        const bankCode = /^[A-Z0-9]{2,20}$/.test(String(b.bankCode || '')) ? String(b.bankCode) : undefined;
        payUrl = await vnpay.buildPaymentUrl(vc!, { txnRef: p.txnRef, amount: Number(p.amount), orderInfo, ip: clientIp(req), bankCode, now: deps.now?.() });
      } else {
        const amount = Number(p.amount);
        if (amount < momo.MOMO_MIN || amount > momo.MOMO_MAX) {
          throw new HttpError('Giá trị đơn vượt hạn mức ví MoMo (tối đa 50 triệu/giao dịch). Vui lòng chọn VNPay hoặc chuyển khoản.');
        }
        try {
          payUrl = await momo.createPayment(mc!, { orderId: p.txnRef, amount, orderInfo }, fetchFn);
        } catch (e) {
          console.error('[payments] MoMo create', e);
          throw new HttpError('Không tạo được giao dịch MoMo, vui lòng thử lại hoặc chọn phương thức khác', 502);
        }
      }
      return json({ payUrl, txnRef: p.txnRef });
    }

    // ------------------------------------------------------------ IPN VNPay
    if (route === 'vnpay-ipn') {
      const vc = vnpayCfg(env);
      if (!vc) return json({ RspCode: '99', Message: 'Not configured' });
      const params = Object.fromEntries(new URL(req.url).searchParams);
      const r = await vnpay.verify(vc, params);
      if (!r.valid) return json({ RspCode: '97', Message: 'Invalid Checksum' });
      try {
        const res = await db().rpc<string>('payment_confirm', {
          p_txn_ref: r.txnRef, p_amount: r.amount, p_success: r.success,
          p_provider_txn: r.transactionNo || null, p_message: vnpay.RESPONSE_TEXT[r.responseCode] || r.responseCode, p_raw: params,
        });
        const [RspCode, Message] = VNPAY_RSP[res] || ['99', 'Unknown error'];
        return json({ RspCode, Message });
      } catch (e) {
        console.error('[payments] VNPay IPN', e);
        return json({ RspCode: '99', Message: 'Unknown error' });
      }
    }

    // ------------------------------------------------------------ IPN MoMo
    if (route === 'momo-ipn' && req.method === 'POST') {
      const mc = momoCfg(env);
      if (!mc) return json({ message: 'Not configured' }, 400);
      const body = await readJson(req);
      const r = await momo.verify(mc, body);
      if (!r.valid) return json({ message: 'Invalid signature' }, 400);
      const res = await db().rpc<string>('payment_confirm', {
        p_txn_ref: r.txnRef, p_amount: r.amount, p_success: r.success,
        p_provider_txn: r.transId || null, p_message: r.message, p_raw: body,
      });
      if (res === 'not_found' || res === 'amount_mismatch') console.warn('[payments] MoMo IPN', res, r.txnRef);
      return new Response(null, { status: 204, headers: CORS });  // MoMo yêu cầu phản hồi 204
    }

    // ------------------------------------------------------------ khách quay về từ cổng thanh toán
    if (route === 'return' && req.method === 'POST') {
      const b = await readJson(req);
      const params = (b.params && typeof b.params === 'object' ? b.params : {}) as Record<string, string>;
      let r: { valid: boolean; txnRef: string; amount: number; success: boolean; provider_txn: string; message: string };
      if (params.vnp_TxnRef) {
        const vc = vnpayCfg(env);
        if (!vc) throw new HttpError('Cổng VNPay chưa được kích hoạt');
        const v = await vnpay.verify(vc, params);
        r = { ...v, provider_txn: v.transactionNo, message: vnpay.RESPONSE_TEXT[v.responseCode] || `Mã lỗi ${v.responseCode}` };
      } else if (params.partnerCode) {
        const mc = momoCfg(env);
        if (!mc) throw new HttpError('Ví MoMo chưa được kích hoạt');
        const v = await momo.verify(mc, params);
        r = { ...v, provider_txn: v.transId };
      } else {
        throw new HttpError('Thiếu thông tin giao dịch');
      }
      if (!r.valid) throw new HttpError('Chữ ký giao dịch không hợp lệ');
      // Ghi nhận luôn (phòng khi IPN đến chậm). Hàm idempotent: IPN đến sau trả về "already".
      const res = await db().rpc<string>('payment_confirm', {
        p_txn_ref: r.txnRef, p_amount: r.amount, p_success: r.success, p_provider_txn: r.provider_txn || null, p_message: r.message, p_raw: params,
      });
      const order = await db().rpc<Record<string, unknown> | null>('payment_lookup', { p_txn_ref: r.txnRef });
      return json({
        success: r.success && res !== 'amount_mismatch' && res !== 'not_found',
        message: r.success ? 'Thanh toán thành công' : r.message,
        txnRef: r.txnRef,
        order,
      });
    }

    // ------------------------------------------------------------ SePay: tiền vào tài khoản ngân hàng
    if (route === 'sepay' && req.method === 'POST') {
      const key = env.SEPAY_API_KEY || '';
      const auth = req.headers.get('authorization') || '';
      if (!key || !safeEqual(auth, `Apikey ${key}`)) return json({ success: false, message: 'Unauthorized' }, 401);
      const b = await readJson(req);
      if (b.transferType && b.transferType !== 'in') return json({ success: true, result: 'skip_out' });
      const result = await db().rpc<Record<string, unknown>>('payment_bank_transfer', {
        p_ref: String(b.id ?? b.referenceCode ?? ''), p_content: String(b.content ?? b.description ?? ''),
        p_amount: Math.round(Number(b.transferAmount || 0)), p_raw: b,
      });
      return json({ success: true, result });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('[payments]', e);
    return json({ error: 'Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline' }, 500);
  }
}
