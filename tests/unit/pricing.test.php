<?php
// Luật giá phía máy chủ (server/shop.php) phải khớp bộ ca chung tests/fixtures/pricing.json.
// Chạy: php tests/unit/pricing.test.php   (không cần MySQL: danh mục, đơn cũ, khách hàng lấy từ bộ ca)
declare(strict_types=1);
require __DIR__ . '/../../server/shop.php';

$fixture = json_decode(file_get_contents(__DIR__ . '/../fixtures/pricing.json'), true);
$categories = array_column($fixture['categories'], null, 'id');
$pass = 0; $fail = 0;
foreach ($fixture['cases'] as $c) {
    $errors = [];
    $lines = $c['lines'];
    $result = null;
    if (isset($c['coupon'])) {
        $result = couponResult($c['coupon'], $lines, phoneKey($c['phone'] ?? ''), [
            'category' => fn(string $id) => $categories[$id] ?? null,
            'orders' => fn() => $c['orders'] ?? [],
            'customers' => fn() => $c['customers'] ?? [],
        ]);
        $got = ['ok' => $result['ok'], 'discount' => $result['discount'], 'free_ship' => $result['free_ship']] + ($result['ok'] ? [] : ['msg' => $result['msg']]);
        $want = $c['expect']['coupon'];
        ksort($got); ksort($want);
        if ($got !== $want) $errors[] = 'mã giảm giá: ' . json_encode($got, JSON_UNESCAPED_UNICODE) . ' ≠ ' . json_encode($want, JSON_UNESCAPED_UNICODE);
    }
    if (isset($c['expect']['quote'])) {
        $quote = orderQuote($lines, $c['config'] ?? $fixture['config'], $c['method'] ?? 'delivery', ($result['ok'] ?? false) ? $result : null);
        $want = $c['expect']['quote'];
        ksort($quote); ksort($want);
        if ($quote !== $want) $errors[] = 'tổng tiền: ' . json_encode($quote) . ' ≠ ' . json_encode($want);
    }
    if ($errors) { $fail++; echo "✗ {$c['name']}\n  " . implode("\n  ", $errors) . "\n"; } else { $pass++; echo "✓ {$c['name']}\n"; }
}
echo "\n# pass $pass\n# fail $fail\n";
exit($fail ? 1 : 0);
