<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../../server/bootstrap.php';
require __DIR__ . '/../../server/data.php';
require __DIR__ . '/../../server/shop.php';
$seed = json_decode(file_get_contents(__DIR__ . '/../../server/seed-test.json'), true, 512, JSON_THROW_ON_ERROR);
$checked = 0;
foreach ($seed as $table => $rows) {
    foreach ($rows as $expected) {
        $row = record($table, $expected[pk($table)]);
        if (!$row) throw new RuntimeException("Thiếu bản ghi {$table}");
        if ($table === 'products') validateRow($table, $row);
        if ($table === 'orders') {
            $joined = projectRow($row, 'orders', '*,order_items(*),order_status_history(*),payments(*)', ['role'=>'admin']);
            if (!$joined['order_items'] || !$joined['order_status_history'] || !$joined['payments']) throw new RuntimeException('Thiếu dữ liệu liên kết đơn hàng');
            $subtotal = array_sum(array_map(fn($item) => $item['price'] * $item['qty'], $joined['order_items']));
            if ($subtotal != $row['subtotal'] || $row['total'] != $subtotal + $row['shipping_fee'] + $row['install_fee'] - $row['discount']) throw new RuntimeException('Tổng tiền không khớp');
        }
        $checked++;
    }
}
$customers = array_filter(crmSummary(), fn($row) => str_starts_with((string)$row['id'], 'test-customer-'));
if (count($customers) !== 15 || array_sum(array_column($customers, 'paid_count')) < 5) throw new RuntimeException('Tổng hợp CRM không khớp');
echo "PASS: {$checked} bản ghi trên MySQL; quan hệ đơn hàng, tổng tiền, sản phẩm và tổng hợp CRM hợp lệ.\n";
