<?php
// Integration regressions against a seeded, disposable MySQL database.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
ob_start();
require __DIR__ . '/../../server/bootstrap.php';
require __DIR__ . '/../../server/data.php';
require __DIR__ . '/../../server/shop.php';

$prefix = 'admin-qa-' . bin2hex(random_bytes(6));
$created = [];
$checks = 0;
function checkAdmin(bool $ok, string $label): void {
    global $checks;
    if (!$ok) throw new RuntimeException($label);
    $checks++;
    echo "PASS $label\n";
}
function fixture(string $table, array $row): array {
    global $created;
    $created[] = [$table, $row[pk($table)]];
    return put($table, $row, true);
}
function endpoint(string $table, string $method = 'GET', array $body = [], array $query = []): mixed {
    $_GET = $query;
    return dataEndpoint($table, $method, $body);
}
function patchAdmin(string $table, mixed $id, array $body): array {
    return endpoint($table, 'PATCH', $body, [pk($table)=>'eq.' . $id])[0];
}
$_SERVER['HTTP_X_DT_ADMIN'] = '1';
try {
    $admin = fixture('profiles', ['id'=>$prefix, 'phone'=>'0900000091', 'name'=>'QA admin', 'role'=>'admin']);
    $_SESSION = ['user_id'=>$admin['id']];
    $profile = fixture('profiles', ['id'=>$prefix . '-profile', 'phone'=>'0900000092', 'name'=>'CLI customer', 'role'=>'customer', 'addresses'=>[]]);
    $customerId = 'profile:' . $profile['id'];
    $created[] = ['crm_customers', $customerId];
    checkAdmin(count(endpoint('crm_customer_summary', query:['id'=>'eq.' . $customerId])) === 1, 'CLI profile is visible in CRM');
    $saved = patchAdmin('crm_customers', $customerId, ['tags'=>['VIP'], 'note'=>'Follow up', 'profile_id'=>'forged', 'role'=>'admin']);
    checkAdmin($saved['tags'] === ['VIP'] && $saved['note'] === 'Follow up', 'CRM metadata saves for a profile without a CRM row');
    // Bảo trì: khách đăng ký + lần bảo trì có chi phí; dữ liệu sai bị chặn
    $contract = endpoint('maintenance_contracts', 'POST', ['name'=>'QA bảo trì', 'phone'=>'0900000093', 'cycle_months'=>6, 'start_date'=>'2026-01-15', 'fee_per_visit'=>500000, 'units'=>3, 'status'=>'active', 'source'=>'manual'])[0];
    $created[] = ['maintenance_contracts', $contract['id']];
    $visit = endpoint('maintenance_visits', 'POST', ['contract_id'=>$contract['id'], 'date'=>'2026-01-15', 'amount'=>500000, 'payment'=>'bank', 'paid'=>true, 'status'=>'done'])[0];
    $created[] = ['maintenance_visits', $visit['id']];
    checkAdmin(count(endpoint('maintenance_visits', query:['contract_id'=>'eq.' . $contract['id']])) === 1, 'Maintenance visit is stored for its customer');
    foreach ([
        ['maintenance_contracts', ['name'=>'Sai', 'phone'=>'123', 'cycle_months'=>6, 'start_date'=>'2026-01-01', 'status'=>'active'], 'invalid phone'],
        ['maintenance_contracts', ['name'=>'Sai', 'phone'=>'0900000094', 'cycle_months'=>5, 'start_date'=>'2026-01-01', 'status'=>'active'], 'invalid cycle'],
        ['maintenance_visits', ['contract_id'=>'missing', 'date'=>'2026-01-15', 'amount'=>1, 'payment'=>'cod'], 'unknown customer'],
        ['maintenance_visits', ['contract_id'=>$contract['id'], 'date'=>'2026-01-15', 'amount'=>-1, 'payment'=>'cod'], 'negative amount'],
        ['maintenance_visits', ['contract_id'=>$contract['id'], 'date'=>'2026-01-15', 'amount'=>1, 'payment'=>'card'], 'card payment'],
    ] as [$table, $row, $label]) {
        try { endpoint($table, 'POST', $row); throw new RuntimeException("Maintenance must reject $label"); }
        catch (HttpError $e) { checkAdmin($e->getCode() === 400, "Maintenance rejects $label"); }
    }
    checkAdmin($saved['profile_id'] === $profile['id'] && $saved['role'] === 'customer', 'CRM edit preserves account identity and role');
    patchAdmin('crm_customers', $customerId, ['phone'=>'0900000093', 'name'=>'Edited customer']);
    $summary = endpoint('crm_customer_summary', query:['profile_id'=>'eq.' . $profile['id']]);
    checkAdmin(count($summary) === 1 && $summary[0]['id'] === $customerId, 'Changing CRM phone preserves the profile link without duplicate customers');
    $vip = endpoint('crm_customer_summary', query:['tags'=>'cs.["VIP"]']);
    checkAdmin(in_array($customerId, array_column($vip, 'id'), true), 'VIP filter includes tagged customers');
    checkAdmin(!in_array('profile:' . $admin['id'], array_column($vip, 'id'), true), 'VIP filter excludes untagged customers');
    checkAdmin(matchFilter(['customer'=>['name'=>'Nguyễn Văn QA']], 'customer->>name', 'ilike.*Văn QA*'), 'Order search resolves nested customer names');
    checkAdmin(!matchFilter(['tags'=>['VIP']], 'tags', 'cs.["Other"]'), 'Array containment rejects missing tags');
    checkAdmin(!matchFilter(['tags'=>null], 'tags', 'cs.["VIP"]'), 'Array containment handles missing tags');
    $range = ['created_at'=>['gte.2026-05-01T00:00:00Z', 'lt.2026-06-01T00:00:00Z']];
    checkAdmin(matches(['created_at'=>'2026-05-15T00:00:00Z'], $range), 'Date range includes records inside the interval');
    checkAdmin(!matches(['created_at'=>'2026-04-15T00:00:00Z'], $range), 'Date range excludes records before the start');
    checkAdmin(!matches(['created_at'=>'2026-06-01T00:00:00Z'], $range), 'Date range excludes records at the upper boundary');
    $order = fixture('orders', ['id'=>$prefix . '-order', 'code'=>$prefix, 'phone'=>'0900000093', 'customer_id'=>$customerId, 'status'=>'pending', 'payment_status'=>'unpaid', 'total'=>1000]);
    $paid = patchAdmin('orders', $order['id'], ['payment_status'=>'partial']);
    checkAdmin($paid['payment_status'] === 'partial', 'Admin can save partial payment');
    // Thanh toán COD / chuyển khoản -> CRM: chỉ đơn đã thu tiền được tính vào chi tiêu
    $spentBefore = endpoint('crm_customer_summary', query:['id'=>'eq.' . $customerId])[0]['total_spent'];
    $cod = fixture('orders', ['id'=>$prefix . '-cod', 'code'=>$prefix . 'COD', 'phone'=>'0900000093', 'customer_id'=>$customerId, 'status'=>'shipping', 'payment'=>'cod', 'payment_status'=>'unpaid', 'shipping_fee'=>0, 'total'=>2500000]);
    $bank = fixture('orders', ['id'=>$prefix . '-bank', 'code'=>$prefix . 'BANK', 'phone'=>'0900000093', 'customer_id'=>$customerId, 'status'=>'shipping', 'payment'=>'bank', 'payment_status'=>'unpaid', 'shipping_fee'=>0, 'total'=>4000000]);
    $doneCod = patchAdmin('orders', $cod['id'], ['status'=>'done', 'payment_status'=>'unpaid']);
    checkAdmin($doneCod['payment_status'] === 'paid' && !empty($doneCod['paid_at']), 'COD order delivered is marked paid automatically');
    $history = array_values(array_filter(allRecords('order_status_history'), fn($h) => $h['order_id'] === $cod['id']));
    foreach ($history as $h) $created[] = ['order_status_history', $h['id']];
    checkAdmin(($history[0]['note'] ?? '') === 'Đã thu tiền COD khi giao', 'COD collection is written to order history');
    $doneBank = patchAdmin('orders', $bank['id'], ['status'=>'done']);
    foreach (allRecords('order_status_history') as $h) if ($h['order_id'] === $bank['id']) $created[] = ['order_status_history', $h['id']];
    checkAdmin($doneBank['payment_status'] === 'unpaid', 'Bank order stays unpaid until the transfer is confirmed');
    checkAdmin(endpoint('crm_customer_summary', query:['id'=>'eq.' . $customerId])[0]['total_spent'] == $spentBefore + 2500000, 'CRM counts the collected COD order only');
    checkAdmin(patchAdmin('orders', $bank['id'], ['payment_status'=>'paid'])['payment_status'] === 'paid', 'Staff confirms the bank transfer');
    checkAdmin(endpoint('crm_customer_summary', query:['id'=>'eq.' . $customerId])[0]['total_spent'] == $spentBefore + 6500000, 'CRM adds the confirmed bank transfer');
    checkAdmin(orderQuote([['product'=>['price'=>500000, 'cat'=>'vat-tu'], 'qty'=>1]], ['shippingFee'=>50000, 'freeShipThreshold'=>2000000], 'delivery', null)['shipping'] === 0, 'Old shipping settings no longer add a fee');
    // Kho hàng: nhà cung cấp, nhập hàng (giá vốn bình quân, công nợ), kiểm hàng, xuất kho, lịch sử kho
    $sup = endpoint('suppliers', 'POST', ['name'=>"[QA] NCC $prefix", 'phone'=>'0283812345', 'tax_code'=>'0301234567', 'active'=>true])[0];
    $created[] = ['suppliers', $sup['id']];
    checkAdmin(str_starts_with($sup['code'], 'NCC') && ($sup['debt'] ?? 0) == 0, 'Supplier gets a code and no debt');
    $prod = fixture('products', ['id'=>$prefix . '-p', 'sku'=>$prefix . '-p', 'slug'=>$prefix . '-p', 'name'=>'[QA] Máy lạnh', 'cat'=>allRecords('categories')[0]['id'], 'brand'=>allRecords('brands')[0]['id'], 'price'=>9000000, 'stock'=>10, 'cost_price'=>6000000, 'active'=>false]);
    $moves = fn() => array_values(array_filter(allRecords('stock_moves'), fn($m) => $m['product_id'] === $prod['id']));
    $po = rpcEndpoint('inventory', ['p_op'=>'purchase_save', 'supplier_id'=>$sup['id'], 'items'=>[['product_id'=>$prod['id'], 'qty'=>10, 'price'=>7000000, 'tax_rate'=>8]], 'costs'=>[['name'=>'Vận chuyển', 'amount'=>500000]], 'receive'=>true, 'payment'=>['amount'=>30000000, 'method'=>'bank']]);
    $created[] = ['purchase_orders', $po['id']];
    checkAdmin(preg_match('/^PON\d{5}$/', $po['code']) === 1 && $po['total'] == 70000000 + 500000 + 5600000, 'Purchase total = goods + costs + VAT');
    $p = record('products', $prod['id']);
    checkAdmin($p['stock'] === 20, 'Receiving adds stock');
    checkAdmin($p['cost_price'] == round((10 * 6000000 + 10 * 7050000) / 20), 'Weighted average cost includes allocated costs');
    checkAdmin(record('suppliers', $sup['id'])['debt'] == $po['total'] - 30000000 && $po['status'] === 'ordered', 'Supplier debt = received total - paid');
    try { rpcEndpoint('inventory', ['p_op'=>'purchase_pay', 'p_id'=>$po['id'], 'amount'=>$po['total']]); throw new RuntimeException('Overpay must fail'); }
    catch (HttpError $e) { checkAdmin(str_contains($e->getMessage(), 'không vượt'), 'Cannot pay more than remaining'); }
    $po = rpcEndpoint('inventory', ['p_op'=>'purchase_pay', 'p_id'=>$po['id'], 'amount'=>$po['total'] - 30000000, 'method'=>'cash']);
    checkAdmin($po['status'] === 'done' && record('suppliers', $sup['id'])['debt'] == 0, 'Fully paid received order is done, debt cleared');
    try { rpcEndpoint('inventory', ['p_op'=>'purchase_receive', 'p_id'=>$po['id']]); throw new RuntimeException('Double receive must fail'); }
    catch (HttpError $e) { checkAdmin(record('products', $prod['id'])['stock'] === 20, 'Order cannot be received twice'); }
    $adj = rpcEndpoint('inventory', ['p_op'=>'adjustment_save', 'items'=>[['product_id'=>$prod['id'], 'actual'=>17, 'reason'=>'Thất thoát']], 'balance'=>true]);
    $created[] = ['stock_adjustments', $adj['id']];
    checkAdmin($adj['status'] === 'balanced' && $adj['items'][0]['diff'] === -3 && record('products', $prod['id'])['stock'] === 17, 'Stocktake balances stock to counted quantity');
    try { rpcEndpoint('inventory', ['p_op'=>'export_save', 'reason'=>'gift', 'items'=>[['product_id'=>$prod['id'], 'qty'=>99]], 'confirm'=>true]); throw new RuntimeException('Over-export must fail'); }
    catch (HttpError $e) { checkAdmin(record('products', $prod['id'])['stock'] === 17 && !array_filter(allRecords('stock_exports'), fn($x) => ($x['items'][0]['product_id'] ?? '') === $prod['id']), 'Export above stock rolls back completely'); }
    $exp = rpcEndpoint('inventory', ['p_op'=>'export_save', 'reason'=>'gift', 'items'=>[['product_id'=>$prod['id'], 'qty'=>2]], 'confirm'=>true]);
    $created[] = ['stock_exports', $exp['id']];
    checkAdmin($exp['status'] === 'done' && record('products', $prod['id'])['stock'] === 15 && $exp['value'] > 0, 'Export reduces stock and records cost value');
    patchAdmin('products', $prod['id'], ['stock'=>16]);
    $types = array_column($moves(), 'type');
    sort($types);
    checkAdmin($types === ['adjust', 'export', 'manual', 'purchase'], 'Every stock change is in the stock history');
    try { patchAdmin('purchase_orders', $po['id'], ['total'=>1]); throw new RuntimeException('Direct edit must fail'); }
    catch (HttpError $e) { checkAdmin($e->getCode() === 403, 'Purchase orders cannot be edited directly'); }
    try { endpoint('suppliers', 'DELETE', query:['id'=>'eq.' . $sup['id']]); throw new RuntimeException('Supplier delete must fail'); }
    catch (HttpError $e) { checkAdmin(str_contains($e->getMessage(), 'đơn nhập'), 'Supplier with purchases cannot be deleted'); }
    foreach ($moves() as $m) $created[] = ['stock_moves', $m['id']];
    // Hóa đơn bán hàng: cấp số 1 lần
    $invOrder = fixture('orders', ['id'=>$prefix . '-inv', 'code'=>$prefix . 'INV', 'phone'=>'0900000093', 'status'=>'done', 'payment'=>'bank', 'payment_status'=>'paid', 'total'=>1100000]);
    $first = rpcEndpoint('issue_invoice', ['p_id'=>$invOrder['id']]);
    $again = rpcEndpoint('issue_invoice', ['p_id'=>$invOrder['id']]);
    checkAdmin(preg_match('/^\d{7}$/', $first['invoice_no']) === 1 && $again['invoice_no'] === $first['invoice_no'], 'Invoice number is issued once');
    $lead = fixture('leads', ['id'=>$prefix . '-lead', 'status'=>'new', 'assigned_to'=>null, 'notes'=>[]]);
    $otherLead = fixture('leads', ['id'=>$prefix . '-other-lead', 'status'=>'new', 'assigned_to'=>null]);
    $assigned = patchAdmin('leads', $lead['id'], ['assigned_to'=>$admin['id'], 'staff_note'=>'Call back']);
    checkAdmin($assigned['assigned_to'] === $admin['id'], 'Admin assigns leads to a salesperson');
    $review = fixture('reviews', ['id'=>$prefix . '-review', 'status'=>'pending', 'rating'=>5, 'text'=>'QA']);
    checkAdmin(patchAdmin('reviews', $review['id'], ['status'=>'approved'])['status'] === 'approved', 'Admin approves a review');
    endpoint('reviews', 'DELETE', query:['id'=>'eq.' . $review['id']]);
    checkAdmin(endpoint('reviews', query:['id'=>'eq.' . $review['id']]) === [], 'Admin deletes a review');
    $notification = fixture('notifications', ['id'=>$prefix . '-notification', 'event'=>'maintenance_reminder', 'status'=>'pending', 'results'=>[]]);
    checkAdmin(rpcEndpoint('maintenance_skip', ['p_id'=>$notification['id'], 'p_skip'=>true])['status'] === 'skipped', 'Maintenance reminder can be skipped');
    checkAdmin(rpcEndpoint('maintenance_skip', ['p_id'=>$notification['id'], 'p_skip'=>false])['status'] === 'pending', 'Maintenance reminder can be reenabled');
    checkAdmin(patchAdmin('notifications', $notification['id'], ['results'=>['booked'=>true]])['results']['booked'], 'Maintenance booking marker persists');

    // Exercise the same insert/update/read/delete contract used by all editors.
    foreach (['products','categories','brands','coupons','banners','posts','projects','faqs','stores','services','policies','settings'] as $table) {
        $sample = allRecords($table)[0] ?? null;
        if (!$sample) throw new RuntimeException("Seed missing: $table");
        $key = pk($table);
        $sample[$key] = $prefix . '-' . $table;
        if ($table === 'products') { $sample['sku'] = $prefix; $sample['slug'] = $prefix; }
        $created[] = [$table, $sample[$key]];
        $inserted = endpoint($table, 'POST', $sample)[0];
        $updated = patchAdmin($table, $inserted[$key], ['qa_note'=>'updated']);
        $read = endpoint($table, query:[$key=>'eq.' . $inserted[$key]]);
        checkAdmin($updated['qa_note'] === 'updated' && count($read) === 1 && $read[0]['qa_note'] === 'updated', "$table CRUD persists edits");
        endpoint($table, 'DELETE', query:[$key=>'eq.' . $inserted[$key]]);
        checkAdmin(endpoint($table, query:[$key=>'eq.' . $inserted[$key]]) === [], "$table CRUD deletes the test record");
    }
    foreach (['staff','sales','accountant'] as $role) {
        put('profiles', array_merge($admin, ['role'=>$role]));
        if ($role === 'sales') {
            checkAdmin(patchAdmin('leads', $lead['id'], ['status'=>'contacted', 'staff_note'=>'Called', 'assigned_to'=>null])['assigned_to'] === $admin['id'], 'Sales updates assigned lead without reassigning it');
            checkAdmin(endpoint('leads', query:['id'=>'eq.' . $otherLead['id']]) === [], 'Sales cannot read unassigned leads');
            try {
                patchAdmin('leads', $otherLead['id'], ['status'=>'won']);
                throw new RuntimeException('Sales must not update unassigned leads');
            } catch (HttpError $e) { checkAdmin($e->getCode() === 403, 'Sales cannot edit another lead'); }
        }
        if ($role === 'accountant') {
            checkAdmin(patchAdmin('orders', $order['id'], ['payment_status'=>'partial', 'status'=>'done'])["status"] === 'pending', 'Accountant can save partial payment while order status stays protected');
        }
        try {
            patchAdmin('settings', 'store', ['value'=>[]]);
            throw new RuntimeException("$role must not change settings");
        } catch (HttpError $e) { checkAdmin($e->getCode() === 403, "$role cannot change admin settings"); }
    }
    echo "Admin MySQL: $checks checks passed.\n";
} finally {
    foreach (array_reverse($created) as [$table, $id]) sql('DELETE FROM records WHERE resource=? AND record_id=?', [$table, (string)$id]);
}
