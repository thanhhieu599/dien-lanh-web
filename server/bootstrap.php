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
    echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function pk(string $table): string {
    return ['coupons' => 'code', 'posts' => 'slug', 'projects' => 'slug', 'policies' => 'key', 'settings' => 'key'][$table] ?? 'id';
}
function tables(): array {
    return explode(',', 'settings,categories,brands,products,stores,posts,banners,services,policies,coupons,profiles,orders,order_items,order_status_history,leads,reviews,payments,notifications,projects,faqs,crm_customers,cart_reminders,maintenance_contracts,maintenance_visits');
}
function record(string $table, mixed $id, bool $lock = false): ?array {
    $row = sql('SELECT data FROM records WHERE resource=? AND record_id=?' . ($lock ? ' FOR UPDATE' : ''), [$table, (string)$id])->fetchColumn();
    return $row === false ? null : json_decode($row, true, 512, JSON_THROW_ON_ERROR);
}
function allRecords(string $table): array {
    return array_map(fn($row) => json_decode($row, true, 512, JSON_THROW_ON_ERROR), sql('SELECT data FROM records WHERE resource=?', [$table])->fetchAll(PDO::FETCH_COLUMN));
}
function put(string $table, array $row, bool $insert = false): array {
    $key = pk($table);
    $row[$key] ??= (int)(microtime(true) * 1000) * 1000 + random_int(0, 999);
    if (!is_scalar($row[$key]) || strlen((string)$row[$key]) > 191 || (string)$row[$key] === '') fail('Mã bản ghi không hợp lệ');
    $row['created_at'] ??= now();
    $row['updated_at'] = now();
    $encoded = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
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
    return isset($_SESSION['user_id']) ? record('profiles', $_SESSION['user_id']) : null;
}
function staff(): array {
    $user = actor();
    if (!$user) fail('Vui lòng đăng nhập', 401);
    if (!in_array($user['role'], ['admin', 'staff', 'sales', 'accountant'], true)) fail('Không có quyền truy cập', 403);
    return $user;
}
function rateLimit(string $action, int $max = 30): void {
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
