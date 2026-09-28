# Testing

Run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `bash tool/test_db.sh`, `npm run test:e2e` and `npm run build`. Build after Playwright stops the Next.js dev server because both use `.next`.

There are three Vitest unit tests for payment behavior and JSON-LD safety. Eleven SQL transaction suites (`active_garage`, `admin_visibility_settings`, `catalog_admin`, `core`, `inventory_operations`, `notifications`, `promotions`, `returns_warranty`, `sales_reporting`, `staff_management`, `vehicle_admin`) test RLS/permissions, stock and price invariants, coupon limits, payment guards, cases, reporting and staff actions. The runner checks each ends in `ROLLBACK`. Use only a local Supabase instance.

Five Playwright Firefox tests exercise public bilingual catalog/compare/product variant and a customer sign-up/login, address, cart, checkout, pending order, reservation, fitment and active garage flow, catalog pagination, gallery controls and safe demo JSON-LD. The `npm run test:e2e` wrapper forces the local Supabase target, even when `.env.local` points to the cloud. They create local Auth and transactional records. Reset the local database before repeating tests that reserve the same demo motorcycle.

Additional release coverage is needed for verified review through the browser, admin login/stock/order/reservation flows, OAuth, provider sandbox/refunds, email delivery, accessibility/mobile, full RLS matrix and concurrency/expiration jobs. Passing these current tests is not release sign-off.
