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
  ['admin', 'Quản trị viên', 'Toàn quyền: mọi chức năng, gồm cả Tài khoản & phân quyền (tạo tài khoản, đổi vai trò, đặt lại mật khẩu, khóa).'],
  ['sales', 'Nhân viên kinh doanh', 'Mọi chức năng như quản trị viên, trừ mục Tài khoản & phân quyền (không thấy, không tạo/sửa/khóa tài khoản).'],
];
// Vai trò cũ (không còn cấp mới) vẫn hiện đúng tên nếu tài khoản còn giữ
export const ROLE_LABEL: Record<string, string> = {staff: 'Nhân viên vận hành', accountant: 'Kế toán', ...Object.fromEntries(ROLE_INFO.map(([k, l]) => [k, l]))};
