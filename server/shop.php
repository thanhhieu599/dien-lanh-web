<?php
declare(strict_types=1);
require_once __DIR__ . '/inventory.php';
require_once __DIR__ . '/users.php';

// Nhóm khách hàng của 1 hồ sơ CRM: nhóm đã gán, nếu chưa gán thì khách có nhãn VIP thuộc nhóm VIP, còn lại là Bán lẻ.
function customerGroupOf(array $c): string {
    if (!empty($c['group']) && is_string($c['group'])) return $c['group'];
    return in_array('VIP', $c['tags'] ?? [], true) ? 'vip' : 'ban-le';
}

function phoneKey(string $phone): string {
    return preg_replace('/^\+?84/', '0', preg_replace('/[^0-9+]/', '', $phone));
}
function orderPublic(array $order): array {
    $items = array_values(array_filter(allRecords('order_items'), fn($r) => $r['order_id'] === $order['id']));
    $history = array_values(array_filter(allRecords('order_status_history'), fn($r) => $r['order_id'] === $order['id']));
    return [
        'id' => $order['id'], 'code' => $order['code'], 'createdAt' => $order['created_at'],
        'status' => $order['status'], 'customer' => $order['customer'], 'shipping' => $order['shipping'],
        'payment' => $order['payment'], 'paymentStatus' => $order['payment_status'],
        'invoice' => $order['invoice'] ?? null, 'note' => $order['note'] ?? '',
        'items' => array_map(fn($i) => array_merge($i, ['id' => $i['product_id']]), $items),
        'subtotal' => $order['subtotal'], 'install' => $order['install_fee'], 'shippingFee' => $order['shipping_fee'],
        'discount' => $order['discount'], 'total' => $order['total'], 'coupon' => $order['coupon'],
        'userId' => $order['user_id'], 'history' => $history,
    ];
}
function orderByCode(string $code, string $phone, bool $lock = false): array {
    $row = sql("SELECT record_id FROM records WHERE resource='orders' AND phone=? AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.code'))=?", [phoneKey($phone), strtoupper(trim($code))])->fetchColumn();
    if ($row === false) fail('Không tìm thấy đơn hàng', 404);
    return record('orders', $row, $lock) ?? throw new HttpError('Không tìm thấy đơn hàng', 404);
}
function moneyVnd($n): string { return number_format((float)$n, 0, ',', '.') . '₫'; }
// Luật mã giảm giá: PHẢI khớp DT.promotions.evaluate (frontend/assets/js/core/promotions.js); kiểm bằng tests/fixtures/pricing.json.
// $data cho phép truyền nguồn dữ liệu (test không cần MySQL); mặc định đọc từ database.
function couponResult(?array $coupon, array $lines, string $phone, array $data = []): array {
    $categoryOf = $data['category'] ?? fn(string $id) => record('categories', $id);
    $ordersOf = $data['orders'] ?? fn() => allRecords('orders');
    $customersOf = $data['customers'] ?? fn() => allRecords('crm_customers');
    $bad = fn($msg) => ['ok' => false, 'msg' => $msg, 'discount' => 0, 'free_ship' => false];
    if (!$coupon || !($coupon['active'] ?? true)) return $bad('Mã giảm giá không tồn tại hoặc đã tắt');
    foreach (['starts_at','ends_at'] as $field) {
        if (!empty($coupon[$field]) && ($field === 'starts_at' ? time() < strtotime($coupon[$field]) : time() >= strtotime($coupon[$field]))) return $bad('Mã giảm giá chưa có hiệu lực hoặc đã hết hạn');
    }
    if (isset($coupon['usage_limit']) && ($coupon['used_count'] ?? 0) >= $coupon['usage_limit']) return $bad('Mã giảm giá đã hết lượt sử dụng');
    $subtotal = 0; $base = 0; $qty = 0;
    foreach ($lines as $line) {
        $p = $line['product']; $amount = $p['price'] * $line['qty']; $subtotal += $amount;
        if (($coupon['combine_discounts'] ?? true) === false && (($p['old_price'] ?? 0) > $p['price'] || ($p['flash_sale'] ?? false))) continue;
        if (($coupon['scope'] ?? '') === 'products' && !in_array((string)$p['id'], array_map('strval', $coupon['product_ids'] ?? []), true)) continue;
        if (($coupon['scope'] ?? '') === 'categories') {
            $eligible = false;
            foreach ($coupon['category_ids'] ?? [] as $cat) {
               $category = $categoryOf((string)$cat) ?? [];
                $excluded = array_map('strval', $category['excluded_product_ids'] ?? []);
                if (!in_array((string)$p['id'], $excluded, true) && ($p['cat'] === $cat || in_array((string)$p['id'], array_map('strval', $category['product_ids'] ?? []), true))) $eligible = true;
            }
            if (!$eligible) continue;
        }
        $base += $amount; $qty += $line['qty'];
    }
       if (!$qty) return $bad('Giỏ hàng chưa có sản phẩm đủ điều kiện áp dụng mã');
    if ($subtotal < ($coupon['min'] ?? 0)) return $bad('Đơn hàng tối thiểu ' . moneyVnd($coupon['min']) . ' để dùng mã này');
    if (($coupon['condition_type'] ?? '') === 'eligible_min' && $base < ($coupon['condition_value'] ?? 0)) return $bad('Giá trị sản phẩm được khuyến mãi tối thiểu ' . moneyVnd($coupon['condition_value']));
    if (($coupon['condition_type'] ?? '') === 'eligible_qty' && $qty < ($coupon['condition_value'] ?? 0)) return $bad('Cần ít nhất ' . $coupon['condition_value'] . ' sản phẩm đủ điều kiện khuyến mãi');
    if (!empty($coupon['once_per_customer']) || !empty($coupon['customer_groups'])) {
        if (!$phone) return $bad('Vui lòng đăng nhập hoặc nhập số điện thoại thanh toán để áp dụng mã');
        if (!empty($coupon['once_per_customer'])) foreach ($ordersOf() as $o) {
            if ($o['phone'] === $phone && $o['coupon'] === $coupon['code'] && $o['status'] !== 'cancelled') return $bad('Khách hàng đã sử dụng mã này');
        }
        if (!empty($coupon['customer_groups'])) {
            $ok = false;
            foreach ($customersOf() as $c) if (phoneKey($c['phone'] ?? '') === $phone) {
                foreach ($coupon['customer_groups'] as $group) {
                    if ($group === 'vip' && customerGroupOf($c) === 'vip' || str_starts_with($group, 'group:') && customerGroupOf($c) === substr($group, 6) || str_starts_with($group, 'tag:') && in_array(substr($group, 4), $c['tags'] ?? [], true)) $ok = true;
                }
            }
            if (!$ok) return $bad('Mã chỉ dành cho nhóm khách hàng đã được chọn');
        }
    }
    $discount = $coupon['type'] === 'percent' ? (int)floor($base * $coupon['value'] / 100) : ($coupon['type'] === 'fixed' ? min($base, $coupon['value']) : 0);
    if ($coupon['type'] === 'percent' && isset($coupon['max'])) $discount = min($discount, $coupon['max']);
    return ['ok' => true, 'coupon' => $coupon, 'discount' => max(0, min($base, $discount)), 'free_ship' => $coupon['type'] === 'ship'];
}
// Tổng tiền đơn hàng: PHẢI khớp DT.promotions.quote (frontend/assets/js/core/promotions.js); kiểm bằng tests/fixtures/pricing.json.
// $coupon: kết quả couponResult() hợp lệ hoặc null
function orderQuote(array $lines, array $config, string $method, ?array $coupon): array {
    $subtotal = 0; $install = 0;
    foreach ($lines as $line) {
        $p = $line['product']; $subtotal += $p['price'] * $line['qty'];
        if (($line['install'] ?? false) && !($p['free_install'] ?? false) && $p['cat'] === 'may-lanh') $install += ($config['installFee'] ?? 300000) * $line['qty'];
    }
    // Cửa hàng miễn phí giao hàng cho mọi đơn (COD hay chuyển khoản)
    $shipping = 0;
    $discount = $coupon ? $coupon['discount'] : 0;
    return ['subtotal' => $subtotal, 'install' => $install, 'shipping' => $shipping, 'discount' => $discount, 'total' => max(0, $subtotal + $install + $shipping - $discount)];
}

// Công suất & giá: sản phẩm có bảng capacities [{label, price, old_price}] thì khách chọn 1 mức (thuộc tính "Công suất")
// và dòng giỏ hàng tính theo giá của mức đó (mã giảm giá, tổng tiền, đơn hàng đều dùng giá này).
const CAPACITY_OPTION = 'Công suất';
function productCapacities(array $p): array { return is_array($p['capacities'] ?? null) ? array_values($p['capacities']) : []; }
// Kiểm tra + chuẩn hóa khi admin lưu; giá bán chung của sản phẩm = mức rẻ nhất (dùng cho danh sách, sắp xếp, bộ lọc giá)
function normalizeCapacities(array $row): array {
    if (!array_key_exists('capacities', $row) || $row['capacities'] === null || $row['capacities'] === []) { $row['capacities'] = []; return $row; }
    if (!is_array($row['capacities']) || !array_is_list($row['capacities']) || count($row['capacities']) > 20) fail('Bảng công suất không hợp lệ (tối đa 20 mức)');
    $out = []; $seen = [];
    foreach ($row['capacities'] as $i => $c) {
        $n = $i + 1;
        $label = trim((string)(is_array($c) ? ($c['label'] ?? '') : ''));
        if ($label === '' || mb_strlen($label) > 40) fail("Công suất dòng $n: cần nhập tên mức (tối đa 40 ký tự)");
        if (isset($seen[mb_strtolower($label)])) fail("Công suất \"$label\" bị trùng");
        $seen[mb_strtolower($label)] = true;
        $price = $c['price'] ?? null; $old = $c['old_price'] ?? null;
        if (!is_numeric($price) || $price < 0 || floor((float)$price) != $price) fail("Công suất $label: giá bán phải là số nguyên ≥ 0");
        if ($old !== null && $old !== '' && (!is_numeric($old) || $old < 0 || floor((float)$old) != $old)) fail("Công suất $label: giá gốc phải là số nguyên ≥ 0");
        $out[] = ['label' => $label, 'price' => (int)$price, 'old_price' => $old === null || $old === '' || (int)$old === 0 ? null : (int)$old];
    }
    $cheapest = $out[0];
    foreach ($out as $c) if ($c['price'] < $cheapest['price']) $cheapest = $c;
    $row['capacities'] = $out; $row['price'] = $cheapest['price']; $row['old_price'] = $cheapest['old_price'];
    return $row;
}
function cartLines(array $items, bool $lock): array {
    if (!$items || count($items) > 100) fail('Giỏ hàng không hợp lệ');
    usort($items, fn($a, $b) => ($a['id'] ?? 0) <=> ($b['id'] ?? 0));
    $lines = []; $quantities = [];
    foreach ($items as $item) {
        $p = record('products', $item['id'] ?? '', $lock);
        if (!$p || ($p['active'] ?? true) === false || (record('categories', $p['cat'])['active'] ?? true) === false) fail('Sản phẩm đã ngừng kinh doanh');
        $qty = $item['qty'] ?? 0;
        if (!is_int($qty) || $qty < 1 || $qty > 99) fail('Số lượng không hợp lệ');
        $quantities[$p['id']] = ($quantities[$p['id']] ?? 0) + $qty;
        if ($quantities[$p['id']] > $p['stock']) fail('Không đủ tồn kho: ' . $p['name']);
        $options = $item['options'] ?? [];
        if (!is_array($options)) fail('Thuộc tính không hợp lệ');
        if ($lock) {
            foreach ($p['options'] ?? [] as $group => $values) {
                if (trim((string)$group) === CAPACITY_OPTION && productCapacities($p)) continue; // bảng công suất & giá thay cho tùy chọn cùng tên
                $values = is_array($values) ? $values : preg_split('/[,;\n|]/', (string)$values);
                $values = array_values(array_filter(array_map('trim', array_map('strval', $values)), fn($v) => $v !== ''));
                if ($values && !in_array($options[trim($group)] ?? null, $values, true)) fail('Vui lòng chọn đủ thuộc tính sản phẩm');
            }
            if (array_diff(array_keys($options), array_merge(array_keys($p['options'] ?? []), productCapacities($p) ? [CAPACITY_OPTION] : []))) fail('Thuộc tính không hợp lệ');
        }
        if ($caps = productCapacities($p)) {
            $cap = null;
            foreach ($caps as $c) if (($c['label'] ?? null) === ($options[CAPACITY_OPTION] ?? null)) $cap = $c;
            if (!$cap && $lock) fail('Vui lòng chọn công suất: ' . $p['name']);
            if ($cap) { $p['price'] = (int)$cap['price']; $p['old_price'] = $cap['old_price'] ?? null; }
        }
        $lines[] = ['product' => $p, 'qty' => $qty, 'install' => ($item['install'] ?? false) === true, 'options' => $options];
    }
    return $lines;
}
// Quy trình đơn: chỉ đi tiến (được bỏ qua bước giữa, vd Chờ xác nhận → Đang giao), không lùi;
// hủy chỉ khi chưa giao. PHẢI khớp orderNextStatuses (admin/src/pages/sales.tsx)
const ORDER_FLOW = ['pending', 'confirmed', 'shipping', 'installing', 'done'];
const ORDER_LABELS = ['pending' => 'Chờ xác nhận', 'confirmed' => 'Đã xác nhận', 'shipping' => 'Đang giao', 'installing' => 'Đang lắp đặt', 'done' => 'Hoàn thành', 'cancelled' => 'Đã hủy'];
function orderNextStatuses(string $from): array {
    $i = array_search($from, ORDER_FLOW, true);
    if ($i === false) return [];
    $next = array_slice(ORDER_FLOW, $i + 1);
    if (in_array($from, ['pending', 'confirmed'], true)) $next[] = 'cancelled';
    return $next;
}
function orderMoveError(string $from, string $to): string {
    $a = ORDER_LABELS[$from] ?? $from; $b = ORDER_LABELS[$to] ?? $to;
    if (in_array($from, ['done', 'cancelled'], true)) return "Đơn đã $a, không đổi trạng thái được nữa";
    if ($to === 'cancelled') return "Đơn đang \"$a\" không hủy được. Vui lòng xử lý đổi trả / hoàn tiền";
    return "Không thể chuyển từ \"$a\" về \"$b\" (trạng thái chỉ đi tiến)";
}
function updateOrder(array $order, array $patch, array $user): array {
    $fields = $user['role'] === 'accountant' ? ['payment_status','staff_note'] : ['status','payment_status','staff_note','maintenance_optin'];
    $patch = array_intersect_key($patch, array_flip($fields));
    if (isset($patch['payment_status']) && !in_array($patch['payment_status'], ['unpaid','partial','paid','refunded'], true)) fail('Trạng thái thanh toán không hợp lệ');
    if (isset($patch['status']) && $patch['status'] !== $order['status']) {
        if (!in_array($patch['status'], orderNextStatuses($order['status']), true)) fail(orderMoveError($order['status'], $patch['status']));
        if ($patch['status'] === 'cancelled') {
            $items = array_filter(allRecords('order_items'), fn($i) => $i['order_id'] === $order['id']);
            usort($items, fn($a, $b) => $a['product_id'] <=> $b['product_id']);
            foreach ($items as $item) {
                $p = record('products', $item['product_id'], true);
                if ($p) { $p['sold'] = max(0, ($p['sold'] ?? 0) - $item['qty']); stockMove($p, (int)$item['qty'], 'cancel', $order['code'], 'Hủy đơn hàng', $user['id'] ?? null ? $user : null); }
            }
            if ($order['coupon']) {
                $coupon = record('coupons', $order['coupon'], true);
                if ($coupon) { $coupon['used_count'] = max(0, ($coupon['used_count'] ?? 0) - 1); put('coupons', $coupon); }
            }
        }
        // COD: giao xong nghĩa là đã thu tiền -> tính vào doanh số CRM ngay
        $note = '';
        if ($patch['status'] === 'done' && ($order['payment'] ?? '') === 'cod' && in_array($patch['payment_status'] ?? $order['payment_status'], ['unpaid','partial'], true)) {
            $patch['payment_status'] = 'paid'; $note = 'Đã thu tiền COD khi giao';
        }
        put('order_status_history', ['order_id' => $order['id'], 'status' => $patch['status'], 'note' => $note, 'changed_by' => $user['id'] ?? null], true);
    }
    if (isset($patch['payment_status']) && $patch['payment_status'] !== $order['payment_status']) {
        $patch['paid_at'] = $patch['payment_status'] === 'paid' ? now() : null;
    }
    return put('orders', array_merge($order, $patch));
}
// Dữ liệu khách gửi lên chỉ được là chữ/số: bỏ mảng/object lồng nhau, cắt độ dài.
// Tránh dữ liệu "lạ" làm hỏng trang quản trị khi hiển thị (tên khách là object...).
function cleanText(mixed $v, int $max = 500): string {
    return is_scalar($v) ? mb_substr(trim((string)$v), 0, $max) : '';
}
function flatText(mixed $v, int $max = 500): array {
    if (!is_array($v)) return [];
    $out = [];
    foreach (array_slice($v, 0, 40, true) as $k => $x) if (is_string($k) && (is_scalar($x) || $x === null)) $out[$k] = is_bool($x) || $x === null ? $x : cleanText($x, $max);
    return $out;
}
// Khách hàng CRM theo số điện thoại: tạo mới hoặc bổ sung email / địa chỉ giao hàng (giữ tối đa 5)
function crmUpsert(array $customer, array $shipping): array {
    $customerId = 'phone:' . $customer['phone'];
    $crm = record('crm_customers', $customerId, true);
    if (!$crm) $crm = put('crm_customers', ['id'=>$customerId, 'phone'=>$customer['phone'], 'name'=>$customer['name'], 'email'=>$customer['email'] ?? '', 'addresses'=> $shipping['method'] === 'delivery' ? [$shipping] : [], 'tags'=>[]], true);
    else {
        // Khách cũ: bổ sung email còn trống và địa chỉ giao hàng mới (giữ tối đa 5)
        $changed = false;
        if (empty($crm['email']) && !empty($customer['email'])) { $crm['email'] = $customer['email']; $changed = true; }
        if ($shipping['method'] === 'delivery') {
            $key = fn($a) => mb_strtolower(trim(($a['address'] ?? '') . '|' . ($a['district'] ?? '') . '|' . ($a['province'] ?? '')));
            if (!in_array($key($shipping), array_map($key, $crm['addresses'] ?? []), true)) { $crm['addresses'] = array_slice(array_merge([$shipping], $crm['addresses'] ?? []), 0, 5); $changed = true; }
        }
        if ($changed) $crm = put('crm_customers', $crm);
    }
    return $crm;
}
function placeOrder(array $args): array {
    rateLimit('order', 20);
    // Chống tạo đơn trùng khi khách bấm 2 lần / trình duyệt gửi lại: cùng mã yêu cầu -> trả lại đúng đơn đã tạo
    $requestId = is_string($args['p_request_id'] ?? null) && preg_match('/^[A-Za-z0-9-]{8,64}$/', $args['p_request_id']) ? $args['p_request_id'] : null;
    return transaction(function() use ($args, $requestId) {
        if ($requestId) {
            sql("SELECT GET_LOCK(?, 10)", ['order:' . $requestId]);
            $dup = sql("SELECT record_id FROM records WHERE resource='orders' AND JSON_UNQUOTE(JSON_EXTRACT(data,'$.request_id'))=?", [$requestId])->fetchColumn();
            if ($dup !== false) return orderPublic(record('orders', $dup));
        }
        $customer = flatText($args['p_customer'] ?? []);
        $customer['phone'] = phoneKey($customer['phone'] ?? '');
        if (!preg_match('/^0[0-9]{9,10}$/', $customer['phone']) || empty($customer['name'])) fail('Tên và số điện thoại không hợp lệ');
        $shipping = flatText($args['p_shipping'] ?? []);
        if (!in_array($shipping['method'] ?? '', ['delivery','pickup'], true)) fail('Phương thức giao hàng không hợp lệ');
        if ($shipping['method'] === 'delivery' && empty($shipping['address'])) fail('Vui lòng nhập địa chỉ giao hàng');
        if ($shipping['method'] === 'pickup') {
            $store = array_filter(allRecords('stores'), fn($s) => ($s['active'] ?? true) && ($s['name'] === ($shipping['store'] ?? '') || (string)$s['id'] === (string)($shipping['store'] ?? '')));
            if (!$store) fail('Cửa hàng không hợp lệ');
        }
        if (!in_array($args['p_payment'] ?? '', ['cod','bank'], true)) fail('Cổng thanh toán online chưa được cấu hình. Vui lòng chọn COD hoặc chuyển khoản.');
        $lines = cartLines($args['p_items'] ?? [], true);
        $config = record('settings', 'store')['value'] ?? [];
                $code = cleanText($args['p_coupon'] ?? '', 40) !== '' ? strtoupper(cleanText($args['p_coupon'], 40)) : null;
        $result = null;
        if ($code) {
            $coupon = record('coupons', $code, true);
            $result = couponResult($coupon, $lines, $customer['phone']);
            if (!$result['ok']) fail($result['msg']);
            $coupon['used_count'] = ($coupon['used_count'] ?? 0) + 1; put('coupons', $coupon);
        }
        $quote = orderQuote($lines, $config, $shipping['method'], $result);
        $crm = crmUpsert($customer, $shipping);
        $order = put('orders', [
            'customer_id' => $crm['id'],
            'code' => 'DT' . strtoupper(bin2hex(random_bytes(6))), 'user_id' => actor()['id'] ?? null,
            'status' => 'pending', 'phone' => $customer['phone'], 'customer' => $customer, 'shipping' => $shipping,
            'payment' => $args['p_payment'], 'payment_status' => 'unpaid', 'invoice' => is_array($args['p_invoice'] ?? null) ? flatText($args['p_invoice']) : null,
              'note' => cleanText($args['p_note'] ?? '', 2000), 'staff_note' => '', 'subtotal' => $quote['subtotal'], 'install_fee' => $quote['install'],
            'shipping_fee' => $quote['shipping'], 'discount' => $quote['discount'], 'coupon' => $code,
            'total' => $quote['total'], 'request_id' => $requestId,
        ], true);
        foreach ($lines as $line) {
            $p = record('products', $line['product']['id'], true);
            $p['sold'] = ($p['sold'] ?? 0) + $line['qty']; stockMove($p, -$line['qty'], 'sale', $order['code'], 'Bán hàng website', actor());
            put('order_items', ['order_id' => $order['id'], 'product_id' => $p['id'], 'sku' => $p['sku'], 'name' => $p['name'], 'price' => $line['product']['price'], 'qty' => $line['qty'], 'install' => $line['install'], 'options' => (object)$line['options']], true);
        }
        put('order_status_history', ['order_id' => $order['id'], 'status' => 'pending', 'note' => 'Đặt hàng'], true);
        return orderPublic($order);
    });
}
// Nhân viên tạo đơn trong quản trị: chọn sản phẩm có sẵn (trừ kho) hoặc tự nhập dòng hàng,
// khách có sẵn hoặc khách mới; tự chỉnh đơn giá, phí lắp đặt, phí giao, chiết khấu, thuế GTGT.
const VAT_RATES = [-1, 0, 5, 8, 10]; // -1: không chịu thuế
function adminOrderMoney(mixed $v, string $label): int {
    if ($v === null || $v === '') return 0;
    if (!is_numeric($v) || $v < 0 || $v > 1e12) fail("$label không hợp lệ");
    return (int)round((float)$v);
}
// Tổng đơn tạo tay: PHẢI khớp adminOrderTotals (admin/src/services/orders.ts)
function adminOrderTotals(array $lines, int $install, int $shipping, int $discount, int $rate, bool $included): array {
    $goods = 0; foreach ($lines as $l) $goods += $l['price'] * $l['qty'];
    $base = $goods + $install + $shipping - $discount;
    if ($base < 0) fail('Chiết khấu vượt tổng tiền hàng');
    if ($rate <= 0) $vat = 0;
    elseif ($included) $vat = $base - (int)round($base / (1 + $rate / 100));
    else $vat = (int)round($base * $rate / 100);
    return ['subtotal' => $goods, 'vat' => $vat, 'total' => $included || $rate <= 0 ? $base : $base + $vat];
}
function adminCreateOrder(array $args): array {
    $user = staff(); if (!in_array($user['role'], ['admin','staff','sales'], true)) fail('Không có quyền tạo đơn hàng', 403);
    $customer = flatText($args['p_customer'] ?? [], 300);
    $customer['phone'] = phoneKey($customer['phone'] ?? '');
    if (!preg_match('/^0[0-9]{9,10}$/', $customer['phone'])) fail('Số điện thoại khách hàng không hợp lệ');
    if (($customer['name'] ?? '') === '') fail('Vui lòng nhập tên khách hàng');
    $shipping = flatText($args['p_shipping'] ?? [], 300);
    if (!in_array($shipping['method'] ?? '', ['delivery','pickup'], true)) $shipping['method'] = 'pickup';
    if ($shipping['method'] === 'delivery' && ($shipping['address'] ?? '') === '') fail('Vui lòng nhập địa chỉ giao hàng');
    $payment = in_array($args['p_payment'] ?? '', ['cod','bank'], true) ? $args['p_payment'] : fail('Phương thức thanh toán chỉ có COD hoặc chuyển khoản');
    $paymentStatus = in_array($args['p_payment_status'] ?? 'unpaid', ['unpaid','partial','paid'], true) ? ($args['p_payment_status'] ?? 'unpaid') : fail('Trạng thái thanh toán không hợp lệ');
    $status = in_array($args['p_status'] ?? 'pending', ['pending','confirmed'], true) ? ($args['p_status'] ?? 'pending') : fail('Trạng thái đơn không hợp lệ');
    $rate = $args['p_vat_rate'] ?? 10;
    if (!is_int($rate) || !in_array($rate, VAT_RATES, true)) fail('Thuế suất GTGT không hợp lệ');
    $included = ($args['p_vat_included'] ?? true) !== false;
    $items = $args['p_items'] ?? null;
    if (!is_array($items) || !$items || count($items) > 100) fail('Đơn hàng phải có từ 1 đến 100 dòng sản phẩm');
    return transaction(function() use ($args, $user, $customer, $shipping, $payment, $paymentStatus, $status, $rate, $included, $items) {
        $lines = [];
        foreach ($items as $i => $it) {
            if (!is_array($it)) fail('Dòng sản phẩm không hợp lệ');
            $n = $i + 1;
            $qty = $it['qty'] ?? null;
            if (!is_int($qty) || $qty < 1 || $qty > 100000) fail("Dòng $n: số lượng không hợp lệ");
            $price = adminOrderMoney($it['price'] ?? null, "Dòng $n: đơn giá");
            $pid = $it['product_id'] ?? null;
            $p = $pid !== null && $pid !== '' ? record('products', is_scalar($pid) ? (string)$pid : '', true) : null;
            if ($pid !== null && $pid !== '' && !$p) fail("Dòng $n: sản phẩm không tồn tại");
            $name = cleanText($it['name'] ?? '', 300) ?: ($p['name'] ?? '');
            if ($name === '') fail("Dòng $n: vui lòng nhập tên sản phẩm");
            $lines[] = ['product' => $p, 'name' => $name, 'sku' => cleanText($it['sku'] ?? '', 80) ?: ($p['sku'] ?? ''), 'unit' => cleanText($it['unit'] ?? '', 30) ?: ($p['unit'] ?? 'Cái'), 'qty' => $qty, 'price' => $price];
        }
        $install = adminOrderMoney($args['p_install_fee'] ?? 0, 'Phí lắp đặt');
        $ship = adminOrderMoney($args['p_shipping_fee'] ?? 0, 'Phí giao hàng');
        $discount = adminOrderMoney($args['p_discount'] ?? 0, 'Chiết khấu');
        $t = adminOrderTotals($lines, $install, $ship, $discount, $rate, $included);
        $crm = crmUpsert($customer, $shipping);
        $code = 'DT' . strtoupper(bin2hex(random_bytes(6)));
        $order = put('orders', [
            'customer_id' => $crm['id'], 'code' => $code, 'user_id' => null, 'source' => 'admin',
            'created_by' => $user['id'], 'created_by_name' => userName($user),
            'status' => $status, 'phone' => $customer['phone'], 'customer' => $customer, 'shipping' => $shipping,
            'payment' => $payment, 'payment_status' => $paymentStatus, 'paid_at' => $paymentStatus === 'paid' ? now() : null,
            'invoice' => is_array($args['p_invoice'] ?? null) ? flatText($args['p_invoice']) : null,
            'note' => cleanText($args['p_note'] ?? '', 2000), 'staff_note' => cleanText($args['p_staff_note'] ?? '', 2000),
            'subtotal' => $t['subtotal'], 'install_fee' => $install, 'shipping_fee' => $ship, 'discount' => $discount, 'coupon' => null,
            'vat_rate' => $rate, 'vat_included' => $included, 'vat_amount' => $t['vat'], 'total' => $t['total'],
        ], true);
        usort($lines, fn($a, $b) => (string)($a['product']['id'] ?? '') <=> (string)($b['product']['id'] ?? ''));
        foreach ($lines as $l) {
            $p = $l['product'];
            if ($p) { $p = record('products', $p['id'], true); $p['sold'] = ($p['sold'] ?? 0) + $l['qty']; stockMove($p, -$l['qty'], 'sale', $code, 'Bán hàng (tạo đơn tại quản trị)', $user); }
            put('order_items', ['order_id' => $order['id'], 'product_id' => $p['id'] ?? null, 'sku' => $l['sku'], 'name' => $l['name'], 'unit' => $l['unit'], 'price' => $l['price'], 'qty' => $l['qty'], 'install' => false, 'options' => (object)[]], true);
        }
        put('order_status_history', ['order_id' => $order['id'], 'status' => $status, 'note' => 'Tạo đơn tại quản trị – ' . userName($user), 'changed_by' => $user['id']], true);
        return $order;
    });
}
function rpcEndpoint(string $name, array $args): mixed {
    if ($name === 'admin_create_order') return adminCreateOrder($args);
    if ($name === 'admin_users') return adminUsers($args);
    if ($name === 'place_order') return placeOrder($args);
    if ($name === 'inventory') return inventoryEndpoint($args);
    if ($name === 'issue_invoice') return issueInvoice($args);
    if ($name === 'validate_coupon_cart') {
        rateLimit('coupon');
        return couponResult(record('coupons', strtoupper(trim($args['p_code'] ?? ''))), cartLines($args['p_items'] ?? [], false), phoneKey($args['p_phone'] ?? ''));
    }
    if (in_array($name, ['track_order','cancel_order','order_extras'], true)) {
        rateLimit('track', 40);
        return transaction(function() use ($name, $args) {
            $o = orderByCode($args['p_code'] ?? '', $args['p_phone'] ?? '', true);
            if ($name === 'cancel_order') {
                if (!in_array($o['status'], ['pending','confirmed'], true) || $o['payment_status'] === 'paid') fail('Vui lòng liên hệ cửa hàng để hủy đơn này');
                $o = updateOrder($o, ['status' => 'cancelled'], ['role' => 'customer']);
            }
            if ($name === 'order_extras') {
                $o['maintenance_optin'] = ($args['p_maintenance'] ?? false) === true;
                $o['attribution'] = is_array($args['p_attribution'] ?? null) ? flatText($args['p_attribution'], 300) : null; put('orders', $o);
                return ['maintenance' => $o['maintenance_optin']];
            }
            return orderPublic($o);
        });
    }
    if ($name === 'my_orders') {
        $user = actor(); if (!$user) fail('Vui lòng đăng nhập', 401);
        return array_map('orderPublic', array_values(array_filter(allRecords('orders'), fn($o) => $o['user_id'] === $user['id'])));
    }
    if ($name === 'submit_lead') {
        rateLimit('lead', 15);
        if (!in_array($args['p_type'] ?? '', ['contact','service','b2b','b2b-quote','newsletter','rfq','survey','consult','recruit'], true)) fail('Loại yêu cầu không hợp lệ');
        $data = is_array($args['p_data'] ?? null) ? $args['p_data'] : [];
        return put('leads', ['code' => 'LH' . strtoupper(bin2hex(random_bytes(5))), 'type' => $args['p_type'], 'status' => 'new', 'data' => $data, 'name' => cleanText($data['name'] ?? '', 200), 'phone' => phoneKey(cleanText($data['phone'] ?? '', 30)), 'company' => cleanText($data['company'] ?? '', 200), 'source_url' => cleanText($args['p_source_url'] ?? '', 500), 'assigned_to' => null, 'notes' => []], true);
    }
    if ($name === 'save_cart_reminder') {
        rateLimit('cart', 10);
        return put('cart_reminders', ['data' => $args], true);
    }
    if ($name === 'save_brand') {
        $user = staff(); if (!in_array($user['role'], ['staff','admin','sales'], true)) fail('Không có quyền', 403);
        $brand = $args['p_brand'] ?? []; $old = $args['p_id'] ?? null;
        $brand['id'] = $old ?: ($brand['slug'] ?? '');
        if (empty($brand['id']) || empty($brand['name'])) fail('Thiếu thông tin thương hiệu');
        return transaction(function() use ($brand, $old) {
            $existing = $old ? record('brands', $old, true) : null;
            if ($old && !$existing) fail('Không tìm thấy thương hiệu', 404);
            foreach (allRecords('brands') as $other) if ($other['id'] !== $old && ($other['slug'] ?? $other['id']) === ($brand['slug'] ?? $brand['id'])) fail('Đường dẫn thương hiệu đã tồn tại');
            $row = array_merge(['active'=>true, 'sort'=>0], $existing ?? [], $brand);
            if (!$old || $old !== $brand['id']) {
                put('brands', $row, true);
                if ($old) {
                    foreach (allRecords('products') as $p) if ($p['brand'] === $old) { $p['brand'] = $brand['id']; put('products', $p); }
                    bumpPublic('brands'); sql("DELETE FROM records WHERE resource='brands' AND record_id=?", [$old]);
                }
            } else put('brands', $row);
            foreach ($brand['product_ids'] ?? [] as $productId) {
                $product = record('products', $productId, true);
                if (!$product) fail('Sản phẩm không tồn tại');
                $product['brand'] = $row['id']; put('products', $product);
            }
            return $row;
        });
    }
    // Danh sách gọi chăm sóc bảo trì: mỗi lần đến hạn (khách bảo trì + ngày đến hạn) lưu trạng thái và lịch sử thao tác.
    // Chỉ ghi qua đây (không sửa/xóa trực tiếp), lịch sử chỉ thêm vào, không mất dữ liệu.
    // Quản lý nhóm khách hàng (chỉ quản trị viên): thêm / sửa / xóa. Xóa nhóm: khách trong nhóm chuyển về "Khách bán lẻ",
    // mã giảm giá đang áp cho nhóm đó bỏ nhóm khỏi danh sách áp dụng – không để dữ liệu trỏ tới nhóm không tồn tại.
    if ($name === 'customer_group') {
        $user = staff(); if (!in_array($user['role'], ['admin','sales'], true)) fail('Không có quyền sửa nhóm khách hàng', 403);
        $op = (string)($args['p_op'] ?? '');
        return transaction(function() use ($op, $args) {
            $groups = customerGroups();
            if ($op === 'save') {
                $g = is_array($args['p_group'] ?? null) ? $args['p_group'] : [];
                $name = mb_substr(trim((string)($g['name'] ?? '')), 0, 60);
                if ($name === '') fail('Nhập tên nhóm');
                $color = preg_match('/^#[0-9a-fA-F]{6}$/', (string)($g['color'] ?? '')) ? strtolower($g['color']) : '#64748b';
                $desc = mb_substr(trim((string)($g['desc'] ?? '')), 0, 200);
                $id = (string)($g['id'] ?? '');
                $i = array_search($id, array_column($groups, 'id'), true);
                foreach ($groups as $k => $o) if ($k !== $i && mb_strtolower($o['name']) === mb_strtolower($name)) fail('Tên nhóm đã tồn tại');
                if ($i === false) {
                    $base = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace(['đ','Đ'], 'd', $name)) ?: '')), '-') ?: 'nhom';
                    $id = $base; $n = 2; while (in_array($id, array_column($groups, 'id'), true)) $id = $base . '-' . $n++;
                    $groups[] = ['id' => $id, 'name' => $name, 'color' => $color, 'desc' => $desc];
                } else $groups[$i] = array_merge($groups[$i], ['name' => $name, 'color' => $color, 'desc' => $desc]);
            } elseif ($op === 'delete') {
                $id = (string)($args['p_id'] ?? '');
                $i = array_search($id, array_column($groups, 'id'), true);
                if ($i === false) fail('Không tìm thấy nhóm', 404);
                if (!empty($groups[$i]['locked'])) fail('Không xóa được nhóm mặc định');
                array_splice($groups, $i, 1);
                foreach (allRecords('crm_customers') as $c) if (($c['group'] ?? null) === $id || $id === 'vip' && empty($c['group']) && in_array('VIP', $c['tags'] ?? [], true)) put('crm_customers', array_merge($c, ['group' => 'ban-le']));
                foreach (allRecords('coupons') as $cp) if (array_intersect($cp['customer_groups'] ?? [], ['group:' . $id] + ($id === 'vip' ? [1 => 'vip'] : []))) put('coupons', array_merge($cp, ['customer_groups' => array_values(array_diff($cp['customer_groups'], ['group:' . $id, $id === 'vip' ? 'vip' : '']))]));
            } else fail('Thao tác không hợp lệ');
            $row = record('settings', 'customer_groups', true) ?? ['key' => 'customer_groups'];
            put('settings', array_merge($row, ['key' => 'customer_groups', 'value' => ['groups' => array_values($groups)]]));
            return array_values($groups);
        });
    }
    if ($name === 'maintenance_call') {
        $user = staff(); if (!in_array($user['role'], ['admin','staff','sales'], true)) fail('Không có quyền', 403);
        $key = (string)($args['p_key'] ?? '');
        if (!preg_match('/^(c|o):([A-Za-z0-9_.-]{1,80}):(\d{4}-\d{2}-\d{2})$/', $key, $m)) fail('Mã lịch nhắc không hợp lệ');
        if ($m[1] === 'c' && !record('maintenance_contracts', $m[2])) fail('Không tìm thấy khách bảo trì', 404);
        if ($m[1] === 'o' && !array_filter(allRecords('orders'), fn($o) => (string)($o['code'] ?? '') === $m[2])) fail('Không tìm thấy đơn hàng', 404);
        $action = (string)($args['p_action'] ?? '');
        if (!in_array($action, ['called', 'booked', 'skipped', 'reset'], true)) fail('Thao tác không hợp lệ');
        $date = (string)($args['p_date'] ?? '');
        if ($action === 'booked' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) fail('Chọn ngày hẹn bảo trì');
        $note = mb_substr(trim((string)($args['p_note'] ?? '')), 0, 500);
        if ($action === 'skipped' && $note === '') fail('Nhập lý do bỏ qua');
        return transaction(function() use ($key, $m, $action, $date, $note) {
            $row = record('maintenance_calls', $key, true) ?? ['id' => $key, 'kind' => $m[1] === 'c' ? 'contract' : 'order', 'ref' => $m[2], 'due' => $m[3], 'status' => 'open', 'calls' => 0, 'history' => []];
            if ($action === 'called') $row['calls'] = (int)($row['calls'] ?? 0) + 1;
            if ($action === 'booked') { $row['status'] = 'booked'; $row['booked_date'] = $date; }
            if ($action === 'skipped') { $row['status'] = 'skipped'; unset($row['booked_date']); }
            if ($action === 'reset') { $row['status'] = 'open'; unset($row['booked_date']); }
            if ($note !== '') $row['note'] = $note;
            $row['history'][] = ['at' => now(), 'by' => currentUserName(), 'action' => $action, 'date' => $date ?: null, 'note' => $note];
            $row['history'] = array_slice($row['history'], -200);
            return put('maintenance_calls', $row);
        });
    }
    if ($name === 'maintenance_skip') {
        $user = staff(); if (!in_array($user['role'], ['admin','staff','sales'], true)) fail('Không có quyền', 403);
        $row = record('notifications', $args['p_id'] ?? '') ?? throw new HttpError('Không tìm thấy lịch nhắc', 404);
        $row['status'] = ($args['p_skip'] ?? false) ? 'skipped' : 'pending'; return put('notifications', $row);
    }
    fail('Không tìm thấy chức năng', 404);
}
