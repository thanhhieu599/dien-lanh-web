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
