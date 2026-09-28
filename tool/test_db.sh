#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for sql_file in supabase/tests/*.sql; do
  if ! podman exec -i supabase_db_Web psql -U postgres -d postgres --no-psqlrc --set ON_ERROR_STOP=1 < "$sql_file" > /tmp/revora-db-test-output.log; then
    cat /tmp/revora-db-test-output.log
    echo "FAIL $sql_file"
    exit 1
  fi
  if ! tail -n 1 /tmp/revora-db-test-output.log | rg -qx ROLLBACK; then
    echo "FAIL $sql_file: transaction did not roll back"
    exit 1
  fi
  echo "PASS $sql_file"
done
