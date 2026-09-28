import { defineConfig, devices } from '@playwright/test';

if (
  process.env.E2E_SUPABASE_TARGET !== 'local' ||
  !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  )
) {
  throw new Error(
    'Playwright must run against local Supabase via npm run test:e2e',
  );
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  timeout: 90000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    ...devices['Desktop Firefox'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node ./node_modules/next/dist/bin/next dev --port 3100',
    url: 'http://127.0.0.1:3100/en',
    env: { NEXT_DIST_DIR: '.next-e2e' },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
