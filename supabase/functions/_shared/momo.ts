// Ví MoMo - API v2 (captureWallet / payWithMethod). Chữ ký HMAC-SHA256 trên chuỗi "key=value&..." theo thứ tự quy định.
import { hmacHex, safeEqual } from './crypto.ts';
import type { Fetch } from './http.ts';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;        // test: https://test-payment.momo.vn  | thật: https://payment.momo.vn
  requestType: string;     // captureWallet (quét QR / app MoMo) hoặc payWithMethod (cho chọn ví, ATM, thẻ)
  redirectUrl: string;
  ipnUrl: string;
  partnerName?: string;
}

export const MOMO_MIN = 1000;
export const MOMO_MAX = 50000000;

export function createRaw(cfg: MomoConfig, b: { amount: number; orderId: string; orderInfo: string; requestId: string; extraData: string }) {
  return `accessKey=${cfg.accessKey}&amount=${b.amount}&extraData=${b.extraData}&ipnUrl=${cfg.ipnUrl}&orderId=${b.orderId}` +
    `&orderInfo=${b.orderInfo}&partnerCode=${cfg.partnerCode}&redirectUrl=${cfg.redirectUrl}&requestId=${b.requestId}&requestType=${cfg.requestType}`;
}

export async function createPayment(cfg: MomoConfig, o: { orderId: string; amount: number; orderInfo: string }, fetchFn: Fetch = fetch) {
  const requestId = `${o.orderId}-${Date.now()}`;
  const b = { amount: Math.round(o.amount), orderId: o.orderId, orderInfo: o.orderInfo, requestId, extraData: '' };
  const signature = await hmacHex('SHA-256', cfg.secretKey, createRaw(cfg, b));
  const res = await fetchFn(`${cfg.endpoint.replace(/\/+$/, '')}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      partnerCode: cfg.partnerCode, partnerName: cfg.partnerName || 'Ten thuong hieu', storeId: cfg.partnerCode,
      requestId, amount: b.amount, orderId: b.orderId, orderInfo: b.orderInfo,
      redirectUrl: cfg.redirectUrl, ipnUrl: cfg.ipnUrl, lang: 'vi', requestType: cfg.requestType,
      autoCapture: true, extraData: '', orderGroupId: '', signature,
    }),
  });
  const d = await res.json().catch(() => ({})) as { resultCode?: number; message?: string; payUrl?: string };
  if (d.resultCode !== 0 || !d.payUrl) throw new Error(`MoMo: ${d.message || `HTTP ${res.status}`}`);
  return d.payUrl;
}

const RESULT_FIELDS = ['amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];

// Kiểm tra IPN (POST JSON) hoặc redirect (query string) - cùng công thức chữ ký
export async function verify(cfg: Pick<MomoConfig, 'accessKey' | 'secretKey' | 'partnerCode'>, p: Record<string, unknown>) {
  const raw = `accessKey=${cfg.accessKey}&` + RESULT_FIELDS.map((k) => `${k}=${p[k] ?? ''}`).join('&');
  const expected = await hmacHex('SHA-256', cfg.secretKey, raw);
  return {
    valid: !!p.signature && safeEqual(String(p.signature), expected) && String(p.partnerCode) === cfg.partnerCode,
    txnRef: String(p.orderId || ''),
    amount: Math.round(Number(p.amount || 0)),
    success: Number(p.resultCode) === 0,
    transId: String(p.transId || ''),
    message: String(p.message || ''),
  };
}
