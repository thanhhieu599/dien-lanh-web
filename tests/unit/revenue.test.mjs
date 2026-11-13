import test from 'node:test';
import assert from 'node:assert/strict';
import {revenueSummary} from '../../admin/src/services/revenue.ts';
const day = 86400000, now = Date.parse('2026-11-13T00:00:00Z');
const o = (code, status, payment, payment_status, total, daysAgo = 0) => ({code, status, payment, payment_status, total, created_at: new Date(now - daysAgo * day).toISOString()});
test('Đối soát doanh thu: đã thu / chưa thu / cần xử lý', () => {
  const r = revenueSummary([
    o('A', 'done', 'cod', 'paid', 1000), o('B', 'done', 'bank', 'unpaid', 2000), o('C', 'pending', 'bank', 'unpaid', 3000, 5),
    o('D', 'cancelled', 'bank', 'paid', 4000), o('E', 'cancelled', 'cod', 'unpaid', 5000), o('F', 'confirmed', 'bank', 'paid', 600, 9),
    o('G', 'shipping', 'cod', 'unpaid', 700, 9),
  ], now);
  assert.equal(r.orders, 5);
  assert.equal(r.booked, 1000 + 2000 + 3000 + 600 + 700, 'Đơn hủy không tính doanh số');
  assert.equal(r.collected, 1000 + 600, 'Chỉ tính đơn đã thu đủ tiền, không tính đơn hủy dù đã thu');
  assert.equal(r.outstanding, 2000 + 3000 + 700);
  assert.deepEqual(r.doneUnpaid.map((x) => x.code), ['B']);
  assert.deepEqual(r.toRefund.map((x) => x.code), ['D']);
  assert.deepEqual(r.staleBank.map((x) => x.code), ['C'], 'COD chưa thu là bình thường; chỉ cảnh báo chuyển khoản quá 2 ngày');
});
