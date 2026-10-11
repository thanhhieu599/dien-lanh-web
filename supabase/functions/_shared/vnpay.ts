// Cổng VNPay - API thanh toán phiên bản 2.1.0
// Chữ ký: HMAC-SHA512 trên chuỗi tham số vnp_* sắp xếp theo tên, giá trị mã hóa URL (khoảng trắng = "+"),
// đúng như code mẫu chính thức của VNPay (querystring.stringify sau khi sortObject).
import { hmacHex, safeEqual } from './crypto.ts';
import { vnStamp } from './format.ts';

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;      // sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
  returnUrl: string;
}

const encode = (s: string) => encodeURIComponent(s).replace(/%20/g, '+');

export function signData(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => `${encode(k)}=${encode(String(params[k]))}`)
    .join('&');
}

export async function buildPaymentUrl(cfg: VnpayConfig, o: {
  txnRef: string; amount: number; orderInfo: string; ip: string; bankCode?: string; now?: Date; expireMinutes?: number;
}): Promise<string> {
  const now = o.now || new Date();
  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: String(Math.round(o.amount) * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: o.txnRef,
    vnp_OrderInfo: o.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: o.ip,
    vnp_CreateDate: vnStamp(now),
    vnp_ExpireDate: vnStamp(new Date(now.getTime() + (o.expireMinutes ?? 15) * 60000)),
  };
  if (o.bankCode) params.vnp_BankCode = o.bankCode;
  const data = signData(params);
  const hash = await hmacHex('SHA-512', cfg.hashSecret, data);
  return `${cfg.payUrl}?${data}&vnp_SecureHash=${hash}`;
}

export interface VnpayResult {
  valid: boolean;
  txnRef: string;
  amount: number;
  success: boolean;
  transactionNo: string;
  responseCode: string;
  bankCode: string;
}

// Kiểm tra tham số VNPay gửi về (IPN hoặc Return URL). params: giá trị đã giải mã.
export async function verify(cfg: Pick<VnpayConfig, 'hashSecret'>, params: Record<string, string>): Promise<VnpayResult> {
  const given = String(params.vnp_SecureHash || '').toLowerCase();
  const expected = await hmacHex('SHA-512', cfg.hashSecret, signData(params));
  return {
    valid: !!given && safeEqual(given, expected),
    txnRef: params.vnp_TxnRef || '',
    amount: Math.round(Number(params.vnp_Amount || 0) / 100),
    success: params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00',
    transactionNo: params.vnp_TransactionNo || '',
    responseCode: params.vnp_ResponseCode || '',
    bankCode: params.vnp_BankCode || '',
  };
}

// Thông báo lỗi tiếng Việt theo vnp_ResponseCode (bảng mã của VNPay)
export const RESPONSE_TEXT: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ, ngân hàng đang kiểm tra',
  '09': 'Thẻ/tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
  '11': 'Hết thời gian chờ thanh toán',
  '12': 'Thẻ/tài khoản bị khóa',
  '13': 'Sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Bạn đã hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản vượt hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi không xác định',
};
