<?php
declare(strict_types=1);
// Kho hàng: nhập hàng từ nhà cung cấp, kiểm hàng (cân bằng kho), xuất kho, lịch sử kho, hóa đơn bán hàng.
// Mọi thay đổi tồn kho đi qua stockMove() để luôn có dòng lịch sử (ai, lúc nào, trước → sau).
// Luật PHẢI khớp bản demo trong admin/assets/js/inventory.js (AD.inventoryCore).

const INVENTORY_TABLES = ['purchase_orders', 'stock_adjustments', 'stock_exports', 'stock_moves'];
const EXPORT_REASONS = ['damaged', 'sample', 'gift', 'internal', 'return_supplier', 'other'];

// Mã chứng từ tăng dần: PON00001, IAN00001, PXK00001, HĐ 0000001 (bộ đếm nằm trong settings 'counters')
function nextCode(string $prefix, int $pad = 5): string {
    $row = record('settings', 'counters', true) ?? ['key' => 'counters', 'value' => []];
    $n = (int)($row['value'][$prefix] ?? 0) + 1;
    $row['value'][$prefix] = $n;
    put('settings', $row);
    return $prefix . str_pad((string)$n, $pad, '0', STR_PAD_LEFT);
}
function userName(?array $user): string { return (string)($user['name'] ?? $user['phone'] ?? 'Hệ thống'); }

// Ghi 1 lần thay đổi tồn kho và cập nhật sản phẩm (sản phẩm truyền vào đã được khóa FOR UPDATE)
function stockMove(array &$p, int $delta, string $type, string $ref = '', string $note = '', ?array $user = null, ?float $cost = null, bool $save = true): void {
    if ($delta === 0) return;
    $before = (int)($p['stock'] ?? 0); $after = $before + $delta;
    if ($after < 0) fail('Không đủ tồn kho: ' . ($p['name'] ?? $p['id']) . " (còn $before)");
    $p['stock'] = $after;
    if ($save) put('products', $p);
    put('stock_moves', [
        'product_id' => $p['id'], 'sku' => $p['sku'] ?? '', 'name' => $p['name'] ?? '', 'type' => $type, 'ref' => $ref,
        'change' => $delta, 'before' => $before, 'after' => $after, 'cost' => $cost ?? (float)($p['cost_price'] ?? 0),
        'note' => $note, 'user_id' => $user['id'] ?? null, 'user_name' => userName($user),
    ], true);
}
function invInt(mixed $v, int $min, int $max, string $label): int {
    if (!is_numeric($v) || floor((float)$v) != $v || $v < $min || $v > $max) fail("$label không hợp lệ");
    return (int)$v;
}
function invMoney(mixed $v, string $label): float {
    if ($v === null || $v === '') return 0.0;
    if (!is_numeric($v) || $v < 0 || $v > 1e12) fail("$label không hợp lệ");
    return round((float)$v);
}
// Dòng sản phẩm của chứng từ: chụp lại SKU, tên, đơn vị tại thời điểm lập
function invLines(array $items, string $kind): array {
    if (!$items || count($items) > 500) fail('Chứng từ phải có từ 1 đến 500 dòng sản phẩm');
    $lines = []; $seen = [];
    foreach ($items as $item) {
        $p = record('products', $item['product_id'] ?? '');
        if (!$p) fail('Sản phẩm không tồn tại');
        if (isset($seen[$p['id']])) fail('Sản phẩm bị trùng dòng: ' . $p['name']);
        $seen[$p['id']] = true;
        $line = ['product_id' => $p['id'], 'sku' => $p['sku'] ?? '', 'name' => $p['name'], 'unit' => $p['unit'] ?? 'Cái', 'note' => trim((string)($item['note'] ?? ''))];
        if ($kind === 'purchase') {
            $line['qty'] = invInt($item['qty'] ?? 0, 1, 1000000, 'Số lượng nhập');
            $line['price'] = invMoney($item['price'] ?? 0, 'Đơn giá');
            $line['discount'] = invMoney($item['discount'] ?? 0, 'Chiết khấu dòng');
            $line['tax_rate'] = (float)invInt($item['tax_rate'] ?? 0, 0, 100, 'Thuế suất');
            if ($line['discount'] > $line['qty'] * $line['price']) fail('Chiết khấu vượt thành tiền: ' . $p['name']);
        } elseif ($kind === 'export') {
            $line['qty'] = invInt($item['qty'] ?? 0, 1, 1000000, 'Số lượng xuất');
        } else {
            $line['actual'] = invInt($item['actual'] ?? -1, 0, 100000000, 'Tồn thực tế');
            $line['system'] = (int)($p['stock'] ?? 0);
            $line['diff'] = $line['actual'] - $line['system'];
            $line['reason'] = trim((string)($item['reason'] ?? ''));
        }
        $lines[] = $line;
    }
    return $lines;
}
// Tổng tiền đơn nhập: hàng - chiết khấu + chi phí + thuế
function purchaseTotals(array $lines, float $discount, array $costs): array {
    $goods = 0.0; $tax = 0.0; $qty = 0;
    foreach ($lines as $l) { $net = $l['qty'] * $l['price'] - $l['discount']; $goods += $net; $tax += round($net * $l['tax_rate'] / 100); $qty += $l['qty']; }
    if ($discount > $goods) fail('Chiết khấu đơn vượt tổng tiền hàng');
    $cost = array_sum(array_map(fn($c) => invMoney($c['amount'] ?? 0, 'Chi phí nhập'), $costs));
    return ['qty' => $qty, 'goods' => $goods, 'discount' => $discount, 'costs_total' => $cost, 'tax' => $tax, 'total' => max(0, $goods - $discount + $cost + $tax)];
}
function supplierRecalc(mixed $id): void {
    if ($id === null || $id === '') return;
    $s = record('suppliers', $id, true); if (!$s) return;
    $debt = 0.0; $bought = 0.0; $count = 0;
    foreach (allRecords('purchase_orders') as $po) {
        if ((string)($po['supplier_id'] ?? '') !== (string)$id || ($po['status'] ?? '') === 'cancelled' || empty($po['received'])) continue;
        $bought += $po['total']; $debt += $po['total'] - ($po['paid'] ?? 0); $count++;
    }
    $s['debt'] = max(0, $debt); $s['total_purchased'] = $bought; $s['purchase_count'] = $count;
    put('suppliers', $s);
}
function purchaseStatus(array $po): string {
    if (($po['status'] ?? '') === 'cancelled') return 'cancelled';
    return !empty($po['received']) && ($po['paid'] ?? 0) >= $po['total'] ? 'done' : 'ordered';
}
function purchaseReceive(array $po, array $user): array {
    if (!empty($po['received'])) fail('Đơn đã nhập kho');
    if ($po['status'] === 'cancelled') fail('Đơn đã hủy');
    // Phân bổ chiết khấu đơn và chi phí nhập theo giá trị dòng để tính giá vốn
    $goods = max(1, $po['goods']); $extra = $po['costs_total'] - $po['discount'];
    $lines = $po['items']; usort($lines, fn($a, $b) => $a['product_id'] <=> $b['product_id']);
    foreach ($lines as $l) {
        $p = record('products', $l['product_id'], true);
        if (!$p) fail('Sản phẩm không còn tồn tại: ' . $l['name']);
        $net = $l['qty'] * $l['price'] - $l['discount'];
        $unitCost = max(0, ($net + $extra * $net / $goods) / $l['qty']);
        $oldQty = max(0, (int)($p['stock'] ?? 0)); $oldCost = (float)($p['cost_price'] ?? 0);
        $p['cost_price'] = round(($oldQty * $oldCost + $l['qty'] * $unitCost) / ($oldQty + $l['qty']));
        $p['import_price'] = $l['price'];
        stockMove($p, $l['qty'], 'purchase', $po['code'], 'Nhập hàng từ NCC', $user, $unitCost);
    }
    $po['received'] = true; $po['received_at'] = now(); $po['received_by'] = userName($user);
    $po['status'] = purchaseStatus($po);
    $po = put('purchase_orders', $po);
    supplierRecalc($po['supplier_id']);
    return $po;
}
function purchasePay(array $po, array $p, array $user): array {
    if ($po['status'] === 'cancelled') fail('Đơn đã hủy');
    $amount = invMoney($p['amount'] ?? 0, 'Số tiền thanh toán');
    $left = $po['total'] - ($po['paid'] ?? 0);
    if ($amount <= 0 || $amount > $left) fail('Số tiền thanh toán phải lớn hơn 0 và không vượt ' . number_format($left, 0, ',', '.') . '₫');
    $method = in_array($p['method'] ?? '', ['cash', 'bank'], true) ? $p['method'] : 'bank';
    $po['payments'][] = ['amount' => $amount, 'method' => $method, 'note' => trim((string)($p['note'] ?? '')), 'at' => now(), 'by' => userName($user)];
    $po['paid'] = ($po['paid'] ?? 0) + $amount;
    $po['status'] = purchaseStatus($po);
    $po = put('purchase_orders', $po);
    supplierRecalc($po['supplier_id']);
    return $po;
}

function inventoryEndpoint(array $a): array {
    $user = staff();
    $op = $a['p_op'] ?? '';
    $writer = in_array($user['role'], ['admin', 'staff'], true);
    if (!$writer && !($user['role'] === 'accountant' && $op === 'purchase_pay')) fail('Không có quyền', 403);
    return transaction(function() use ($a, $op, $user) {
        $id = $a['p_id'] ?? null;
        switch ($op) {
            case 'purchase_save': {
                $po = $id ? record('purchase_orders', $id, true) : null;
                if ($id && !$po) fail('Không tìm thấy đơn nhập', 404);
                if ($po && (!empty($po['received']) || $po['status'] === 'cancelled')) fail('Đơn đã nhập kho hoặc đã hủy, không sửa được');
                $supplier = record('suppliers', $a['supplier_id'] ?? '');
                if (!$supplier) fail('Vui lòng chọn nhà cung cấp');
                $lines = invLines($a['items'] ?? [], 'purchase');
                $costs = array_values(array_filter(array_map(fn($c) => ['name' => trim((string)($c['name'] ?? 'Chi phí')), 'amount' => invMoney($c['amount'] ?? 0, 'Chi phí nhập')], $a['costs'] ?? []), fn($c) => $c['amount'] > 0));
                $totals = purchaseTotals($lines, invMoney($a['discount'] ?? 0, 'Chiết khấu đơn'), $costs);
                $po = array_merge($po ?? ['code' => nextCode('PON'), 'status' => 'ordered', 'received' => false, 'paid' => 0, 'payments' => [], 'created_by' => userName($user)], $totals, [
                    'supplier_id' => $supplier['id'], 'supplier_name' => $supplier['name'], 'items' => $lines, 'costs' => $costs,
                    'expected_date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($a['expected_date'] ?? '')) ? $a['expected_date'] : null,
                    'note' => trim((string)($a['note'] ?? '')), 'tags' => array_values(array_filter(array_map('trim', (array)($a['tags'] ?? [])))),
                ]);
                if (($po['paid'] ?? 0) > $po['total']) fail('Tổng đơn nhỏ hơn số tiền đã thanh toán');
                $po = put('purchase_orders', $po, !$id);
                if (!empty($a['receive'])) $po = purchaseReceive($po, $user);
                if (!empty($a['payment']['amount'])) $po = purchasePay($po, $a['payment'], $user);
                return $po;
            }
            case 'purchase_receive': return purchaseReceive(record('purchase_orders', $id, true) ?? fail('Không tìm thấy đơn nhập', 404), $user);
            case 'purchase_pay': return purchasePay(record('purchase_orders', $id, true) ?? fail('Không tìm thấy đơn nhập', 404), $a, $user);
            case 'purchase_cancel': {
                $po = record('purchase_orders', $id, true) ?? fail('Không tìm thấy đơn nhập', 404);
                if (!empty($po['received'])) fail('Đơn đã nhập kho: hãy lập phiếu xuất kho "Trả nhà cung cấp"');
                if (($po['paid'] ?? 0) > 0) fail('Đơn đã thanh toán một phần, không hủy được');
                $po['status'] = 'cancelled'; $po['cancelled_at'] = now();
                return put('purchase_orders', $po);
            }
            case 'adjustment_save': {
                $doc = $id ? record('stock_adjustments', $id, true) : null;
                if ($id && !$doc) fail('Không tìm thấy phiếu kiểm', 404);
                if ($doc && $doc['status'] === 'balanced') fail('Phiếu đã cân bằng, không sửa được');
                $doc = array_merge($doc ?? ['code' => nextCode('IAN'), 'status' => 'draft', 'created_by' => userName($user)], [
                    'items' => invLines($a['items'] ?? [], 'adjust'), 'note' => trim((string)($a['note'] ?? '')),
                    'checker' => trim((string)($a['checker'] ?? userName($user))),
                ]);
                $doc = put('stock_adjustments', $doc, !$id);
                if (empty($a['balance'])) return $doc;
                $id = $doc['id'];
            }
            // tiếp tục: cân bằng kho
            case 'adjustment_balance': {
                $doc = record('stock_adjustments', $id, true) ?? fail('Không tìm thấy phiếu kiểm', 404);
                if ($doc['status'] === 'balanced') fail('Phiếu đã cân bằng');
                $items = $doc['items']; usort($items, fn($x, $y) => $x['product_id'] <=> $y['product_id']);
                $done = [];
                foreach ($items as $l) {
                    $p = record('products', $l['product_id'], true) ?? fail('Sản phẩm không còn tồn tại: ' . $l['name']);
                    $l['system'] = (int)($p['stock'] ?? 0); $l['diff'] = $l['actual'] - $l['system'];
                    stockMove($p, $l['diff'], 'adjust', $doc['code'], $l['reason'] ?: 'Kiểm hàng', $user);
                    $done[$l['product_id']] = $l;
                }
                $doc['items'] = array_map(fn($l) => $done[$l['product_id']], $doc['items']);
                $doc['status'] = 'balanced'; $doc['balanced_at'] = now(); $doc['balanced_by'] = userName($user);
                return put('stock_adjustments', $doc);
            }
            case 'export_save': {
                $doc = $id ? record('stock_exports', $id, true) : null;
                if ($id && !$doc) fail('Không tìm thấy phiếu xuất', 404);
                if ($doc && $doc['status'] === 'done') fail('Phiếu đã xuất kho, không sửa được');
                if (!in_array($a['reason'] ?? '', EXPORT_REASONS, true)) fail('Vui lòng chọn lý do xuất');
                $doc = array_merge($doc ?? ['code' => nextCode('PXK'), 'status' => 'draft', 'created_by' => userName($user)], [
                    'reason' => $a['reason'], 'items' => invLines($a['items'] ?? [], 'export'), 'note' => trim((string)($a['note'] ?? '')),
                    'receiver' => trim((string)($a['receiver'] ?? '')),
                ]);
                $doc = put('stock_exports', $doc, !$id);
                if (empty($a['confirm'])) return $doc;
                $id = $doc['id'];
            }
            case 'export_confirm': {
                $doc = record('stock_exports', $id, true) ?? fail('Không tìm thấy phiếu xuất', 404);
                if ($doc['status'] === 'done') fail('Phiếu đã xuất kho');
                $items = $doc['items']; usort($items, fn($x, $y) => $x['product_id'] <=> $y['product_id']);
                $value = 0.0; $costs = [];
                foreach ($items as $l) {
                    $p = record('products', $l['product_id'], true) ?? fail('Sản phẩm không còn tồn tại: ' . $l['name']);
                    $costs[$l['product_id']] = (float)($p['cost_price'] ?? 0); $value += $l['qty'] * $costs[$l['product_id']];
                    stockMove($p, -$l['qty'], 'export', $doc['code'], $l['note'] ?: 'Xuất kho', $user);
                }
                $doc['items'] = array_map(fn($l) => $l + ['cost' => $costs[$l['product_id']]], $doc['items']);
                $doc['value'] = $value; $doc['status'] = 'done'; $doc['done_at'] = now(); $doc['done_by'] = userName($user);
                return put('stock_exports', $doc);
            }
            case 'delete_draft': {
                $table = ['adjustment' => 'stock_adjustments', 'export' => 'stock_exports'][$a['p_kind'] ?? ''] ?? fail('Loại phiếu không hợp lệ');
                $doc = record($table, $id, true) ?? fail('Không tìm thấy phiếu', 404);
                if ($doc['status'] !== 'draft') fail('Chỉ xóa được phiếu nháp');
                sql('DELETE FROM records WHERE resource=? AND record_id=?', [$table, (string)$id]);
                return ['deleted' => true];
            }
        }
        fail('Thao tác kho không hợp lệ');
    });
}
// Hóa đơn bán hàng: cấp số hóa đơn 1 lần cho đơn (không cấp cho đơn đã hủy)
function issueInvoice(array $a): array {
    $user = staff();
    if (!in_array($user['role'], ['admin', 'staff', 'accountant'], true)) fail('Không có quyền', 403);
    return transaction(function() use ($a, $user) {
        $o = record('orders', $a['p_id'] ?? '', true) ?? fail('Không tìm thấy đơn hàng', 404);
        if ($o['status'] === 'cancelled') fail('Đơn đã hủy, không xuất hóa đơn');
        if (empty($o['invoice_no'])) {
            $o['invoice_no'] = substr(nextCode('HD', 7), 2);
            $o['invoiced_at'] = now(); $o['invoiced_by'] = userName($user);
            $o = put('orders', $o);
        }
        return $o;
    });
}
