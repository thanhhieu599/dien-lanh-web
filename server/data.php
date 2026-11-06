<?php
declare(strict_types=1);

function allowed(string $table, string $method, ?array $user, ?array $row = null): bool {
    $role = $user['role'] ?? 'guest';
    if ($role === 'admin') return true;
    if ($table === 'profiles' && $row && ($row['id'] ?? '') === ($user['id'] ?? null)) return in_array($method, ['GET', 'PATCH'], true);
    if ($role === 'staff') {
        if ($table === 'profiles') return $method === 'GET';
        if (in_array($table, ['settings', 'policies'], true)) return $method === 'GET';
        return true;
    }
    if ($role === 'sales') {
        if ($table === 'leads') return $row && ($row['assigned_to'] ?? null) === $user['id'];
        if ($table === 'profiles') return $method === 'GET' && in_array($row['role'] ?? '', ['admin', 'staff', 'sales'], true);
    }
    if ($role === 'accountant') {
        return $method === 'GET' && in_array($table, ['orders', 'order_items', 'order_status_history', 'payments', 'products', 'categories', 'brands', 'settings', 'profiles', 'crm_customers', 'crm_customer_summary', 'crm_customer_products'], true)
            || $table === 'orders' && $method === 'PATCH';
    }
    if ($method !== 'GET') return false;
    if (in_array($table, ['categories', 'brands', 'products', 'stores', 'banners', 'services', 'faqs'], true)) return ($row['active'] ?? true) !== false;
    if (in_array($table, ['posts', 'projects'], true)) return ($row['published'] ?? true) !== false;
    if ($table === 'settings') return in_array($row['key'] ?? '', ['store', 'vision', 'trust', 'home', 'catalog'], true);
    if ($table === 'policies') return true;
    if ($table === 'coupons') return ($row['active'] ?? true) && ($row['is_public'] ?? true);
    if ($table === 'reviews') return ($row['status'] ?? '') === 'approved';
    return false;
}
function matchFilter(array $row, string $column, string $expression): bool {
    [$op, $value] = array_pad(explode('.', $expression, 2), 2, '');
    $actual = $row[$column] ?? null;
    if ($op === 'in') return in_array((string)$actual, array_map(fn($v) => trim($v, '" '), explode(',', trim($value, '()'))), true);
    if ($op === 'is') return $actual === match ($value) { 'null' => null, 'true' => true, 'false' => false, default => $value };
    if ($op === 'ilike') return preg_match('/^' . str_replace(['\*', '%'], '.*', preg_quote($value, '/')) . '$/iu', (string)$actual) === 1;
    return match ($op) {
        'eq' => (string)$actual === $value || ($actual === true && $value === 'true') || ($actual === false && $value === 'false'),
        'neq' => (string)$actual !== $value,
        'gt' => $actual > $value, 'gte' => $actual >= $value,
        'lt' => $actual < $value, 'lte' => $actual <= $value,
        default => false,
    };
}
function matches(array $row, array $query): bool {
    foreach ($query as $key => $value) {
        if (in_array($key, ['route', 'select', 'order', 'limit', 'offset'], true)) continue;
        if ($key === 'or') {
            $ok = false;
            foreach (explode(',', trim($value, '()')) as $expression) {
                [$column, $filter] = array_pad(explode('.', $expression, 2), 2, '');
                $ok = $ok || matchFilter($row, $column, $filter);
            }
            if (!$ok) return false;
        } elseif (!matchFilter($row, $key, $value)) return false;
    }
    return true;
}
function projectRow(array $row, string $table, string $select, ?array $user): array {
    if ($table === 'reviews' && !in_array($user['role'] ?? '', ['admin', 'staff'], true)) unset($row['phone'], $row['user_id']);
    $columns = preg_split('/,(?![^()]*\))/', $select);
    $result = in_array('*', $columns, true) ? $row : [];
    foreach ($columns as $column) {
        if (preg_match('/^(order_items|order_status_history|payments)\((.*)\)$/', $column, $m) && $table === 'orders') {
            $result[$m[1]] = array_values(array_filter(allRecords($m[1]), fn($r) => (string)($r['order_id'] ?? '') === (string)$row['id']));
        } elseif (array_key_exists($column, $row)) $result[$column] = $row[$column];
    }
    return $result;
}
function crmSummary(): array {
    $customers = allRecords('crm_customers');
    foreach (allRecords('profiles') as $profile) {
        $found = false;
        foreach ($customers as &$c) {
            if (phoneKey($c['phone'] ?? '') === phoneKey($profile['phone'] ?? '')) {
                $c = array_merge($profile, $c, ['profile_id' => $profile['id'], 'role' => $profile['role']]); $found = true; break;
            }
        }
        unset($c);
        if (!$found) $customers[] = array_merge($profile, ['id' => 'profile:' . $profile['id'], 'profile_id' => $profile['id']]);
    }
    $orders = allRecords('orders');
    foreach ($customers as &$c) {
        $rows = array_values(array_filter($orders, fn($o) => isset($o['customer_id']) ? (string)$o['customer_id'] === (string)$c['id'] : phoneKey($o['phone']) === phoneKey($c['phone'] ?? '')));
        usort($rows, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
        $active = array_filter($rows, fn($o) => $o['status'] !== 'cancelled');
        $paid = array_filter($active, fn($o) => $o['payment_status'] === 'paid');
        $c['order_count'] = count($active);
        $c['paid_count'] = count($paid);
        $c['total_spent'] = array_sum(array_column($paid, 'total'));
        $c['average_spent'] = count($paid) ? $c['total_spent'] / count($paid) : 0;
        $c['last_order_id'] = $rows[0]['id'] ?? null;
        $c['last_order_code'] = $rows[0]['code'] ?? null;
        $c['last_order_at'] = $rows[0]['created_at'] ?? null;
        $c['role'] ??= 'customer'; $c['tags'] ??= []; $c['addresses'] ??= [];
    }
    return $customers;
}
function validateRow(string $table, array $row): void {
    if ($table === 'products') {
        foreach (['sku', 'slug', 'name', 'cat', 'brand'] as $field) if (empty($row[$field]) || !is_string($row[$field])) fail("Thiếu {$field}");
        foreach (['price', 'stock'] as $field) if (!isset($row[$field]) || !is_numeric($row[$field]) || $row[$field] < 0 || floor((float)$row[$field]) != $row[$field]) fail("{$field} không hợp lệ");
        if (!record('categories', $row['cat']) || !record('brands', $row['brand'])) fail('Danh mục hoặc thương hiệu không tồn tại');
    }
    if ($table === 'coupons') {
        if (!in_array($row['type'] ?? '', ['percent', 'fixed', 'ship'], true) || ($row['value'] ?? -1) < 0 || ($row['type'] === 'percent' && $row['value'] > 100)) fail('Mã giảm giá không hợp lệ');
    }
}
function customerProducts(): array {
    $items = allRecords('order_items'); $result = [];
    foreach (allRecords('orders') as $order) {
        if ($order['status'] !== 'done' || $order['payment_status'] !== 'paid') continue;
        foreach ($items as $item) if ($item['order_id'] === $order['id']) {
            $key = ($order['customer_id'] ?? '') . ':' . $item['product_id'];
            $result[$key] ??= ['customer_id'=>$order['customer_id'] ?? null, 'product_id'=>$item['product_id'], 'sku'=>$item['sku'], 'name'=>$item['name'], 'quantity'=>0, 'last_bought_at'=>$order['created_at']];
            $result[$key]['quantity'] += $item['qty'];
            $result[$key]['last_bought_at'] = max($result[$key]['last_bought_at'], $order['created_at']);
        }
    }
    return array_values($result);
}
function dataEndpoint(string $table, string $method, array $body): mixed {
    if (!in_array($table, array_merge(tables(), ['crm_customer_summary','crm_customer_products']), true)) fail('Không tìm thấy bảng', 404);
    $user = actor();
    if ($method === 'GET') {
        // Catalog của website luôn là dữ liệu công khai, kể cả người xem đang đăng nhập admin.
        $scope = ($_SERVER['HTTP_X_DT_ADMIN'] ?? '') === '1' || $table === 'profiles' ? $user : null;
        $rows = match($table) { 'crm_customer_summary' => crmSummary(), 'crm_customer_products' => customerProducts(), default => allRecords($table) };
        $rows = array_values(array_filter($rows, fn($row) => allowed($table, 'GET', $scope, $row) && matches($row, $_GET)));
        if (isset($_GET['order'])) {
            $orders = explode(',', $_GET['order']);
            usort($rows, function($a, $b) use ($orders) {
                foreach ($orders as $order) {
                    [$col, $direction] = array_pad(explode('.', $order), 2, 'asc');
                    $cmp = ($a[$col] ?? null) <=> ($b[$col] ?? null);
                    if ($cmp) return $direction === 'desc' ? -$cmp : $cmp;
                }
                return 0;
            });
        }
        $total = count($rows); $offset = max(0, (int)($_GET['offset'] ?? 0));
        $rows = array_slice($rows, $offset, min(10000, max(1, (int)($_GET['limit'] ?? 1000))));
        header('Content-Range: ' . ($rows ? $offset . '-' . ($offset + count($rows) - 1) : '*') . '/' . $total);
        return array_map(fn($r) => projectRow($r, $table, $_GET['select'] ?? '*', $scope), $rows);
    }
    if ($table === 'reviews' && $method === 'POST') {
        rateLimit('review', 10);
        if (!record('products', $body['product_id'] ?? '') || empty($body['name']) || empty($body['text']) || !in_array($body['rating'] ?? 0, [1,2,3,4,5], true)) fail('Đánh giá không hợp lệ');
        return [put('reviews', array_merge(array_intersect_key($body, array_flip(['product_id','name','phone','rating','text'])), ['status' => 'pending', 'verified' => false, 'user_id' => $user['id'] ?? null]), true)];
    }
    if (!$user) fail('Vui lòng đăng nhập', 401);
    if ($method === 'POST') {
        if (!allowed($table, $method, $user, $body) || !in_array($table, ['products','categories','brands','coupons','posts','banners','stores','services','policies','settings','projects','faqs','crm_customers'], true)) fail('Không có quyền tạo dữ liệu', 403);
        validateRow($table, $body);
        return [put($table, $body, true)];
    }
    $filter = $_GET[pk($table)] ?? '';
    if (!str_starts_with($filter, 'eq.')) fail('Phải chỉ định một bản ghi');
    $id = substr($filter, 3);
    return transaction(function() use ($table, $method, $body, $user, $id) {
        $row = record($table, $id, true);
        if (!$row) fail('Không tìm thấy bản ghi', 404);
        if (!allowed($table, $method, $user, $row)) fail('Không có quyền', 403);
        if ($method === 'DELETE') {
            if (in_array($table, ['orders','order_items','order_status_history','profiles','payments','notifications'], true)) fail('Không được xóa dữ liệu giao dịch', 403);
            if (in_array($table, ['categories','brands'], true)) {
                foreach (allRecords('products') as $p) if (($p[$table === 'brands' ? 'brand' : 'cat'] ?? '') === $id) fail('Dữ liệu đang được sử dụng, hãy chuyển sang ẩn');
            }
            sql('DELETE FROM records WHERE resource=? AND record_id=?', [$table, $id]); return null;
        }
        if ($method !== 'PATCH') fail('Phương thức không hỗ trợ', 405);
        if ($table === 'orders') return [updateOrder($row, $body, $user)];
        if (in_array($table, ['order_items','order_status_history','payments'], true)) fail('Không được sửa trực tiếp dữ liệu giao dịch', 403);
        $patch = $body;
        unset($patch[pk($table)], $patch['created_at']);
        if ($table === 'profiles') {
            $fields = $user['role'] === 'admin' ? ['name','email','addresses','role'] : ['name','email','addresses'];
            $patch = array_intersect_key($patch, array_flip($fields));
            if (isset($patch['role']) && (!in_array($patch['role'], ['customer','admin','staff','sales','accountant'], true) || $id === $user['id'])) fail('Không thể đổi vai trò này');
            if (isset($patch['email'])) sql('UPDATE users SET email=? WHERE id=?', [$patch['email'] ?: null, $id]);
        }
        if ($table === 'leads' && $user['role'] === 'sales') $patch = array_intersect_key($patch, array_flip(['status','notes','staff_note']));
        $row = array_merge($row, $patch);
        validateRow($table, $row);
        return [put($table, $row)];
    });
}
