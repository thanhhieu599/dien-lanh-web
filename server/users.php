<?php
declare(strict_types=1);
// Cấu hình → Tài khoản & phân quyền: chỉ Quản trị viên được tạo tài khoản nhân viên, đổi vai trò,
// đặt lại mật khẩu, khóa / mở khóa. Luôn giữ ít nhất 1 quản trị viên đang hoạt động.
const STAFF_ROLES = ['admin', 'staff', 'sales', 'accountant'];

function staffPublic(array $p): array {
    return ['id' => $p['id'], 'name' => $p['name'] ?? '', 'phone' => $p['phone'] ?? '', 'email' => $p['email'] ?? '',
        'role' => $p['role'] ?? 'customer', 'locked' => !empty($p['locked']), 'created_at' => $p['created_at'] ?? null,
        'created_by_name' => $p['created_by_name'] ?? null];
}
function activeAdmins(?string $exceptId = null): int {
    return count(array_filter(allRecords('profiles'), fn($p) => ($p['role'] ?? '') === 'admin' && empty($p['locked']) && $p['id'] !== $exceptId));
}
function staffPassword(mixed $v): string {
    if (!is_string($v) || strlen($v) < 8 || strlen($v) > 72) fail('Mật khẩu phải dài 8–72 ký tự');
    return $v;
}
function adminUsers(array $a): mixed {
    $me = staff(); if ($me['role'] !== 'admin') fail('Chỉ quản trị viên được quản lý tài khoản', 403);
    $op = is_string($a['p_op'] ?? null) ? $a['p_op'] : '';
    if ($op === 'list') {
        $rows = array_values(array_filter(allRecords('profiles'), fn($p) => in_array($p['role'] ?? '', STAFF_ROLES, true)));
        usort($rows, fn($x, $y) => array_search($x['role'], STAFF_ROLES) <=> array_search($y['role'], STAFF_ROLES) ?: strcmp($x['name'] ?? '', $y['name'] ?? ''));
        return array_map('staffPublic', $rows);
    }
    return transaction(function() use ($a, $op, $me) {
        if ($op === 'create') {
            $phone = phoneKey(cleanText($a['p_phone'] ?? '', 20));
            $name = cleanText($a['p_name'] ?? '', 120);
            $email = cleanText($a['p_email'] ?? '', 160);
            $role = in_array($a['p_role'] ?? '', STAFF_ROLES, true) ? $a['p_role'] : fail('Vai trò không hợp lệ');
            if (!preg_match('/^0[0-9]{9,10}$/', $phone)) fail('Số điện thoại không hợp lệ');
            if ($name === '') fail('Vui lòng nhập họ tên nhân viên');
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Email không hợp lệ');
            $password = staffPassword($a['p_password'] ?? null);
            if (sql('SELECT id FROM users WHERE phone=?' . ($email !== '' ? ' OR email=?' : ''), $email !== '' ? [$phone, $email] : [$phone])->fetchColumn())
                fail('Số điện thoại hoặc email đã có tài khoản. Dùng "Cấp quyền cho tài khoản có sẵn" để đổi vai trò.', 409);
            $id = bin2hex(random_bytes(16));
            sql('INSERT INTO users(id,phone,email,password_hash) VALUES(?,?,?,?)', [$id, $phone, $email ?: null, password_hash($password, PASSWORD_DEFAULT)]);
            return staffPublic(put('profiles', ['id' => $id, 'phone' => $phone, 'email' => $email, 'name' => $name, 'addresses' => [], 'role' => $role,
                'created_by' => $me['id'], 'created_by_name' => userName($me)], true));
        }
        if ($op === 'grant') {
            // Tài khoản khách đã đăng ký trên website → cấp vai trò nhân viên
            $phone = phoneKey(cleanText($a['p_phone'] ?? '', 20));
            $id = sql('SELECT id FROM users WHERE phone=?', [$phone])->fetchColumn();
            if (!$id) fail('Không tìm thấy tài khoản với số điện thoại này', 404);
            $a['p_id'] = $id; $op = 'set_role';
        }
        $p = record('profiles', is_string($a['p_id'] ?? null) ? $a['p_id'] : '', true);
        if (!$p) fail('Không tìm thấy tài khoản', 404);
        $self = $p['id'] === $me['id'];
        if ($op === 'set_role') {
            $role = in_array($a['p_role'] ?? '', [...STAFF_ROLES, 'customer'], true) ? $a['p_role'] : fail('Vai trò không hợp lệ');
            if ($self && $role !== 'admin') fail('Không thể tự hạ quyền của chính mình');
            if (($p['role'] ?? '') === 'admin' && $role !== 'admin' && activeAdmins($p['id']) < 1) fail('Phải còn ít nhất 1 quản trị viên');
            $p['role'] = $role;
        } elseif ($op === 'set_password') {
            sql('UPDATE users SET password_hash=? WHERE id=?', [password_hash(staffPassword($a['p_password'] ?? null), PASSWORD_DEFAULT), $p['id']]);
            $p['password_changed_at'] = now();
        } elseif ($op === 'lock' || $op === 'unlock') {
            if ($self) fail('Không thể tự khóa tài khoản của chính mình');
            if ($op === 'lock' && ($p['role'] ?? '') === 'admin' && activeAdmins($p['id']) < 1) fail('Phải còn ít nhất 1 quản trị viên');
            $p['locked'] = $op === 'lock';
        } elseif ($op === 'update') {
            $name = cleanText($a['p_name'] ?? '', 120); if ($name === '') fail('Vui lòng nhập họ tên');
            $p['name'] = $name;
        } else fail('Thao tác không hợp lệ');
        return staffPublic(put('profiles', $p));
    });
}
