<?php
// Test case mua hàng / đặt hàng / doanh thu trên MySQL thật (chạy trong container web):
//   docker compose exec -T web php tests/server/commerce.test.php
// Mỗi ca kiểm tra 1 cách có thể làm sai lệch tiền hoặc tồn kho. Dữ liệu thử được xóa khi xong.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
ob_start();
require __DIR__ . '/../../server/bootstrap.php';
require __DIR__ . '/../../server/data.php';
require __DIR__ . '/../../server/shop.php';

$p = 'qa-buy-' . bin2hex(random_bytes(4));
$checks = 0; $made = [];
function ok(bool $cond, string $label): void { global $checks; if (!$cond) throw new RuntimeException("FAIL $label"); $checks++; echo "PASS $label\n"; }
function keep(string $table, array $row): array { global $made; $row = put($table, $row, true); $made[] = [$table, $row[pk($table)]]; return $row; }
function guest(): void { $_SESSION = []; $_SERVER['REMOTE_ADDR'] = '10.' . random_int(0, 255) . '.' . random_int(0, 255) . '.' . random_int(1, 254); }
function stock(string $id): int { return (int)record('products', $id)['stock']; }
function used(string $code): int { return (int)(record('coupons', $code)['used_count'] ?? 0); }
// Đặt hàng như khách trên website; trả về đơn hoặc ['error' => thông báo]
function buy(array $items, array $opt = []): array {
    global $made;
    guest();
    try {
        $o = placeOrder([
            'p_items' => $items,
            'p_customer' => ['name' => $opt['name'] ?? 'Khách QA', 'phone' => $opt['phone'] ?? '0900111222'],
            'p_shipping' => $opt['shipping'] ?? ['method' => 'delivery', 'address' => '1 QA', 'province' => 'TP.HCM'],
            'p_payment' => $opt['payment'] ?? 'cod',
            'p_coupon' => $opt['coupon'] ?? null,
        ] + ($opt['extra'] ?? []));
        $made[] = ['orders', $o['id']];
        return $o;
    } catch (HttpError $e) { return ['error' => $e->getMessage(), 'status' => $e->getCode()]; }
}
function asStaff(array $user): void { $_SESSION = ['user_id' => $user['id'], 'expires_at' => time() + 3600]; }

try {
    $cfg = record('settings', 'store')['value'] ?? [];
    $installFee = (int)($cfg['installFee'] ?? 300000);
    $brand = allRecords('brands')[0]['id'];
    $other = array_values(array_filter(allRecords('categories'), fn($c) => $c['id'] !== 'may-lanh'))[0]['id'];
    $ac = keep('products', ['id' => "$p-ac", 'sku' => "$p-ac", 'slug' => "$p-ac", 'name' => '[QA] Máy lạnh', 'cat' => 'may-lanh', 'brand' => $brand, 'price' => 10000000, 'stock' => 5, 'active' => true, 'sold' => 0]);
    $acc = keep('products', ['id' => "$p-acc", 'sku' => "$p-acc", 'slug' => "$p-acc", 'name' => '[QA] Phụ kiện', 'cat' => $other, 'brand' => $brand, 'price' => 500000, 'stock' => 3, 'active' => true, 'sold' => 0]);
    $off = keep('products', ['id' => "$p-off", 'sku' => "$p-off", 'slug' => "$p-off", 'name' => '[QA] Ngừng bán', 'cat' => $other, 'brand' => $brand, 'price' => 100000, 'stock' => 10, 'active' => false]);
    $C = strtoupper(str_replace('-', '', $p));
    foreach ([
        ["{$C}P10", ['type' => 'percent', 'value' => 10, 'max' => 300000, 'min' => 1000000]],
        ["{$C}FIX", ['type' => 'fixed', 'value' => 2000000, 'min' => 0]],
        ["{$C}LIM", ['type' => 'fixed', 'value' => 100000, 'min' => 0, 'usage_limit' => 1]],
        ["{$C}ONE", ['type' => 'fixed', 'value' => 50000, 'min' => 0, 'once_per_customer' => true]],
        ["{$C}EXP", ['type' => 'fixed', 'value' => 50000, 'min' => 0, 'ends_at' => '2020-01-01T00:00:00Z']],
        ["{$C}OFF", ['type' => 'fixed', 'value' => 50000, 'min' => 0, 'active' => false]],
    ] as [$code, $rule]) keep('coupons', array_merge(['code' => $code, 'active' => true, 'used_count' => 0, 'description' => 'QA'], $rule));

    echo "--- A. Giá do máy chủ tính, khách không sửa được\n";
    $o = buy([['id' => $ac['id'], 'qty' => 1, 'price' => 1]], ['extra' => ['p_total' => 1, 'p_subtotal' => 1, 'p_discount' => 9999999, 'p_shipping_fee' => -500000]]);
    ok(!isset($o['error']) && $o['subtotal'] === 10000000 && $o['total'] === 10000000, 'A1 Giá / tổng / chiết khấu / phí ship gửi lên bị bỏ qua, tính theo giá database');
    ok($o['shippingFee'] === 0 && $o['discount'] === 0, 'A2 Phí giao hàng = 0, không chiết khấu khi không có mã');
    ok(stock($ac['id']) === 4, 'A3 Đặt 1 cái: tồn kho giảm đúng 1');
    $before = stock($ac['id']);
    foreach ([0, -1, 1.5, '2', 100, null] as $bad) ok(isset(buy([['id' => $ac['id'], 'qty' => $bad]])['error']), 'A4 Số lượng không hợp lệ bị chặn: ' . json_encode($bad));
    ok(isset(buy([['id' => 'khong-ton-tai', 'qty' => 1]])['error']) && isset(buy([])['error']), 'A5 Sản phẩm không tồn tại / giỏ rỗng bị chặn');
    ok(isset(buy([['id' => $off['id'], 'qty' => 1]])['error']), 'A6 Sản phẩm ngừng bán không đặt được');
    ok(isset(buy([['id' => $ac['id'], 'qty' => 5]])['error']), 'A7 Đặt vượt tồn kho bị chặn');
    ok(isset(buy([['id' => $ac['id'], 'qty' => 2], ['id' => $ac['id'], 'qty' => 3]])['error']), 'A8 Tách 2 dòng cùng sản phẩm để vượt tồn vẫn bị chặn');
    ok(stock($ac['id']) === $before, 'A9 Các lần đặt lỗi không làm thay đổi tồn kho');
    $o = buy([['id' => $ac['id'], 'qty' => 2, 'install' => true], ['id' => $acc['id'], 'qty' => 1, 'install' => true]]);
    ok($o['install'] === 2 * $installFee && $o['total'] === 20000000 + 500000 + 2 * $installFee, 'A10 Phí lắp đặt chỉ tính cho máy lạnh, nhân đúng số lượng');
    $sum = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $o['items']));
    ok($sum === $o['subtotal'], 'A11 Tạm tính = tổng (đơn giá × số lượng) các dòng đã lưu');
    $o = buy([['id' => $acc['id'], 'qty' => 1]], ['shipping' => ['method' => 'pickup', 'store' => allRecords('stores')[0]['name']]]);
    ok(!isset($o['error']) && $o['shippingFee'] === 0, 'A12 Nhận tại cửa hàng: phí 0');
    foreach ([
        ['payment' => 'momo'], ['payment' => 'card'], ['shipping' => ['method' => 'drone', 'address' => 'x']], ['shipping' => ['method' => 'delivery']],
        ['shipping' => ['method' => 'pickup', 'store' => 'Không có']], ['phone' => '123'], ['name' => ''],
    ] as $bad) ok(isset(buy([['id' => $acc['id'], 'qty' => 1]], $bad)['error']), 'A13 Thông tin đặt hàng sai bị chặn: ' . json_encode($bad, JSON_UNESCAPED_UNICODE));

    echo "--- B. Mã giảm giá không bị lạm dụng\n";
    // Trả tồn cho sản phẩm thử
    foreach ([$ac['id'] => 20, $acc['id'] => 20] as $id => $n) { $row = record('products', $id); stockMove($row, $n - (int)$row['stock'], 'manual', '', 'QA bổ sung tồn'); }
    $o = buy([['id' => $ac['id'], 'qty' => 1]], ['coupon' => strtolower(" {$C}P10 ")]);
    ok(!isset($o['error']) && $o['discount'] === 300000 && $o['total'] === 9700000, 'B1 Mã % có trần: giảm 10% tối đa 300.000₫; nhập chữ thường / có khoảng trắng vẫn nhận');
    ok(used("{$C}P10") === 1, 'B2 Lượt dùng mã tăng 1');
    $s = stock($acc['id']);
    ok(isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}P10"])['error']) && stock($acc['id']) === $s && used("{$C}P10") === 1, 'B3 Chưa đủ giá trị tối thiểu: bị chặn, không trừ kho, không tăng lượt');
    $o = buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}FIX"]);
    ok($o['discount'] === 500000 && $o['total'] === 0, 'B4 Mã giảm cố định lớn hơn giá trị hàng: chỉ giảm tối đa bằng tiền hàng (không âm tiền)');
    ok(!isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}LIM"])['error']), 'B5 Mã giới hạn 1 lượt: lần 1 được');
    ok(isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}LIM", 'phone' => '0900111333'])['error']), 'B6 Mã giới hạn 1 lượt: lần 2 bị chặn');
    $first = buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}ONE", 'phone' => '0911000001']);
    ok(!isset($first['error']), 'B7 Mã mỗi khách 1 lần: lần đầu được');
    ok(isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}ONE", 'phone' => '+84911000001'])['error']), 'B8 Cùng khách (đổi cách viết số +84) dùng lại bị chặn');
    ok(!isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}ONE", 'phone' => '0911000002'])['error']), 'B9 Khách khác vẫn dùng được');
    ok(isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}EXP"])['error']) && isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}OFF"])['error']) && isset(buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => 'KHONGCOMA'])['error']), 'B10 Mã hết hạn / đã tắt / không tồn tại bị chặn');

    echo "--- C. Khách hủy đơn: hoàn kho, hoàn lượt mã, không hoàn 2 lần\n";
    $s = stock($ac['id']); $u = used("{$C}P10");
    $o = buy([['id' => $ac['id'], 'qty' => 2]], ['coupon' => "{$C}P10", 'phone' => '0922000003']);
    ok(stock($ac['id']) === $s - 2 && used("{$C}P10") === $u + 1, 'C1 Đặt 2 cái kèm mã: trừ kho 2, tăng 1 lượt mã');
    guest();
    try { rpcEndpoint('track_order', ['p_code' => $o['code'], 'p_phone' => '0999999999']); ok(false, 'C2'); } catch (HttpError $e) { ok($e->getCode() === 404, 'C2 Tra cứu sai số điện thoại: không xem được đơn người khác'); }
    $c = rpcEndpoint('cancel_order', ['p_code' => $o['code'], 'p_phone' => '0922000003']);
    ok($c['status'] === 'cancelled' && stock($ac['id']) === $s && used("{$C}P10") === $u, 'C3 Khách hủy: hoàn đủ kho và lượt mã');
    try { rpcEndpoint('cancel_order', ['p_code' => $o['code'], 'p_phone' => '0922000003']); ok(false, 'C4'); } catch (HttpError $e) { ok(stock($ac['id']) === $s && used("{$C}P10") === $u, 'C4 Hủy lần 2 bị chặn, không hoàn kho 2 lần'); }
    $again = buy([['id' => $acc['id'], 'qty' => 1]], ['coupon' => "{$C}ONE", 'phone' => '0911000001']);
    ok(isset($again['error']), 'C5 Mã mỗi khách 1 lần: đơn cũ còn hiệu lực thì vẫn chặn');

    echo "--- D. Nhân viên xử lý đơn: đúng quy trình, đúng tiền\n";
    // Tài khoản quản trị tạm cho bài thử (xóa khi xong)
    $admin = keep('profiles', ['id' => "$p-admin", 'name' => 'QA Quản trị', 'phone' => '0900999888', 'role' => 'admin']);
    ok(record('profiles', $admin['id'])['role'] === 'admin', 'D0 Có tài khoản quản trị để thử');
    $cod = buy([['id' => $ac['id'], 'qty' => 1]], ['phone' => '0933000004']);
    $bank = buy([['id' => $ac['id'], 'qty' => 1]], ['phone' => '0933000005', 'payment' => 'bank', 'coupon' => "{$C}P10"]);
    asStaff($admin);
    $patch = fn($id, $body) => (function() use ($id, $body) { $_GET = ['id' => 'eq.' . $id]; return dataEndpoint('orders', 'PATCH', $body)[0]; })();
    try { $patch($cod['id'], ['status' => 'done']); ok(false, 'D1'); } catch (HttpError $e) { ok(true, 'D1 Không nhảy cóc Chờ xác nhận → Hoàn thành'); }
    foreach (['confirmed', 'shipping', 'installing', 'done'] as $st) $row = $patch($cod['id'], ['status' => $st]);
    ok($row['status'] === 'done' && $row['payment_status'] === 'paid' && !empty($row['paid_at']), 'D2 Đơn COD hoàn thành: tự ghi đã thu tiền + thời điểm thu');
    $_SESSION = []; guest();
    try { rpcEndpoint('cancel_order', ['p_code' => $cod['code'], 'p_phone' => '0933000004']); ok(false, 'D2b'); } catch (HttpError $e) { ok(record('orders', $cod['id'])['status'] === 'done', 'D2b Khách không tự hủy được đơn đã thanh toán / đã giao'); }
    asStaff($admin);
    try { $patch($cod['id'], ['status' => 'cancelled']); ok(false, 'D3'); } catch (HttpError $e) { ok(record('orders', $cod['id'])['status'] === 'done', 'D3 Đơn đã hoàn thành không hủy được (tránh hoàn kho sai)'); }
    $s = stock($ac['id']); $u = used("{$C}P10");
    $patch($bank['id'], ['status' => 'confirmed']);
    $row = $patch($bank['id'], ['status' => 'cancelled']);
    ok($row['status'] === 'cancelled' && stock($ac['id']) === $s + 1 && used("{$C}P10") === $u - 1, 'D4 Nhân viên hủy đơn chuyển khoản: hoàn kho + lượt mã');
    try { $patch($bank['id'], ['status' => 'confirmed']); ok(false, 'D5'); } catch (HttpError $e) { ok(stock($ac['id']) === $s + 1, 'D5 Đơn đã hủy không mở lại được (tránh trừ kho / hoàn kho lặp)'); }
    try { $patch($cod['id'], ['payment_status' => 'tang-free']); ok(false, 'D6'); } catch (HttpError $e) { ok(true, 'D6 Trạng thái thanh toán lạ bị chặn'); }
    $_SESSION = [];
    try { $patch($cod['id'], ['payment_status' => 'paid']); ok(false, 'D7'); } catch (HttpError $e) { ok($e->getCode() === 401, 'D7 Khách / người lạ không sửa được đơn và trạng thái thanh toán'); }
    $_GET = []; ok(dataEndpoint('orders', 'GET', []) === [] && dataEndpoint('crm_customers', 'GET', []) === [], 'D8 Người lạ không đọc được đơn hàng / khách hàng');

    echo "--- F. Nhân viên tạo đơn trong quản trị\n";
    $create = function(array $args) use (&$made) {
        try { $o = rpcEndpoint('admin_create_order', $args + ['p_customer' => ['name' => 'Khách tạo tay', 'phone' => '0944000001'], 'p_shipping' => ['method' => 'pickup'], 'p_payment' => 'cod']); $made[] = ['orders', $o['id']]; return $o; }
        catch (HttpError $e) { return ['error' => $e->getMessage(), 'status' => $e->getCode()]; }
    };
    $line = fn($extra = []) => array_merge(['product_id' => $acc['id'], 'qty' => 1, 'price' => 450000], $extra);
    $_SESSION = []; guest();
    ok(($create(['p_items' => [$line()]])['status'] ?? 0) === 401, 'F1 Người lạ không tạo được đơn trong quản trị');
    $cust = keep('profiles', ['id' => "$p-cus", 'name' => 'QA Khách', 'phone' => '0900999777', 'role' => 'customer']);
    asStaff($cust);
    ok(($create(['p_items' => [$line()]])['status'] ?? 0) === 403, 'F2 Khách hàng không tạo được đơn trong quản trị');
    asStaff($admin);
    $s = stock($acc['id']);
    // 2 x 450.000 (giá sửa tay) + dòng tự nhập 1 x 200.000 + lắp 100.000 + ship 50.000 - CK 100.000 = 1.150.000; VAT 8% cộng thêm = 92.000
    $o = $create(['p_items' => [$line(['qty' => 2, 'name' => 'Phụ kiện (giá dự án)']), ['product_id' => null, 'name' => 'Ống đồng ngoài hệ thống', 'unit' => 'Mét', 'qty' => 1, 'price' => 200000]],
        'p_install_fee' => 100000, 'p_shipping_fee' => 50000, 'p_discount' => 100000, 'p_vat_rate' => 8, 'p_vat_included' => false,
        'p_payment' => 'bank', 'p_payment_status' => 'paid', 'p_status' => 'confirmed', 'p_staff_note' => 'Khách dự án', 'p_invoice' => ['company' => 'Cty QA', 'taxCode' => '0312345678']]);
    ok(!isset($o['error']) && $o['subtotal'] === 1100000 && $o['vat_amount'] === 92000 && $o['total'] === 1242000, 'F3 Giá sửa tay + dòng tự nhập + phí + chiết khấu + VAT 8% cộng thêm: tổng đúng ' . json_encode($o['error'] ?? $o['total'] ?? null));
    ok(stock($acc['id']) === $s - 2, 'F4 Sản phẩm trong hệ thống bị trừ kho đúng số lượng; dòng tự nhập không trừ kho');
    $its = array_values(array_filter(allRecords('order_items'), fn($i) => $i['order_id'] === $o['id']));
    ok(count($its) === 2 && in_array(null, array_column($its, 'product_id'), true) && in_array('Phụ kiện (giá dự án)', array_column($its, 'name'), true), 'F5 Lưu đủ 2 dòng: tên sửa tay, dòng tự nhập không gắn sản phẩm');
    ok($o['status'] === 'confirmed' && $o['payment_status'] === 'paid' && !empty($o['paid_at']) && $o['source'] === 'admin' && $o['invoice']['taxCode'] === '0312345678', 'F6 Trạng thái, đã thanh toán (có thời điểm thu), nguồn quản trị, thông tin hóa đơn được lưu');
    ok((record('crm_customers', 'phone:0944000001')['name'] ?? '') !== '', 'F7 Khách mới tự vào danh sách khách hàng (CRM)');
    $moves = array_filter(allRecords('stock_moves'), fn($m) => $m['ref'] === $o['code']);
    ok(count($moves) === 1 && array_values($moves)[0]['change'] === -2, 'F8 Lịch sử kho ghi đúng chứng từ bán hàng của đơn');
    $inc = $create(['p_items' => [$line(['qty' => 1, 'price' => 1080000])], 'p_vat_rate' => 8, 'p_vat_included' => true]);
    ok($inc['total'] === 1080000 && $inc['vat_amount'] === 80000, 'F9 Giá đã gồm VAT 8%: tổng giữ nguyên, tách thuế đúng');
    $none = $create(['p_items' => [$line(['qty' => 1, 'price' => 300000])], 'p_vat_rate' => -1, 'p_vat_included' => false]);
    ok($none['total'] === 300000 && $none['vat_amount'] === 0, 'F10 Không chịu thuế: không cộng VAT');
    ok(isset($create(['p_items' => [$line(['qty' => 999])]])['error']), 'F11 Vượt tồn kho: chặn');
    ok(isset($create(['p_items' => [$line()], 'p_discount' => 99999999])['error']), 'F12 Chiết khấu vượt tổng tiền: chặn');
    ok(isset($create(['p_items' => [$line(['price' => -1])]])['error']) && isset($create(['p_items' => [$line(['qty' => 0])]])['error']), 'F13 Đơn giá âm / số lượng 0: chặn');
    ok(isset($create(['p_items' => [$line()], 'p_vat_rate' => 7])['error']), 'F14 Thuế suất lạ (7%): chặn');
    ok(isset($create(['p_items' => [['product_id' => null, 'qty' => 1, 'price' => 1000]]])['error']), 'F15 Dòng tự nhập thiếu tên: chặn');
    ok(isset($create(['p_items' => [$line()], 'p_customer' => ['name' => 'X', 'phone' => '123']])['error']), 'F16 Số điện thoại khách sai: chặn');
    $s2 = stock($acc['id']);
    ok(isset($create(['p_items' => [$line(['qty' => 1]), ['product_id' => 'khong-co', 'qty' => 1, 'price' => 1]]])['error']) && stock($acc['id']) === $s2, 'F17 Một dòng lỗi: cả đơn không tạo, kho không bị trừ');
    $row = $patch($o['id'], ['status' => 'cancelled']);
    ok($row['status'] === 'cancelled' && stock($acc['id']) === $s2 + 2, 'F18 Hủy đơn tạo tay: hoàn kho đúng (bỏ qua dòng tự nhập)');
    $_SESSION = [];

    echo "--- E. Đối soát toàn bộ database\n";
    $items = [];
    foreach (allRecords('order_items') as $i) $items[$i['order_id']][] = $i;
    $bad = [];
    foreach (allRecords('orders') as $o) {
        $sub = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $items[$o['id']] ?? []));
        if (!isset($items[$o['id']])) continue; // đơn tạo tay trong test cũ, không có dòng hàng
        if ($sub != $o['subtotal'] || $o['total'] != $o['subtotal'] + $o['install_fee'] + $o['shipping_fee'] - $o['discount'] + (($o['vat_included'] ?? true) === false ? ($o['vat_amount'] ?? 0) : 0) || $o['discount'] > $o['subtotal'] + $o['install_fee'] + $o['shipping_fee'] || $o['total'] < 0) $bad[] = $o['code'];
    }
    ok(!$bad, 'E1 Mọi đơn: tạm tính = Σ dòng hàng; tổng = tạm tính + lắp đặt + ship - giảm giá; không âm (' . count($items) . ' đơn)' . ($bad ? ' LỖI: ' . implode(',', $bad) : ''));
    ok(!array_filter(allRecords('products'), fn($x) => ($x['stock'] ?? 0) < 0), 'E2 Không sản phẩm nào tồn kho âm');
    $last = [];
    foreach (allRecords('stock_moves') as $m) if (!isset($last[$m['product_id']]) || $m['id'] > $last[$m['product_id']]['id']) $last[$m['product_id']] = $m;
    $drift = [];
    foreach ($last as $pid => $m) { $pr = record('products', $pid); if ($pr && (int)$pr['stock'] !== (int)$m['after']) $drift[] = $pid; }
    ok(!array_intersect($drift, [$ac['id'], $acc['id']]), 'E3 Tồn kho sản phẩm = số "sau" của lần thay đổi cuối trong lịch sử kho');
    $moves = array_filter(allRecords('stock_moves'), fn($m) => $m['product_id'] === $ac['id']);
    $sales = array_sum(array_map(fn($m) => $m['change'], array_filter($moves, fn($m) => in_array($m['type'], ['sale', 'cancel'], true))));
    $sold = 0;
    foreach (allRecords('orders') as $o) if ($o['status'] !== 'cancelled') foreach ($items[$o['id']] ?? [] as $i) if ($i['product_id'] === $ac['id']) $sold += $i['qty'];
    ok(-$sales === $sold, 'E4 Lịch sử kho (bán - hủy) khớp số lượng trên các đơn còn hiệu lực');
    echo "Commerce MySQL: $checks checks passed.\n";
} finally {
    $_SESSION = [];
    $orderIds = array_column(array_filter($made, fn($m) => $m[0] === 'orders'), 1);
    foreach (allRecords('order_items') as $i) if (in_array($i['order_id'], $orderIds, true)) $made[] = ['order_items', $i['id']];
    foreach (allRecords('order_status_history') as $h) if (in_array($h['order_id'], $orderIds, true)) $made[] = ['order_status_history', $h['id']];
    foreach (allRecords('stock_moves') as $m) if (str_starts_with((string)$m['product_id'], $p)) $made[] = ['stock_moves', $m['id']];
    foreach (array_reverse($made) as [$t, $id]) sql('DELETE FROM records WHERE resource=? AND record_id=?', [$t, (string)$id]);
}
