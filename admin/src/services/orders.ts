// Tạo đơn hàng trong quản trị (máy chủ PHP hoặc bản demo) và cách tính tổng tiền dùng chung.
import {ad} from './runtime';
import type {Row} from '../types';

export const VAT_RATES: [number, string][] = [[10, 'VAT 10%'], [8, 'VAT 8%'], [5, 'VAT 5%'], [0, 'VAT 0%'], [-1, 'Không chịu thuế']];
export type OrderLine = {key: string; product_id: string | number | null; name: string; sku: string; unit: string; qty: number; price: number; stock?: number};

// PHẢI khớp adminOrderTotals (server/shop.php) và bản demo (admin/assets/js/db.js)
export function adminOrderTotals(lines: {price: number; qty: number}[], install: number, shipping: number, discount: number, rate: number, included: boolean) {
  const goods = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const base = goods + install + shipping - discount;
  const vat = rate <= 0 ? 0 : included ? base - Math.round(base / (1 + rate / 100)) : Math.round((base * rate) / 100);
  return {goods, base, vat, total: included || rate <= 0 ? base : base + vat};
}

type Db = typeof ad.db & {createOrder?: (args: Row) => Promise<Row>};
export function createOrder(args: Row): Promise<Row> {
  const db = ad.db as Db;
  return db.mode === 'mysql' ? db.rpc('admin_create_order', args) : db.createOrder!(args);
}
