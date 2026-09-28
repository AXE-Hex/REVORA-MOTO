# Database

Migrations in `supabase/migrations` are append-only and currently run from `202609270001_core.sql` through `202609270022_admin_visibility_settings.sql`. They define customer data, catalog and variants, motorcycles/fitment/garage, carts/orders/reservations/payments, staff RBAC, stock locations and movements, suppliers/purchase orders, promotions, returns/refunds, warranties, notifications/outbox and reporting.

Migrations `009`–`011` add promotions, service cases and location operations. `012`–`021` add active garage, sales transitions, stock reconciliation, history visibility, reports, email outbox, zero-stock rows, staff catalog/vehicle policies and staff management. `022` adds a permission-gated customer directory and safe site settings RPC. Do not edit applied migrations; add a new migration for future schema changes.

Security-definer RPCs recalculate or verify prices, discounts, stock and deposits in the database. `place_order` snapshots item price and variant attributes. `reserve_motorcycle` locks the motorcycle and prevents conflicting active reservations. Payment capture needs a signed, matching event handled by the service role. Inventory adjustments, transfers, purchases and receiving write immutable movements. Returns/warranty claims and staff role changes use permission-checked RPCs.

RLS scopes customer rows and staff operations; column grants hide cost and VIN. `email_outbox` is not a mail service: it queues rows for a future worker. `refund_requests` never represent a completed external transfer without a provider.

Run `supabase start`, then `supabase db reset --local` for migrations and demo seed. `bash tool/test_db.sh` executes eleven rolled-back SQL suites. **Never run `supabase/seed.sql` in production.**

The cloud development project is linked and has migrations `001`–`022` applied without seed data. See `CLOUD_SETUP.md` for its status and remaining setup.
