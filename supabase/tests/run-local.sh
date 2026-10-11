#!/usr/bin/env bash
# Chạy toàn bộ migrations + seed + kiểm thử trên PostgreSQL cục bộ.
# Dùng: PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run-local.sh [tên_db]
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${1:-dt_test}"
dropdb --if-exists "$DB"
createdb "$DB"
for f in supabase/tests/auth_stub.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/smoke.sql supabase/tests/phase4.sql supabase/tests/fixes.sql supabase/tests/sales.sql supabase/tests/trust.sql supabase/tests/ops.sql; do
  echo "== $f"
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f" 2>&1 | grep -E "NOTICE|ERROR|DETAIL|CONTEXT" || true
done
