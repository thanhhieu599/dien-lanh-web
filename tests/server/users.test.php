<?php
// Cấu hình → Tài khoản & phân quyền (MySQL thật):
//   docker compose exec -T web php tests/server/users.test.php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
ob_start();
require __DIR__ . '/../../server/bootstrap.php';
require __DIR__ . '/../../server/data.php';
require __DIR__ . '/../../server/shop.php';

$p = 'qa-users-' . bin2hex(random_bytes(4));
$checks = 0; $made = []; $phones = []; $others = [];
function ok(bool $c, string $label): void { global $checks; if (!$c) throw new RuntimeException("FAIL $label"); $checks++; echo "PASS $label\n"; }
function as_(?array $u): void { $_SESSION = $u ? ['user_id' => $u['id'], 'expires_at' => time() + 3600] : []; }
function call(array $a): array { try { return ['ok' => rpcEndpoint('admin_users', $a)]; } catch (HttpError $e) { return ['error' => $e->getMessage(), 'status' => $e->getCode()]; } }
function phoneNo(int $n): string { return '09' . str_pad((string)((time() % 1000000) * 10 + $n), 8, '0', STR_PAD_LEFT); }
try {
    $admin = put('profiles', ['id' => "$p-admin", 'phone' => phoneNo(1), 'name' => 'QA Admin chính', 'role' => 'admin'], true); $made[] = $admin['id'];
    $staffUser = put('profiles', ['id' => "$p-staff", 'phone' => phoneNo(2), 'name' => 'QA Vận hành', 'role' => 'staff'], true); $made[] = $staffUser['id'];

    echo "--- Quyền truy cập\n";
    as_(null); ok((call(['p_op' => 'list'])['status'] ?? 0) === 401, 'U1 Người lạ không xem được danh sách tài khoản');
    as_($staffUser); ok((call(['p_op' => 'list'])['status'] ?? 0) === 403, 'U2 Nhân viên vận hành không quản lý được tài khoản (chỉ quản trị viên)');
    as_($admin);
    ok(in_array($admin['id'], array_column(call(['p_op' => 'list'])['ok'], 'id'), true), 'U3 Quản trị viên xem được danh sách tài khoản nhân viên');

    echo "--- Tạo tài khoản nhân viên\n";
    $phones[] = $ph = phoneNo(3);
    $new = call(['p_op' => 'create', 'p_name' => 'Kế toán Lan', 'p_phone' => $ph, 'p_email' => "$p@vidu.vn", 'p_role' => 'accountant', 'p_password' => 'KeToan!2026']);
    ok(isset($new['ok']) && $new['ok']['role'] === 'accountant' && $new['ok']['created_by_name'] === 'QA Admin chính', 'U4 Tạo tài khoản kế toán, ghi người tạo');
    $made[] = $new['ok']['id'];
    $hash = sql('SELECT password_hash FROM users WHERE phone=?', [$ph])->fetchColumn();
    ok($hash && password_verify('KeToan!2026', $hash) && !str_contains(json_encode(record('profiles', $new['ok']['id'])), 'KeToan'), 'U5 Mật khẩu được mã hóa, không lưu dạng chữ');
    ok((call(['p_op' => 'create', 'p_name' => 'Trùng', 'p_phone' => $ph, 'p_role' => 'staff', 'p_password' => 'MatKhau!2026'])['status'] ?? 0) === 409, 'U6 Không tạo trùng số điện thoại');
    ok(isset(call(['p_op' => 'create', 'p_name' => 'Yếu', 'p_phone' => phoneNo(4), 'p_role' => 'staff', 'p_password' => '123'])['error']), 'U7 Mật khẩu dưới 8 ký tự bị từ chối');
    ok(isset(call(['p_op' => 'create', 'p_name' => 'Lạ', 'p_phone' => phoneNo(5), 'p_role' => 'superadmin', 'p_password' => 'MatKhau!2026'])['error']), 'U8 Vai trò lạ bị từ chối');

    echo "--- Đổi vai trò, đặt lại mật khẩu, khóa\n";
    $r = call(['p_op' => 'set_role', 'p_id' => $new['ok']['id'], 'p_role' => 'sales']);
    ok(($r['ok']['role'] ?? '') === 'sales', 'U9 Đổi vai trò kế toán → kinh doanh');
    ok(isset(call(['p_op' => 'set_role', 'p_id' => $admin['id'], 'p_role' => 'staff'])['error']), 'U10 Không tự hạ quyền của chính mình');
    ok(isset(call(['p_op' => 'lock', 'p_id' => $admin['id']])['error']), 'U11 Không tự khóa chính mình');
    call(['p_op' => 'set_password', 'p_id' => $new['ok']['id'], 'p_password' => 'MoiDoi!2026']);
    ok(password_verify('MoiDoi!2026', sql('SELECT password_hash FROM users WHERE phone=?', [$ph])->fetchColumn()), 'U12 Đặt lại mật khẩu nhân viên');
    $lockedOne = record('profiles', $new['ok']['id']);
    as_($lockedOne); ok(actor() !== null, 'U13 Nhân viên đang đăng nhập bình thường');
    as_($admin); call(['p_op' => 'lock', 'p_id' => $new['ok']['id']]);
    as_($lockedOne); ok(actor() === null, 'U14 Khóa tài khoản: phiên đang mở mất quyền ngay');
    as_($admin); call(['p_op' => 'unlock', 'p_id' => $new['ok']['id']]);
    as_($lockedOne); ok(actor() !== null, 'U15 Mở khóa: đăng nhập dùng lại được');

    echo "--- Cấp quyền cho tài khoản khách có sẵn & luôn còn quản trị viên\n";
    as_($admin);
    $phones[] = $cph = phoneNo(6);
    $cid = bin2hex(random_bytes(16));
    sql('INSERT INTO users(id,phone,email,password_hash) VALUES(?,?,NULL,?)', [$cid, $cph, password_hash('Khach!2026', PASSWORD_DEFAULT)]);
    put('profiles', ['id' => $cid, 'phone' => $cph, 'name' => 'Khách thành nhân viên', 'role' => 'customer'], true); $made[] = $cid;
    ok((call(['p_op' => 'grant', 'p_phone' => $cph, 'p_role' => 'staff'])['ok']['role'] ?? '') === 'staff', 'U16 Cấp vai trò nhân viên cho tài khoản khách đã đăng ký');
    // Chỉ còn 1 quản trị viên đang hoạt động → không hạ quyền / khóa được
    $others = array_filter(allRecords('profiles'), fn($x) => ($x['role'] ?? '') === 'admin' && empty($x['locked']) && $x['id'] !== $admin['id']);
    foreach ($others as $o) { $o['locked'] = true; put('profiles', $o); }
    $second = call(['p_op' => 'create', 'p_name' => 'Admin phụ', 'p_phone' => $phones[] = phoneNo(7), 'p_role' => 'admin', 'p_password' => 'AdminPhu!2026'])['ok']; $made[] = $second['id'];
    as_(record('profiles', $second['id']));
    ok(isset(call(['p_op' => 'set_role', 'p_id' => $admin['id'], 'p_role' => 'staff'])['ok']), 'U17 Admin phụ hạ quyền được admin chính khi vẫn còn quản trị viên khác');
    as_(record('profiles', $second['id']));
    $self = call(['p_op' => 'set_role', 'p_id' => $second['id'], 'p_role' => 'staff']);
    ok(isset($self['error']), 'U18 Quản trị viên cuối cùng không bị hạ quyền / khóa (hệ thống luôn có người quản trị)');
    $_GET = ['id' => 'eq.' . $second['id']];
    try { dataEndpoint('profiles', 'PATCH', ['locked' => true]); } catch (HttpError $e) {}
    ok(empty(record('profiles', $second['id'])['locked']), 'U19 Không tự mở/khóa qua sửa hồ sơ trực tiếp');
    echo "--- Mốc thời gian & người thao tác\n";
    as_($staffUser);
    $rec = put('crm_customers', ['id' => "$p-crm", 'phone' => phoneNo(9), 'name' => 'Khách thử mốc thời gian'], true); $made2 = "$p-crm";
    ok($rec['created_at'] && $rec['updated_at'] && $rec['created_by_name'] === 'QA Vận hành', 'U20 Bản ghi mới lưu thời gian tạo + người tạo');
    as_($admin); sleep(1);
    $rec2 = put('crm_customers', array_merge(record('crm_customers', "$p-crm"), ['note' => 'sửa']));
    ok($rec2['created_at'] === $rec['created_at'] && $rec2['updated_at'] > $rec['updated_at'] && $rec2['created_by_name'] === 'QA Vận hành' && $rec2['updated_by_name'] === 'QA Admin chính', 'U21 Khi sửa: giữ thời gian/người tạo, cập nhật thời gian/người sửa');
    sql('DELETE FROM records WHERE resource=? AND record_id=?', ['crm_customers', $made2]);
    echo "Users MySQL: $checks checks passed.\n";
} finally {
    $_SESSION = [];
    // Mở lại các quản trị viên thật đã tạm khóa trong bài thử
    foreach ($others as $o) { $o['locked'] = false; put('profiles', $o); }
    foreach ($made as $id) sql('DELETE FROM records WHERE resource=? AND record_id=?', ['profiles', $id]);
    foreach ($phones as $ph) sql('DELETE FROM users WHERE phone=?', [$ph]);
    sql("DELETE FROM records WHERE resource='profiles' AND record_id LIKE ?", ["$p%"]);
}
