<?php
declare(strict_types=1);
require_once __DIR__ . '/inventory.php';

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
                    if ($group === 'vip' && in_array('VIP', $c['tags'] ?? [], true) || $group === 'marketing' && ($c['marketing_opt_in'] ?? false) || str_starts_with($group, 'tag:') && in_array(substr($group, 4), $c['tags'] ?? [], true)) $ok = true;
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
                $values = is_array($values) ? $values : preg_split('/[,;\n|]/', (string)$values);
                $values = array_values(array_filter(array_map('trim', array_map('strval', $values)), fn($v) => $v !== ''));
                if ($values && !in_array($options[trim($group)] ?? null, $values, true)) fail('Vui lòng chọn đủ thuộc tính sản phẩm');
            }
            if (array_diff(array_keys($options), array_keys($p['options'] ?? []))) fail('Thuộc tính không hợp lệ');
        }
        $lines[] = ['product' => $p, 'qty' => $qty, 'install' => ($item['install'] ?? false) === true, 'options' => $options];
    }
    return $lines;
}
function updateOrder(array $order, array $patch, array $user): array {
    $fields = $user['role'] === 'accountant' ? ['payment_status','staff_note'] : ['status','payment_status','staff_note','maintenance_optin'];
    $patch = array_intersect_key($patch, array_flip($fields));
    if (isset($patch['payment_status']) && !in_array($patch['payment_status'], ['unpaid','partial','paid','refunded'], true)) fail('Trạng thái thanh toán không hợp lệ');
    if (isset($patch['status']) && $patch['status'] !== $order['status']) {
        $transitions = ['pending' => ['confirmed','cancelled'], 'confirmed' => ['shipping','cancelled'], 'shipping' => ['installing','done'], 'installing' => ['done'], 'done' => [], 'cancelled' => []];
        if (!in_array($patch['status'], $transitions[$order['status']] ?? [], true)) fail('Không thể chuyển trạng thái này');
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
        $customerId = 'phone:' . $customer['phone'];
        $crm = record('crm_customers', $customerId, true);
        if (!$crm) $crm = put('crm_customers', ['id'=>$customerId, 'phone'=>$customer['phone'], 'name'=>$customer['name'], 'email'=>$customer['email'] ?? '', 'addresses'=> $shipping['method'] === 'delivery' ? [$shipping] : [], 'tags'=>[], 'marketing_opt_in'=>false], true);
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
            put('order_items', ['order_id' => $order['id'], 'product_id' => $p['id'], 'sku' => $p['sku'], 'name' => $p['name'], 'price' => $p['price'], 'qty' => $line['qty'], 'install' => $line['install'], 'options' => (object)$line['options']], true);
        }
        put('order_status_history', ['order_id' => $order['id'], 'status' => 'pending', 'note' => 'Đặt hàng'], true);
        return orderPublic($order);
    });
}
function rpcEndpoint(string $name, array $args): mixed {
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
        if (!in_array($args['p_type'] ?? '', ['contact','service','b2b','b2b-quote','newsletter','rfq','survey','consult'], true)) fail('Loại yêu cầu không hợp lệ');
        $data = is_array($args['p_data'] ?? null) ? $args['p_data'] : [];
        return put('leads', ['code' => 'LH' . strtoupper(bin2hex(random_bytes(5))), 'type' => $args['p_type'], 'status' => 'new', 'data' => $data, 'name' => cleanText($data['name'] ?? '', 200), 'phone' => phoneKey(cleanText($data['phone'] ?? '', 30)), 'company' => cleanText($data['company'] ?? '', 200), 'source_url' => cleanText($args['p_source_url'] ?? '', 500), 'assigned_to' => null, 'notes' => []], true);
    }
    if ($name === 'save_cart_reminder') {
        rateLimit('cart', 10);
        return put('cart_reminders', ['data' => $args], true);
    }
    if ($name === 'save_brand') {
        $user = staff(); if (!in_array($user['role'], ['staff','admin'], true)) fail('Không có quyền', 403);
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
                    sql("DELETE FROM records WHERE resource='brands' AND record_id=?", [$old]);
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
    if ($name === 'maintenance_skip') {
        $user = staff(); if (!in_array($user['role'], ['admin','staff'], true)) fail('Không có quyền', 403);
        $row = record('notifications', $args['p_id'] ?? '') ?? throw new HttpError('Không tìm thấy lịch nhắc', 404);
        $row['status'] = ($args['p_skip'] ?? false) ? 'skipped' : 'pending'; return put('notifications', $row);
    }
    fail('Không tìm thấy chức năng', 404);
}
