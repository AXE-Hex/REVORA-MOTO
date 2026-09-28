"""Run Playwright against local Supabase even if .env.local targets the cloud."""

import os
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

CLI = os.environ.get('SUPABASE_CLI') or shutil.which('supabase')
if not CLI:
    fallback = Path('/home/axe/node_modules/@supabase/cli-linux-x64/bin/supabase')
    CLI = str(fallback) if fallback.exists() else None
if not CLI:
    print('Supabase CLI is not installed or SUPABASE_CLI is unset.', file=sys.stderr)
    sys.exit(2)
result = subprocess.run([CLI, 'status', '--output', 'env'], capture_output=True, text=True)
if result.returncode:
    print('Local Supabase is not running. Start it before E2E tests.', file=sys.stderr)
    sys.exit(result.returncode)

values = {}
for line in result.stdout.splitlines():
    if '=' in line:
        key, value = line.split('=', 1)
        values[key] = value.strip().strip('"').strip("'")

api_url = values.get('API_URL', '')
if urlparse(api_url).hostname not in ('localhost', '127.0.0.1') or not values.get('ANON_KEY'):
    print('Refusing E2E: local Supabase URL or anon key is missing.', file=sys.stderr)
    sys.exit(2)

env = os.environ.copy()
env.update({
    'NEXT_PUBLIC_SUPABASE_URL': api_url,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': values['ANON_KEY'],
    'SUPABASE_SERVICE_ROLE_KEY': values.get('SERVICE_ROLE_KEY', ''),
    'PAYMENT_PROVIDER': 'sandbox',
    'E2E_SUPABASE_TARGET': 'local',
})
runner = os.path.join(os.path.dirname(__file__), '..', 'node_modules', '.bin', 'playwright')
try:
    sys.exit(subprocess.run([runner, 'test', *sys.argv[1:]], env=env).returncode)
except KeyboardInterrupt:
    sys.exit(130)
