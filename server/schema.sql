-- MySQL 8.4+ / 9.7 LTS, InnoDB + utf8mb4.
-- Giữ nguyên mô hình row của frontend/admin; dữ liệu mở rộng nằm trong JSON.
CREATE TABLE IF NOT EXISTS records (
  resource VARCHAR(40) CHARACTER SET ascii NOT NULL,
  record_id VARCHAR(191) NOT NULL,
  data JSON NOT NULL,
  product_sku VARCHAR(191) GENERATED ALWAYS AS
    (CASE WHEN resource = 'products' THEN JSON_UNQUOTE(JSON_EXTRACT(data, '$.sku')) ELSE NULL END) STORED,
  product_slug VARCHAR(191) GENERATED ALWAYS AS
    (CASE WHEN resource = 'products' THEN JSON_UNQUOTE(JSON_EXTRACT(data, '$.slug')) ELSE NULL END) STORED,
  phone VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.phone'))) STORED,
  status VARCHAR(32) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, '$.status'))) STORED,
  PRIMARY KEY (resource, record_id),
  UNIQUE KEY product_sku_unique (product_sku),
  UNIQUE KEY product_slug_unique (product_slug),
  KEY resource_phone (resource, phone),
  KEY resource_status (resource, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(32) CHARACTER SET ascii PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(191) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket CHAR(64) CHARACTER SET ascii PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at BIGINT UNSIGNED NOT NULL,
  KEY expiry (expires_at)
) ENGINE=InnoDB;
