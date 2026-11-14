<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/data.php';
require __DIR__ . '/shop.php';

try {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', '28800');
    session_name('dt_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => config()['secure_cookies'], 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (isset($_SESSION['expires_at']) && $_SESSION['expires_at'] < time()) $_SESSION = [];
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, ['GET','POST','PATCH','DELETE'], true)) fail('Phương thức không hỗ trợ', 405);
    if ($method !== 'GET') requireMutation();
    $route = trim($_GET['route'] ?? '', '/');
    if ($route === 'health' && $method === 'GET') { sql('SELECT 1'); jsonResponse(['ok' => true, 'database' => 'mysql']); }
    // Phiên bản dữ liệu công khai: website so với bản lưu tạm để thấy ngay giá / tồn kho / nội dung admin vừa sửa
    if ($route === 'version' && $method === 'GET') {
        $row = sql("SELECT COUNT(*), MAX(JSON_UNQUOTE(JSON_EXTRACT(data,'$.updated_at'))) FROM records WHERE resource IN ('settings','categories','brands','products','stores','posts','banners','services','policies','coupons','projects','faqs')")->fetch(PDO::FETCH_NUM);
        header('Cache-Control: no-store');
        jsonResponse(['version' => $row[0] . ':' . ($row[1] ?? '')]);
    }

    if (str_starts_with($route, 'media/')) {
        $path = substr($route, 6);
        if (!preg_match('#^(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp|gif)$#D', $path) || str_contains($path, '..')) fail('Tên ảnh không hợp lệ');
        $file = __DIR__ . '/uploads/' . $path;
        if ($method === 'GET') {
            if (!is_file($file)) fail('Không tìm thấy ảnh', 404);
            header('Content-Type: ' . (new finfo(FILEINFO_MIME_TYPE))->file($file));
            header('X-Content-Type-Options: nosniff'); header('Cache-Control: public, max-age=86400');
            readfile($file); exit;
        }
        $user = staff();
        if (!in_array($user['role'], ['admin','staff'], true) || str_starts_with($path, 'vision/') && $user['role'] !== 'admin') fail('Không có quyền tải ảnh', 403);
        if ($method === 'DELETE') { if (is_file($file)) unlink($file); jsonResponse(null); }
        if ($method !== 'POST') fail('Phương thức không hỗ trợ', 405);
        $bytes = file_get_contents('php://input', false, null, 0, 8 * 1024 * 1024 + 1);
        if (!$bytes || strlen($bytes) > 8 * 1024 * 1024) fail('Ảnh tối đa 8 MB', 413);
        $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        $expected = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif'][pathinfo($path, PATHINFO_EXTENSION)] ?? '';
        if ($mime !== $expected || !getimagesizefromstring($bytes)) fail('Định dạng ảnh không hợp lệ');
        if (!is_dir(dirname($file))) mkdir(dirname($file), 0755, true);
        if (file_put_contents($file, $bytes, LOCK_EX) === false) fail('Không lưu được ảnh', 500);
        jsonResponse(['path' => $path], 201);
    }

    $input = file_get_contents('php://input', false, null, 0, 1024 * 1024 + 1);
    if (strlen($input) > 1024 * 1024) fail('Yêu cầu quá lớn', 413);
    $body = $input === '' ? [] : json_decode($input, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($body)) fail('Dữ liệu JSON không hợp lệ');
    if (str_starts_with($route, 'auth/')) {
        if ($route === 'auth/session' && $method === 'GET') {
            $user = actor();
            jsonResponse($user ? ['access_token'=>'cookie', 'expires_in'=>max(0, $_SESSION['expires_at'] - time()), 'user'=>['id'=>$user['id']]] : null);
        }
        if ($method !== 'POST') fail('Phương thức không hỗ trợ', 405);
        $action = substr($route, 5);
        if ($action === 'logout') { $_SESSION = []; session_regenerate_id(true); jsonResponse(null); }
        if ($action === 'refresh') {
            $user = actor(); if (!$user) fail('Phiên đăng nhập hết hạn', 401);
            jsonResponse(['access_token' => 'cookie', 'expires_in' => max(0, $_SESSION['expires_at'] - time()), 'user' => ['id' => $user['id']]]);
        }
        if (!in_array($action, ['login','signup'], true)) fail('Không tìm thấy chức năng', 404);
        rateLimit('auth', 20);
        $password = $body['password'] ?? '';
        $identifier = trim($body['phone'] ?? $body['email'] ?? '');
        $identifier = str_contains($identifier, '@') ? $identifier : phoneKey($identifier);
        if (!is_string($password) || strlen($password) < 8) fail('Mật khẩu cần ít nhất 8 ký tự');
        if (strlen($password) > 72) fail('Mật khẩu quá dài (tối đa 72 byte UTF-8)');
        if ($action === 'signup') {
            $data = $body['data'] ?? [];
            $phone = phoneKey($data['phone'] ?? $identifier);
            $email = trim($data['contact_email'] ?? '');
            if (!preg_match('/^0[0-9]{9,10}$/', $phone) || empty($data['name']) || $email && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Thông tin tài khoản không hợp lệ');
            $user = transaction(function() use ($phone, $email, $password, $data) {
                $id = bin2hex(random_bytes(16));
                sql('INSERT INTO users(id,phone,email,password_hash) VALUES(?,?,?,?)', [$id, $phone, $email ?: null, password_hash($password, PASSWORD_DEFAULT)]);
                // Khách từng mua hàng bằng số này (hồ sơ khách vãng lai): gắn tài khoản vào hồ sơ cũ, giữ lịch sử mua
                $crm = record('crm_customers', 'phone:' . $phone, true);
                if (!$crm) put('crm_customers', ['id'=>'phone:' . $phone, 'profile_id'=>$id, 'phone'=>$phone, 'email'=>$email, 'name'=>trim($data['name']), 'addresses'=>[], 'tags'=>[], 'marketing_opt_in'=>false, 'registered_at'=>now()], true);
                else put('crm_customers', array_merge($crm, ['profile_id'=>$id, 'registered_at'=>now(), 'email'=>($crm['email'] ?? '') ?: $email, 'name'=>($crm['name'] ?? '') ?: trim($data['name'])]));
                return put('profiles', ['id'=>$id, 'phone'=>$phone, 'email'=>$email, 'name'=>trim($data['name']), 'addresses'=>[], 'role'=>'customer'], true);
            });
        } else {
            $account = sql('SELECT * FROM users WHERE phone=? OR email=? LIMIT 1', [$identifier, $identifier])->fetch(PDO::FETCH_ASSOC);
            // Cùng chi phí hash khi tài khoản không tồn tại để tránh dò danh sách tài khoản theo thời gian.
            $hash = $account['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
            if (!password_verify($password, $hash) || !$account) fail('Sai số điện thoại hoặc mật khẩu', 401);
            if (password_needs_rehash($account['password_hash'], PASSWORD_DEFAULT)) sql('UPDATE users SET password_hash=? WHERE id=?', [password_hash($password, PASSWORD_DEFAULT), $account['id']]);
            $user = record('profiles', $account['id']);
            if (!$user) fail('Không tìm thấy hồ sơ tài khoản', 401);
            if (!empty($user['locked'])) fail('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
        }
        session_regenerate_id(true); $_SESSION['user_id'] = $user['id']; $_SESSION['expires_at'] = time() + 28800;
        // Lần đăng nhập / đăng ký gần nhất: ghi thẳng, không đổi "thời gian sửa" của hồ sơ
        try {
            $count = (int)(record('profiles', $user['id'])['login_count'] ?? 0) + 1;
            sql("UPDATE records SET data=JSON_SET(data,'$.last_login_at',?,'$.login_count',CAST(? AS UNSIGNED)) WHERE resource='profiles' AND record_id=?", [now(), $count, $user['id']]);
        } catch (Throwable $e) { error_log('login stats: ' . $e->getMessage()); }
        jsonResponse(['access_token'=>'cookie', 'expires_in'=>28800, 'user'=>['id'=>$user['id']]]);
    }
    if (str_starts_with($route, 'data/')) jsonResponse(dataEndpoint(substr($route, 5), $method, $body));
    if (str_starts_with($route, 'rpc/') && $method === 'POST') jsonResponse(rpcEndpoint(substr($route, 4), $body));
    fail('Không tìm thấy API', 404);
} catch (HttpError $e) {
    jsonResponse(['message'=>$e->getMessage(), 'error'=>$e->getMessage()], $e->getCode() ?: 400);
} catch (JsonException $e) {
    jsonResponse(['message'=>'JSON không hợp lệ'], 400);
} catch (TypeError|ValueError $e) {
    // Dữ liệu gửi lên sai kiểu (mảng thay vì chuỗi...): từ chối gọn, không coi là lỗi máy chủ.
    error_log('Bad input: ' . $e->getMessage());
    jsonResponse(['message'=>'Dữ liệu gửi lên không hợp lệ', 'error'=>'Dữ liệu gửi lên không hợp lệ'], 400);
} catch (PDOException $e) {
    error_log((string)$e);
    jsonResponse(['message'=>$e->getCode() === '23000' ? 'Mã, SKU, đường dẫn hoặc tài khoản đã tồn tại' : 'Không kết nối được dữ liệu. Vui lòng kiểm tra cấu hình máy chủ.'], $e->getCode() === '23000' ? 409 : 503);
} catch (Throwable $e) {
    error_log((string)$e);
    jsonResponse(['message'=>'Lỗi máy chủ. Vui lòng thử lại sau.'], 500);
}
