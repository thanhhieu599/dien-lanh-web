// Định dạng tiền, ngày giờ theo giờ Việt Nam
export const money = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}₫`;

// yyyyMMddHHmmss theo GMT+7 (định dạng ngày của VNPay)
export function vnStamp(d: Date): string {
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}`;
}

export function vnDate(iso: unknown, withTime = true): string {
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return String(iso ?? '');
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${p(t.getUTCDate())}/${p(t.getUTCMonth() + 1)}/${t.getUTCFullYear()}`;
  return withTime ? `${p(t.getUTCHours())}:${p(t.getUTCMinutes())} ${date}` : date;
}

// Bỏ dấu tiếng Việt (nội dung gửi sang cổng thanh toán nên là ASCII)
export const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
