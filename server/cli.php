<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/shop.php';
$command = $argv[1] ?? '';
if ($command === 'migrate') {
    db()->exec(file_get_contents(__DIR__ . '/schema.sql'));
    echo "Đã tạo schema MySQL.\n";
} elseif (in_array($command, ['seed', 'seed-test'], true)) {
    $isTest = $command === 'seed-test';
    $seed = json_decode(file_get_contents($argv[2] ?? __DIR__ . ($isTest ? '/seed-test.json' : '/seed.json')), true, 512, JSON_THROW_ON_ERROR);
    $inserted = 0;
    transaction(function() use ($seed, $isTest, &$inserted) {
        foreach ($seed as $table => $rows) {
            $allowed = ['products','categories','brands','coupons','posts','projects','faqs','banners','stores','services','policies','settings'];
            if ($isTest) $allowed = array_merge($allowed, ['profiles','crm_customers','orders','order_items','order_status_history','payments','leads','reviews','notifications','cart_reminders']);
            if (!in_array($table, $allowed, true)) continue;
            foreach ($rows as $row) if (!record($table, $row[pk($table)])) { put($table, $row, true); $inserted++; }
        }
        // Cài đặt cửa hàng còn thông tin MẪU (bản cũ) -> thay bằng thông tin thật trong seed.
        // Chỉ thay ô đang đúng bằng giá trị mẫu; ô admin đã tự sửa giữ nguyên.
        $store = record('settings', 'store', true);
        $real = array_values(array_filter($seed['settings'] ?? [], fn($r) => ($r['key'] ?? '') === 'store'))[0]['value'] ?? null;
        $samples = [
            'name' => ['Tên thương hiệu'], 'company' => ['TÊN CÔNG TY'], 'taxCode' => ['0300000000'], 'hotline' => ['1900 6868'],
            'hotlineB2B' => ['0909 000 000'], 'email' => ['email@tencongty.vn'], 'zalo' => ['https://zalo.me/0909000000'],
            'address' => ['TP. Hồ Chí Minh, Việt Nam'], 'bankName' => ['Vietcombank - CN TP.HCM'], 'bankBin' => ['970436'],
            'bankAccount' => ['0071000000000'], 'bankOwner' => ['TEN CONG TY'],
        ];
        if ($store && $real) {
            $fixed = [];
            foreach ($samples as $k => $old) {
                $cur = $store['value'][$k] ?? '';
                if (($cur === '' || in_array($cur, $old, true)) && ($real[$k] ?? '') !== '' && !in_array($real[$k], $old, true)) { $store['value'][$k] = $real[$k]; $fixed[] = $k; }
            }
            // Tài khoản ngân hàng đổi cả bộ để không lệch (tên ngân hàng / mã BIN / số TK)
            if (array_intersect($fixed, ['bankAccount'])) foreach (['bankName','bankBin','bankAccount','bankOwner'] as $k) $store['value'][$k] = $real[$k] ?? '';
            if ($fixed) { put('settings', $store); echo 'Đã cập nhật thông tin cửa hàng còn để mẫu: ' . implode(', ', $fixed) . ".\n"; }
        }
    });
    echo "Đã thêm {$inserted} bản ghi mẫu; giữ nguyên bản ghi đã có.\n";
} elseif ($command === 'create-admin') {
    $phone = phoneKey($argv[2] ?? '');
    $name = trim($argv[3] ?? 'Quản trị viên');
    if (!preg_match('/^0[0-9]{9,10}$/', $phone) || $name === '') {
        fwrite(STDERR, "Cách dùng: php server/cli.php create-admin <phone> [name]\n"); exit(1);
    }
    if (sql('SELECT id FROM users WHERE phone=?', [$phone])->fetchColumn()) {
        fwrite(STDERR, "Số điện thoại đã tồn tại. Không thay đổi tài khoản hiện có.\n"); exit(1);
    }
    // Không truyền mật khẩu qua tham số dòng lệnh hoặc lưu vào lịch sử shell.
    if (!function_exists('stream_isatty') || !stream_isatty(STDIN) || PHP_OS_FAMILY === 'Windows') {
        fwrite(STDERR, "Hãy chạy trong terminal tương tác (Docker: docker compose exec web php server/cli.php create-admin <phone>).\n"); exit(1);
    }
    $terminalMode = exec('stty -g', $terminalOutput, $terminalStatus);
    if ($terminalStatus !== 0 || !$terminalMode) {
        fwrite(STDERR, "Không thể bật chế độ nhập mật khẩu ẩn.\n"); exit(1);
    }
    exec('stty -echo', $hideOutput, $hideStatus);
    if ($hideStatus !== 0) { fwrite(STDERR, "Không thể ẩn mật khẩu.\n"); exit(1); }
    try {
        fwrite(STDOUT, "Mật khẩu (8–72 byte, nhập ẩn): ");
        $password = rtrim((string)fgets(STDIN), "\r\n");
        fwrite(STDOUT, "\nNhập lại mật khẩu: ");
        $confirmation = rtrim((string)fgets(STDIN), "\r\n");
    } finally {
        exec('stty ' . escapeshellarg($terminalMode));
        fwrite(STDOUT, "\n");
    }
    if (strlen($password) < 8 || strlen($password) > 72 || $password !== $confirmation) {
        fwrite(STDERR, "Mật khẩu phải dài 8–72 byte và hai lần nhập phải khớp.\n"); exit(1);
    }
    transaction(function() use ($phone, $name, $password) {
        $id = bin2hex(random_bytes(16));
        sql('INSERT INTO users(id,phone,email,password_hash) VALUES(?,?,NULL,?)', [$id, $phone, password_hash($password, PASSWORD_DEFAULT)]);
        put('profiles', ['id'=>$id, 'phone'=>$phone, 'email'=>'', 'name'=>$name, 'addresses'=>[], 'role'=>'admin'], true);
    });
    echo "Đã tạo tài khoản quản trị nội bộ cho {$phone}. Đăng nhập tại /admin/.\n";
} elseif ($command === 'admin') {
    $phone = phoneKey($argv[2] ?? '');
    $id = sql('SELECT id FROM users WHERE phone=?', [$phone])->fetchColumn();
    if (!$id) throw new RuntimeException('Hãy đăng ký tài khoản trên website trước.');
    $profile = record('profiles', $id); $profile['role'] = 'admin'; put('profiles', $profile);
    echo "Đã cấp quyền quản trị cho {$phone}.\n";
} elseif ($command === 'cleanup') {
    sql('DELETE FROM rate_limits WHERE expires_at < ?', [time()]);
    echo "Đã dọn bộ đếm hết hạn.\n";
} else {
    fwrite(STDERR, "php server/cli.php migrate|seed [file]|seed-test [file]|create-admin <phone> [name]|admin <phone>|cleanup\n"); exit(1);
}
