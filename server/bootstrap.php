<?php
declare(strict_types=1);

function config(): array {
    static $config;
    return $config ??= require __DIR__ . (is_file(__DIR__ . '/config.local.php') ? '/config.local.php' : '/config.example.php');
}
function db(): PDO {
    static $db;
    if (!$db) {
        $c = config();
        $db = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4", $c['username'], $c['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $db;
}
function sql(string $query, array $args = []): PDOStatement {
    $s = db()->prepare($query);
    $s->execute($args);
    return $s;
}
function fail(string $message, int $status = 400): never {
    throw new HttpError($message, $status);
}
class HttpError extends RuntimeException {}
function jsonResponse(mixed $value, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header_remove('X-Powered-By');
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
// ===== Bộ nhớ đệm dữ liệu công khai (chịu tải nhiều khách xem cùng lúc) =====
// Danh mục, sản phẩm, bài viết… giống nhau với mọi khách: lưu kết quả ra file tạm, khách sau đọc file, không mở MySQL.
// Mọi thao tác ghi vào các bảng này đổi "thế hệ" bộ đệm → dữ liệu cũ bỏ ngay. Thêm hạn 60 giây phòng sửa thẳng DB.
const PUBLIC_TABLES = ['settings','categories','brands','products','stores','posts','banners','services','policies','coupons','projects','faqs'];
function cacheDir(): ?string {
    static $dir;
    if ($dir === null) {
        $path = sys_get_temp_dir() . '/dt-cache-' . substr(hash('sha256', __DIR__ . '|' . (config()['database'] ?? '')), 0, 16);
        if (!is_dir($path)) @mkdir($path, 0700, true);
        $dir = is_dir($path) && is_writable($path) ? $path : '';
    }
    return $dir ?: null;
}
function cacheGen(): string {
    $dir = cacheDir(); if (!$dir) return '';
    $gen = @file_get_contents("$dir/gen");
    if ($gen === false || $gen === '') { $gen = bin2hex(random_bytes(8)); @file_put_contents("$dir/gen", $gen, LOCK_EX); }
    return $gen;
}
// Đổi số này khi thay đổi cách lọc dữ liệu công khai để bỏ bộ đệm cũ ngay khi cập nhật code
const CACHE_SCHEMA = '1';
function cacheFile(string $key): ?string { $dir = cacheDir(); return $dir ? "$dir/" . hash('sha256', CACHE_SCHEMA . '|' . filemtime(__FILE__) . '|' . @filemtime(__DIR__ . '/data.php') . '|' . cacheGen() . '|' . $key) : null; }
function cacheGet(string $key, int $ttl): ?string {
    $f = cacheFile($key);
    if (!$f || !is_file($f) || filemtime($f) < time() - $ttl) return null;
    $v = @file_get_contents($f);
    return $v === false ? null : $v;
}
function cachePut(string $key, string $value): void {
    $f = cacheFile($key); if (!$f) return;
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $value) !== false) @rename($tmp, $f);
    // Thỉnh thoảng dọn file cũ của các thế hệ trước
    if (random_int(1, 200) === 1) foreach (glob(dirname($f) . '/*') ?: [] as $old) if (basename($old) !== 'gen' && @filemtime($old) < time() - 300) @unlink($old);
}
function bumpPublic(string $table): void {
    static $registered = false;
    if (!in_array($table, PUBLIC_TABLES, true) || !($dir = cacheDir())) return;
    @file_put_contents("$dir/gen", bin2hex(random_bytes(8)), LOCK_EX);
    // Đổi thêm lần nữa khi kết thúc request (sau khi giao dịch đã ghi xong) để không giữ dữ liệu đọc lúc chưa commit
    if (!$registered) { $registered = true; register_shutdown_function(fn() => @file_put_contents("$dir/gen", bin2hex(random_bytes(8)), LOCK_EX)); }
}
function pk(string $table): string {
    return ['coupons' => 'code', 'posts' => 'slug', 'projects' => 'slug', 'policies' => 'key', 'settings' => 'key'][$table] ?? 'id';
}
function tables(): array {
    return explode(',', 'settings,categories,brands,products,stores,posts,banners,services,policies,coupons,profiles,orders,order_items,order_status_history,leads,reviews,payments,notifications,projects,faqs,crm_customers,cart_reminders,maintenance_contracts,maintenance_visits,suppliers,purchase_orders,stock_adjustments,stock_exports,stock_moves');
}
function record(string $table, mixed $id, bool $lock = false): ?array {
    $row = sql('SELECT data FROM records WHERE resource=? AND record_id=?' . ($lock ? ' FOR UPDATE' : ''), [$table, (string)$id])->fetchColumn();
    return $row === false ? null : json_decode($row, true, 512, JSON_THROW_ON_ERROR);
}
function allRecords(string $table): array {
    return array_map(fn($row) => json_decode($row, true, 512, JSON_THROW_ON_ERROR), sql('SELECT data FROM records WHERE resource=?', [$table])->fetchAll(PDO::FETCH_COLUMN));
}
function currentUserName(): ?string {
    static $cache = [];
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) return null;
    if (!array_key_exists($id, $cache)) {
        $data = sql("SELECT data FROM records WHERE resource='profiles' AND record_id=?", [(string)$id])->fetchColumn();
        $p = $data ? json_decode($data, true) : null;
        $cache[$id] = $p ? (string)($p['name'] ?? $p['phone'] ?? '') : null;
    }
    return $cache[$id] ?: null;
}
function put(string $table, array $row, bool $insert = false): array {
    $key = pk($table);
    $row[$key] ??= (int)(microtime(true) * 1000) * 1000 + random_int(0, 999);
    if (!is_scalar($row[$key]) || strlen((string)$row[$key]) > 191 || (string)$row[$key] === '') fail('Mã bản ghi không hợp lệ');
    $row['created_at'] ??= now();
    $row['updated_at'] = now();
    // Ai tạo / ai sửa lần cuối (nhân viên hoặc khách đang đăng nhập) để tra cứu về sau
    if ($by = currentUserName()) {
        $row['created_by_name'] ??= $by;
        $row['updated_by_name'] = $by;
    }
    $encoded = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    bumpPublic($table);
    if (!$insert && record($table, $row[$key]) !== null) {
        sql('UPDATE records SET data=? WHERE resource=? AND record_id=?', [$encoded, $table, (string)$row[$key]]);
    } else {
        sql('INSERT INTO records(resource,record_id,data) VALUES(?,?,?)', [$table, (string)$row[$key], $encoded]);
    }
    return $row;
}
function transaction(callable $fn): mixed {
    db()->beginTransaction();
    try { $value = $fn(); db()->commit(); return $value; }
    catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); throw $e; }
}
function actor(): ?array {
    // Tài khoản bị khóa: mất quyền ngay ở lần gọi kế tiếp, kể cả phiên đang đăng nhập
    $p = isset($_SESSION['user_id']) ? record('profiles', $_SESSION['user_id']) : null;
    return $p && empty($p['locked']) ? $p : null;
}
function staff(): array {
    $user = actor();
    if (!$user) fail('Vui lòng đăng nhập', 401);
    if (!in_array($user['role'], ['admin', 'staff', 'sales', 'accountant'], true)) fail('Không có quyền truy cập', 403);
    return $user;
}
function rateLimit(string $action, int $max = 30): void {
    // Môi trường thử nghiệm (docker-compose) nới giới hạn để chạy nhiều bài test liền nhau; hosting thật giữ nguyên
    $max *= max(1, (int)(getenv('RATE_LIMIT_MULTIPLIER') ?: 1));
    $bucket = hash('sha256', $action . ($_SERVER['REMOTE_ADDR'] ?? 'cli') . intdiv(time(), 300));
    sql('INSERT INTO rate_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON DUPLICATE KEY UPDATE attempts=attempts+1', [$bucket, time() + 300]);
    if ((int)sql('SELECT attempts FROM rate_limits WHERE bucket=?', [$bucket])->fetchColumn() > $max) fail('Bạn thao tác quá nhanh. Vui lòng thử lại sau 5 phút.', 429);
}
function requireMutation(): void {
    // Cùng origin + header JSON riêng: trình duyệt ngoài website không thể gửi yêu cầu ghi.
    if (($_SERVER['HTTP_X_DT_REQUEST'] ?? '') !== '1') fail('Yêu cầu không hợp lệ', 403);
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = parse_url($_SERVER['HTTP_ORIGIN']);
        $expected = ($_SERVER['HTTPS'] ?? '') === 'on' ? 'https' : 'http';
        if (($origin['scheme'] ?? '') !== $expected ||
            (($origin['host'] ?? '') . (isset($origin['port']) ? ':' . $origin['port'] : '')) !== ($_SERVER['HTTP_HOST'] ?? '')) fail('Nguồn yêu cầu không hợp lệ', 403);
    }
}
