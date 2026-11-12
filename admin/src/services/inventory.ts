// Kho hàng: gọi thao tác kho (máy chủ PHP hoặc bản demo) và các phép tính dùng chung cho giao diện.
import {ad} from './runtime';
import type {Row} from '../types';

type Db = typeof ad.db & {inventory?: (op: string, args: Row) => Promise<Row>; issueInvoice?: (id: unknown) => Promise<Row>};
export function invOp(op: string, args: Row = {}): Promise<Row> {
  const db = ad.db as Db;
  return db.mode === 'mysql' ? db.rpc('inventory', {p_op: op, ...args}) : db.inventory!(op, args);
}
export function issueInvoice(id: unknown): Promise<Row> {
  const db = ad.db as Db;
  return db.mode === 'mysql' ? db.rpc('issue_invoice', {p_id: id}) : db.issueInvoice!(id);
}

export const MOVE_TYPES: Record<string, string> = {purchase: 'Nhập hàng', sale: 'Bán hàng', cancel: 'Hủy đơn – hoàn kho', adjust: 'Kiểm hàng', export: 'Xuất kho', initial: 'Khởi tạo kho', manual: 'Sửa tay'};
export const EXPORT_REASONS: [string, string][] = [['damaged', 'Hàng hỏng / lỗi'], ['sample', 'Hàng mẫu / trưng bày'], ['gift', 'Quà tặng doanh nghiệp'], ['internal', 'Sử dụng nội bộ'], ['return_supplier', 'Trả nhà cung cấp'], ['other', 'Khác']];
export const PURCHASE_STATUS: Record<string, string> = {ordered: 'Đang giao dịch', done: 'Hoàn thành', cancelled: 'Đã hủy'};
// Đơn bán chưa giao xong: số lượng đã giữ cho khách (đã trừ khỏi "Có thể bán")
export const OPEN_ORDER = ['pending', 'confirmed', 'shipping', 'installing'];

const add = (m: Map<string, number>, k: unknown, n: number) => m.set(String(k), (m.get(String(k)) || 0) + n);
export function reservedMap(orders: Row[]) {
  const m = new Map<string, number>();
  orders.filter((o) => OPEN_ORDER.includes(o.status)).forEach((o) => (o.order_items || o.items || []).forEach((i: Row) => add(m, i.product_id ?? i.id, Number(i.qty) || 0)));
  return m;
}
export function incomingMap(pos: Row[]) {
  const m = new Map<string, number>();
  pos.filter((p) => p.status !== 'cancelled' && !p.received).forEach((p) => (p.items || []).forEach((i: Row) => add(m, i.product_id, Number(i.qty) || 0)));
  return m;
}
export type StockLevel = 'out' | 'low' | 'ok';
export const stockLevel = (p: Row): StockLevel => {
  const s = Number(p.stock) || 0;
  return s <= 0 ? 'out' : s <= (Number(p.min_stock) || 5) ? 'low' : 'ok';
};
export const LEVEL_LABEL: Record<StockLevel, string> = {out: 'Hết hàng', low: 'Sắp hết', ok: 'Còn hàng'};

// Tổng đơn nhập (xem trước ở trình duyệt; máy chủ tính lại khi lưu)
export function purchaseTotals(items: Row[], discount: number, costs: Row[]) {
  let goods = 0, tax = 0, qty = 0;
  items.forEach((l) => {
    const net = (Number(l.qty) || 0) * (Number(l.price) || 0) - (Number(l.discount) || 0);
    goods += net; tax += Math.round((net * (Number(l.tax_rate) || 0)) / 100); qty += Number(l.qty) || 0;
  });
  const costsTotal = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  return {qty, goods, tax, costs_total: costsTotal, total: Math.max(0, goods - (Number(discount) || 0) + costsTotal + tax)};
}

// Đọc số tiền bằng chữ (tiếng Việt) cho hóa đơn
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function readTriple(n: number, full: boolean) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  const out: string[] = [];
  if (full || h) out.push(DIGITS[h], 'trăm');
  if (t > 1) out.push(DIGITS[t], 'mươi');
  else if (t === 1) out.push('mười');
  else if (u && (full || h)) out.push('lẻ');
  if (u) out.push(u === 1 && t > 1 ? 'mốt' : u === 5 && t > 0 ? 'lăm' : u === 4 && t > 1 ? 'tư' : DIGITS[u]);
  return out.join(' ');
}
export function moneyWords(value: number) {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (!n) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const groups: number[] = [];
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    parts.push(readTriple(groups[i], i < groups.length - 1), units[i]);
  }
  const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1) + ' đồng chẵn';
}
