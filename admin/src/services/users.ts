// Cấu hình → Tài khoản & phân quyền: gọi máy chủ PHP (rpc admin_users) hoặc bản demo.
import {ad} from './runtime';
import type {Row} from '../types';
type Db = typeof ad.db & {adminUsers?: (args: Row) => Promise<any>};
export function usersOp(op: string, args: Row = {}): Promise<any> {
  const db = ad.db as Db;
  return db.mode === 'mysql' ? db.rpc('admin_users', {p_op: op, ...args}) : db.adminUsers!({p_op: op, ...args});
}
// Mô tả quyền từng vai trò (khớp services/permissions.ts và máy chủ)
export const ROLE_INFO: [string, string, string][] = [
  ['admin', 'Quản trị viên', 'Toàn quyền: mọi chức năng, cài đặt cửa hàng, nội dung website, tài khoản & phân quyền.'],
  ['staff', 'Nhân viên vận hành', 'Đơn hàng, khách hàng, sản phẩm, kho hàng, marketing, báo cáo. Không sửa cài đặt cửa hàng và tài khoản.'],
  ['sales', 'Nhân viên kinh doanh', 'Chỉ xem và chăm sóc các yêu cầu khách hàng được giao cho mình.'],
  ['accountant', 'Kế toán', 'Đơn hàng & thanh toán, hóa đơn, phiếu kho, báo cáo, xuất Excel MISA. Chỉ được cập nhật tình trạng thanh toán.'],
];
export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLE_INFO.map(([k, l]) => [k, l]));
