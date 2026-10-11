// Cài đặt THAM CHIẾU độc lập (Node crypto + querystring) theo đúng code mẫu chính thức của VNPay / MoMo,
// dùng để đối chiếu với bản Web Crypto trong _shared/ (chạy trên Deno).
import crypto from 'node:crypto';

// Code mẫu VNPay (vnpay_nodejs): sortObject mã hóa key/value bằng encodeURIComponent, %20 -> "+"
export function vnpaySortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).map(encodeURIComponent).sort();
  for (const k of keys) sorted[k] = encodeURIComponent(obj[decodeURIComponent(k)]).replace(/%20/g, '+');
  return sorted;
}
export function vnpaySign(secret, params) {
  const p = { ...params };
  delete p.vnp_SecureHash; delete p.vnp_SecureHashType;
  // = qs.stringify(sorted, { encode: false }) trong code mẫu (gói npm "qs")
  const sorted = vnpaySortObject(p);
  const signData = Object.keys(sorted).map((k) => `${k}=${sorted[k]}`).join('&');
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

export const momoSign = (secret, raw) => crypto.createHmac('sha256', secret).update(raw).digest('hex');
export function momoIpnRaw(accessKey, p) {
  return `accessKey=${accessKey}&amount=${p.amount}&extraData=${p.extraData}&message=${p.message}&orderId=${p.orderId}&orderInfo=${p.orderInfo}` +
    `&orderType=${p.orderType}&partnerCode=${p.partnerCode}&payType=${p.payType}&requestId=${p.requestId}&responseTime=${p.responseTime}` +
    `&resultCode=${p.resultCode}&transId=${p.transId}`;
}
