<?php
declare(strict_types=1);
// Sao chép thành config.local.php. File này không được đưa lên Git.
return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_NAME') ?: 'dien_lanh',
    'username' => getenv('DB_USER') ?: 'dien_lanh',
    'password' => getenv('DB_PASSWORD') ?: '',
    'secure_cookies' => getenv('APP_ENV') !== 'development',
];
