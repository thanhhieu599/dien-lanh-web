#!/usr/bin/env bash
# Kiểm thử Edge Functions bằng Node 22 (chạy thẳng TypeScript, không cần Deno).
# Kiểm thử end-to-end cần PostgreSQL: PGHOST=localhost PGUSER=postgres PGPASSWORD=... ./supabase/functions/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
files=(unit.test.ts)
if [ -n "${PGHOST:-}" ]; then
  ../../tests/run-local.sh dt_e2e > /dev/null
  files+=(e2e.test.ts)
fi
exec node --experimental-strip-types --no-warnings --test --test-reporter=spec "${files[@]}"
