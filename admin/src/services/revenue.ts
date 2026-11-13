// Đối soát doanh thu: tách tiền đã thu / chưa thu và các đơn cần xử lý tiền (tránh thất thoát).
// Hàm thuần, kiểm thử bằng node (tests/unit/revenue.test.mjs).
import type {Row} from '../types';

export interface RevenueSummary {
  orders: number; booked: number; collected: number; outstanding: number;
  doneUnpaid: Row[]; toRefund: Row[]; staleBank: Row[];
}
const n = (v: unknown) => Number(v) || 0;
// booked: doanh số đặt (đơn chưa hủy); collected: đã thu đủ tiền; outstanding: còn phải thu
export function revenueSummary(orders: Row[], now = Date.now(), staleDays = 2): RevenueSummary {
  const valid = orders.filter((o) => o.status !== 'cancelled');
  const paid = valid.filter((o) => o.payment_status === 'paid');
  const booked = valid.reduce((s, o) => s + n(o.total), 0);
  const collected = paid.reduce((s, o) => s + n(o.total), 0);
  return {
    orders: valid.length, booked, collected, outstanding: booked - collected,
    // Đã giao xong nhưng chưa ghi nhận thu tiền (thường là đơn chuyển khoản / công nợ)
    doneUnpaid: valid.filter((o) => o.status === 'done' && o.payment_status !== 'paid'),
    // Đã thu tiền nhưng đơn bị hủy: phải hoàn tiền cho khách hoặc sửa trạng thái
    toRefund: orders.filter((o) => o.status === 'cancelled' && ['paid', 'partial'].includes(o.payment_status)),
    // Đơn chuyển khoản quá hạn chưa thấy tiền về
    staleBank: valid.filter((o) => o.payment === 'bank' && o.payment_status === 'unpaid' && o.status !== 'done' && now - new Date(o.created_at).getTime() > staleDays * 86400000),
  };
}
