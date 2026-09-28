# REVORA MOTO UI/UX redesign progress

Updated 2026-09-28. Source specifications read in full: `REVORA_CODEX_MASTER_PROMPT.md` and `REVORA_UI_UX_AUDIT_AND_REDESIGN.md`. The confirmed authenticated audit in section 71 of the latter takes priority over earlier uncertainty. This document tracks implementation; it is not an acceptance claim.

## Current architecture

- Next.js 15 App Router, React 19, TypeScript, server components/actions and Supabase SSR.
- Localized route tree under `src/app/[locale]`. The middleware forwards a path-only request header for presentation layout selection; the localized layout suppresses storefront chrome on Admin URLs, and `src/app/[locale]/admin/layout.tsx` provides the permission-filtered Admin shell.
- Session refresh is performed in `src/middleware.ts`; server identity is retrieved with `auth.getUser()` in `src/lib/supabase/server.ts`. Server actions and RLS/RPCs remain authoritative.
- Shared UI currently lives in `src/components/`: catalog cards, auth, search, gallery, confirmations, cart, payment, reservation and wishlist controls. Most visual styling is still in one `src/app/globals.css` file.
- Shared fonts are bundled locally through `next/font/local` (Red Hat for English and Noto Sans Arabic). Semantic color, state, border and radius tokens now coexist with compatibility aliases while older screens are migrated.

## Affected routes

- Storefront: `/[locale]`, `/shop`, `/shop/[slug]`, `/motorcycles`, `/motorcycles/new`, `/motorcycles/used`, `/motorcycles/[slug]`, `/search`, `/fitment`, `/compare`, `/cart`, `/checkout`, `/reserve/[id]`.
- Customer: `/account` plus addresses, profile, orders, reservations, wishlist, garage, reviews, notifications, returns, warranties; order/reservation details and invoices.
- Admin: `/admin` plus products, motorcycles, categories, brands, fitment, orders, reservations, inventory, suppliers, customers, promotions, returns, warranties, reviews, staff, audit, settings and reports.
- Auth/system: `/auth`, `/auth/reset`, callback, payment/refund APIs, search suggestions and scheduled tasks.

## Shared components discovered

`cards.tsx`, `product-gallery.tsx`, `showroom-gallery.tsx`, `search-box.tsx`, `auth-form.tsx`, `empty.tsx`, `confirmation-form.tsx`, `confirm-submit.tsx`, `confirm-submit-button.tsx`, `sign-out.tsx`, `start-payment.tsx`, `start-refund.tsx`, `add-to-cart.tsx`, `reserve-button.tsx`, `wishlist-button.tsx`, `cart-remove.tsx`, `add-garage.tsx`.

Reusable foundations now include typed buttons and form fields, semantic StatusBadge/CommerceBadge/PriceBlock, date/number/currency formatters, a localized accessible toast provider, skeleton components and local font assets. Responsive dialog/sheet and some shared empty/error variants still need implementation or adoption.

## Auth/session architecture

`src/middleware.ts` refreshes Supabase SSR cookies for localized pages. `currentUser()` calls `auth.getUser()` and server routes/actions separately check staff permission through `has_permission`; database policies and security-definer functions provide the final authorization boundary. No auth or RLS weakening is part of the redesign. Existing admin routes often call `notFound()` when access is absent; authenticated forbidden UX will be reviewed without making private resources enumerable.

## Existing responsive breakpoints

Global CSS currently uses `1000px`, `760px`, and `420px`; gallery additionally uses `760px`. A new product-grid rule changes to one column through 480px. The responsive Admin navigation becomes horizontally scrollable below 900px. The redesign target review widths are 390px, <=480px, 481–760px, 761–1000px and desktop; visual checks at each width remain pending.

## Known issues from the confirmed audit

- Staff/Admin RTL and mixed-language actions/breadcrumbs; role removal styling and confirmation need a full route review.
- Product/Customer row actions are difficult to discover; Product/Motorcycle forms are long and single-column; inventory forms need overflow review.
- Dense Admin tables do not transform deliberately for mobile.
- Header icon grouping is being adjusted and verified in Arabic; all target viewport widths still need review.
- Existing catalog, cart, checkout, and customer order/reservation flows are preserved and covered by local E2E; layout redesign continues on those routes.

## Backend dependencies / constraints

- No new backend support is required for the first design-system phase.
- Actual payment provider remains unselected; the UI must continue to communicate pending/test state truthfully.
- Empty catalog and empty customer/order datasets are valid production states; use real database data only.
- Catalog media upload and private service-case evidence already have backend foundations but still need consistent editor UX; do not invent coverage, social links, stock labels or sale percentages absent from data.
- No database migration is planned for presentation-only work.

## Phases

| Phase | Scope                                                                                                                   | Status      |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1     | Audit and foundations: semantic tokens, radii, buttons, inputs, badges/status, typography, formatting, toast, skeletons | COMPLETE    |
| 2     | Global shell: header, mobile drawer, footer, navigation, empty/error/loading/success                                    | COMPLETE    |
| 3     | Commerce: listings, cards, search, details, compare, fitment, cart, checkout, reservations                              | IN PROGRESS |
| 4     | Customer account shell and customer journeys                                                                            | COMPLETE    |
| 5     | Dedicated permission-aware Admin shell and operational screens                                                          | IN PROGRESS |
| 6     | RTL/LTR, responsive, keyboard, accessibility, route/auth and visual QA                                                  | IN PROGRESS |

### Completed work

- Phase 1 foundation files: `src/app/globals.css`, `src/app/fonts.ts`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `fields.tsx`, `status-badge.tsx`, `commerce.tsx`, `skeletons.tsx`, `toast-provider.tsx`, `src/lib/format.ts`, and `src/lib/i18n.ts`.
- Existing real-data product cards now render status, price and promotion badges from the product fields; add-to-cart and wishlist feedback use localized toasts.
- Admin shell foundation: `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/admin/layout.tsx`, `src/lib/admin-navigation.ts`; links are filtered by `has_permission`, while page and backend authorization is unchanged.
- Admin shell is responsive with scrollable navigation on narrow screens, active-route styling, and top-bar links for language switching and storefront return. Remaining Admin work includes page/table/editor redesign and checks of all permission combinations.
- Admin product management now includes a narrow-screen product card view, clear empty and data-loading error states, and an explicit edit action. Admin order operations now show mobile order cards with the same permission-checked status transitions and cancel confirmation as the desktop table. Staff management localizes role/permission descriptions, keeps email and permission identifiers correctly LTR inside Arabic UI, and presents staff as responsive cards. Inventory now switches to mobile stock cards that expose on-hand, reserved, available, incoming, and low-stock values; the local Admin browser flow confirms the view renders.
- Storefront mobile navigation now has a localized accessible name, 44px trigger target, logical inline-end anchoring for Arabic and English, and viewport-bounded menu styling. The top announcement bar uses a subdued surface token, reducing large solid-lime areas.
- Branded localized loading skeletons now cover general and Admin route segments. Localized error and not-found boundaries provide safe recovery without displaying internal error details.
- `e2e/mobile_shell.pw.ts` verifies the 390px menu in Arabic RTL and English LTR, including its visible shop link and viewport bounds. The focused browser run and complete six-test E2E suite pass.
- Commerce work continues: the cart table scrolls within its own keyboard-focusable region on narrow screens, unavailable cart rows are localized, and an empty checkout renders a neutral recovery card with a shop link. Checkout quote errors are shown as generic localized feedback rather than raw database messages. Cart quantities now update through a stock- and ownership-checked RPC. Product detail now has a sticky desktop purchase panel, responsive gallery layout, published-review rating distribution and sorting, readable order references, and a verified purchase review composer. Shop filters now sit in a desktop sidebar and open as a native keyboard-operable filter sheet on mobile, with active filter count and reset/apply actions.
- Migration `20260928101530_cart_quantity_updates.sql` is applied locally and on the linked cloud project after dry-run confirmed it was the sole pending migration. It revokes direct cart writes from browser roles while keeping owner-scoped reads and protected RPC mutations; no seed data was pushed.
- Local SQL verification now passes 19 suites, including `cart_quantity.sql` checks for owner isolation, quantity bounds, stock limits and revoked direct table mutation.
- E2E assertions now target localized status badge text and its stable status key. Earlier runs caught an English button label regression and assertions tied to raw database status labels; both were corrected without reducing the tested flow.
- Account journeys use the shared `src/components/account-frame.tsx` shell and localized navigation, including order and reservation detail routes. The account navigation scrolls horizontally on mobile and presents as a persistent side rail on wider screens. The overview shows real account identity and focused links to orders, reservations and garage. Order/reservation histories use localized cards and useful empty states; the old top-level reservation list forwards into the account. Wishlist uses real catalog cards; notifications use localized read/unread cards and dates. Profile and garage use the account content shell, addresses show compact summaries with edit disclosures and delete confirmation, and returns/warranties use explicit empty states, file guidance and dated workflow cards. Customer return/claim views no longer render internal staff notes. Account reviews use accessible star selection, human-readable delivered-order references, character guidance and moderation history. Order and reservation details now retain the account shell, use responsive line items, and confirm cancellation. The full 6-test E2E suite passes, including the updated product review sort and order detail navigation.

## Verification baseline

Latest baseline verification: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (13 tests), production build (101 routes), and `git diff --check` pass. Full local Playwright E2E passed 7/7 in the previous baseline run. The local SQL/RLS harness passed all 19 suites in the previous baseline run. These earlier runs do not verify the continuation changes documented below.

## Continuation update — 2026-09-28

### Implemented in the latest continuation

- Cart mobile presentation now uses dedicated product cards instead of the table, including image, variant/SKU, current and original pricing when discounted, quantity control bounded by available stock, line total, stock message, and remove action. Quantity and merchandise subtotal update optimistically together, and roll back if the server rejects the change. Desktop keeps the structured table and summary. Files: `src/app/[locale]/cart/page.tsx`, `src/components/cart-quantity.tsx`, `src/components/cart-remove.tsx`, `src/app/globals.css`.
- Shop filtering now uses a native modal dialog as the mobile bottom sheet, with category, brand, sort, min/max price, availability, active filter count, reset, apply, Escape, backdrop close, and native focus handling. Desktop retains the sidebar. Closing without applying does not commit the draft filter count. Files: `src/components/shop-filters.tsx`, `src/app/globals.css`.
- Checkout now has four steps (Cart, Delivery, Payment, Review), address selection and address-management link, card/InstaPay options with an explicit pending-provider notice, a full review summary, desktop sticky totals, mobile collapsible summary, and sticky primary action. The existing `place_order` RPC remains authoritative. Files: `src/app/[locale]/checkout/page.tsx`, `src/components/checkout-flow.tsx`, `src/app/actions.ts`, `src/app/globals.css`.
- Reservation now presents motorcycle, branch, customer profile contact, deposit/payment, and review steps, followed by the sixth confirmation/success stage on the created reservation detail page. It reuses the existing reservation Server Action and displays a deterministic reference derived from the reservation UUID, selected branch, deposit, status and next steps. Contact values come from the existing profile; the reservation schema has no separate contact snapshot fields. Files: `src/app/[locale]/reserve/[id]/page.tsx`, `src/components/reservation-flow.tsx`, `src/app/[locale]/reservations/[id]/page.tsx`, `src/app/actions.ts`, `src/app/globals.css`.
- Motorcycle detail specifications now use centralized Arabic/English labels, unit formatting, and known condition/availability/value mappings. Desktop reservation information is sticky; mobile has a bottom Reserve CTA. Files: `src/lib/motorcycle-format.ts`, `src/app/[locale]/motorcycles/[slug]/page.tsx`, `src/app/globals.css`.
- Product editing is divided into overview, pricing, publishing and inventory sections, with links to variants, media, fitment, schema-supported SEO metadata and permission-guarded history. It has dirty-state tracking, reset/discard, save actions, navigation warning, pagination and management filters. Products can be previewed or archived using the existing permission-protected Server Action. Files: `src/app/[locale]/admin/products/page.tsx`, `src/app/admin-catalog-actions.ts`, `src/components/admin-editor-controls.tsx`, `src/app/globals.css`.
- Motorcycle editing is divided into overview, specifications, pricing and condition, with gallery, branch, reservation workflow and audit-history sections, dirty-state controls and a paginated/filterable mobile-card listing. It reuses existing motorcycle schema fields. Files: `src/app/[locale]/admin/motorcycles/page.tsx`, `src/components/admin-editor-controls.tsx`, `src/app/globals.css`.
- Order management now has order-number, status and total sorting filters while preserving pagination and permission-aware transitions. Customer directory has a dedicated mobile-card presentation. Reservation management has status/UUID filters, 25-row pagination, count, and mobile cards with authorized transition/refund actions. Files: `src/app/[locale]/admin/orders/page.tsx`, `src/app/[locale]/admin/customers/page.tsx`, `src/app/[locale]/admin/reservations/page.tsx`, `src/app/globals.css`.
- E2E assertions were updated for the mobile filter dialog, mobile cart, checkout sequence, reservation sequence/success screen, and Product editor dirty state. Files: `e2e/customer.pw.ts`, `e2e/admin.pw.ts`.

### Verification of this continuation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 5 test files / 13 unit tests.
- `npx prettier --check .`: passed.
- `git diff --check`: passed.
- `npm run build`: passed; 101 routes generated.
- No database migration or cloud mutation was made in this continuation. SQL/RLS was not rerun because no SQL changed; the prior verified baseline was 19/19 suites.
- Playwright has not been completed for these new assertions. `npm run test:e2e` could not inspect local Supabase because Podman's local user configuration is not readable/writable in the sandbox (`chmod /run/user/1000/libpod: read-only file system`). A request for an out-of-sandbox local run was interrupted before approval. This is not reported as a passing E2E run.
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 E2E_SUPABASE_TARGET=local npx playwright test --list` discovers all 7 tests in 5 files, including the updated customer/Admin flows. This validates discovery only and does not execute browser tests.
- Therefore 390px/430px/768px/1024px/desktop visual review, rendered RTL/LTR audit, focus/keyboard checks, contrast/touch-target inspection, and browser verification of the revised checkout, reservation and Admin flows remain outstanding. CSS logical properties and successful builds are code-level evidence only.
- Admin operational screens outside Products, Motorcycles, Orders, Customers and Reservations retain their previous presentation; a complete browser-by-browser acceptance pass remains outstanding.

Phase status remains: 1, 2 and 4 COMPLETE; 3 and 5 IN PROGRESS; 6 IN PROGRESS. Do not mark the redesign complete until local Playwright can run and the remaining RTL, accessibility and responsive checks are performed against rendered pages.

## Admin redesign continuation — 2026-09-28

This section supersedes earlier statements that Admin work had not yet started. It records this continuation only; it does not claim rendered-browser acceptance.

### COMPLETED

- Replaced the `/[locale]/admin` navigation-only landing page with an operational dashboard. It uses `admin_report()` for captured revenue, orders, paid orders, reservations, customers, low-stock totals and top products; permission-scoped count queries provide catalog/motorcycle totals, pending orders/reservations, products missing images, failed payments and open warranty claims. The attention center links to the existing management routes and omits unavailable/zero counts instead of showing false alarms. Activity reads only the latest audit actor/action/entity/reference/time fields and never renders audit JSON/detail payloads.
- Added real data visualizations supported by the current reporting RPC: top product units, captured vs other order counts, and top aggregate product/category/motorcycle lists on Reports. Names are looked up in the current locale. The bars include numeric labels and remain readable without color.
- Reorganized Settings into General/Store and Commerce sections with internal navigation, actual existing setting fields only, dirty-state tracking, discard, navigation warning, and sticky save bars. The general form verifies its known key set server-side, rechecks `settings.write`, and saves using the existing protected setting RPC. No secrets or unsupported integrations were added.
- Corrected Arabic/English active-state and slug labels on Categories, Brands, and Branches, and added explicit list query error and empty states.
- Staff role assignment uses the primary action style; removal keeps a danger-soft action with confirmation. Permission changes continue through the existing server action/RPC checks. The existing responsive Staff cards and role/permission labels are preserved.
- Added Admin dashboard assertions to the existing E2E spec for dashboard sections, Settings clean-state, and Arabic RTL viewport overflow. No existing commerce/editor flow was rewritten.

### VERIFIED

- `npm run typecheck`: passed after the Admin changes.
- `npm run format:check`: passed after the Admin changes.
- `npm test`: 5 files, 13 tests passed.
- Playwright test discovery with explicit local-only target settings: 7 tests in 5 files, including the expanded Admin assertions.
- `git diff --check`: passed.
- No SQL, migration, RLS policy, or cloud Supabase change was made in this continuation. The previously passing local SQL/RLS baseline remains 19/19 and was not rerun, consistent with the no-SQL-change instruction.

### IMPLEMENTED BUT NOT BROWSER-VERIFIED

- Dashboard, charts, attention center, recent activity, revised Settings sections, master-data error/empty states, and the new dashboard/RTL E2E assertions are implemented. Their appearance, keyboard/focus behavior, and 390/430/768/1024/desktop layout have not been exercised in a browser in this continuation.
- Existing product/motorcycle/order/reservation/customer/inventory mobile views remain the baseline. Static source review confirms responsive cards for Products, Motorcycles, Orders, Reservations, Customers, Inventory stock, Staff, and case-based Returns; this is not rendered visual QA.
- The dashboard audit feed maps known action/entity values into Arabic and English. Unknown future action/entity keys safely fall back to their stored identifier.

### BLOCKED BY ENVIRONMENT

- Full Playwright execution and visual/accessibility interaction QA remain blocked because the configured local Supabase E2E environment needs Podman socket access that is unavailable inside this sandbox. Podman was not retried with elevated privileges. Do not interpret successful Playwright discovery as a browser test pass.
- The existing `admin_report()` RPC has no daily/monthly time-series or date-range aggregation. To avoid loading an unbounded order history in the browser or presenting fabricated trend data, 7D/30D/90D/12M trend charts are not shown. Adding them requires a versioned SQL aggregation RPC plus local database verification; no schema change was made here.

### REMAINING

- Run the discovered Playwright suite and rendered checks at 390px, 430px, 768px, 1024px and desktop in an environment with local Supabase/Podman available. Include keyboard traversal, focus/escape behavior, reduced-motion, contrast and touch-target checks.
- Add and verify a database-side date-range reporting aggregate before offering 7D/30D/90D/12M trend controls.
- Reassess mobile presentation of secondary operational history tables (for example inventory movements and supplier/purchase-order history) during browser QA; several retain bounded horizontal-table fallback layouts.
- The last successful production build before this Admin continuation generated 101 routes. The post-continuation build result is recorded below once complete.

### Admin continuation verification result

- `npm run format:check`: passed.
- `npm run lint`: passed with no warnings.
- `npm run typecheck`: passed.
- `npm test`: 5 files, 13 tests passed.
- `npm run build`: passed; 101 static/dynamic routes generated.
- `git diff --check`: passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 E2E_SUPABASE_TARGET=local npx playwright test --list`: passed discovery of 7 tests in 5 files. Browser tests were not executed.
- SQL/RLS: not rerun because this continuation changed no SQL; previous baseline remains 19/19.

The redesign is not marked complete: browser interaction/visual QA is blocked, and date-range reporting depends on a new database-side aggregate that has not been added or verified.

## Admin completion continuation — 2026-09-28

This section supersedes the immediately preceding Admin continuation status. It records the latest code and verification state. Build success and test discovery do not substitute for database or rendered-browser verification.

### COMPLETED

- Added mobile card presentations in place of horizontally scrolling desktop tables for supplier records, supplier product references, purchase-order lines/receiving, inventory movement history, promotion usage history, motorcycle fitment, and order-detail line items. Existing mobile cards remain for products, motorcycles, orders, reservations, customers, inventory stock, and staff. Audit history uses keyboard-operable expandable records. Reviews, returns, and warranties already use responsive record/card lists; Categories, Brands, and Branches use responsive form/list layouts; Reports uses metric/chart layouts rather than dense tables.
- Added database-side Admin trend aggregation in `supabase/migrations/20260928164749_admin_analytics_timeseries.sql`. It reads orders, reservations, profiles, and captured payment events; returns UTC daily buckets for 7D/30D/90D and UTC monthly buckets for 12M; and uses date bounds plus indexes on the aggregation timestamps. `revenue_egp` is captured order payment volume by capture date; `captured_payments_egp` includes captured order and reservation payments. The function returns aggregates only, not customer-level records.
- The analytics RPC requires an authenticated caller with `reports.read`, has a fixed empty `search_path`, validates a finite range set, revokes execute from `PUBLIC`, `anon`, `authenticated`, and `service_role` before granting only `authenticated`, and is therefore callable by authorized sessions only. `SECURITY DEFINER` is used to aggregate rows whose underlying RLS intentionally prevents reports readers from selecting customer/payment records directly.
- Added `GET /api/admin/analytics`, which authenticates the session, checks `reports.read`, validates the range with Zod, calls the RPC, and returns private/no-store responses. Added dashboard range controls and real revenue, orders, reservations, customer-growth, and captured-payment charts with loading, empty, error/retry states and accessible text alternatives. No browser-side dataset aggregation or fabricated chart values are used. The chart x-axis labels remain aligned with the chronological SVG axis in RTL layouts.
- Added SQL assertions in `supabase/tests/admin_analytics_timeseries.sql` for anonymous execute denial, customer denial, empty date spines, all four ranges, range boundaries, order revenue/payment volume, reservations, customers, and invalid ranges.
- Expanded `e2e/admin.pw.ts` to exercise range selection, loading and chart/empty rendering, mobile secondary cards, RTL navigation/overflow, and permission-sensitive navigation/API behavior. Playwright discovery parses all 7 tests across 5 files.

### VERIFIED

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 6 files and 15 tests passed.
- `npm run build`: passed; Next.js generated 102 route/page entries, including the analytics API route.
- `git diff --check`: passed.
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 E2E_SUPABASE_TARGET=local npx playwright test --list`: discovered all 7 tests in 5 files. This verifies discovery/syntax only.
- Static Admin RTL/accessibility review found no Admin-route hard-coded physical margin/padding/text alignment assumptions in the searched files. Directional-position matches from the broader CSS scan are existing storefront/gallery styles, not these Admin screens. Analytics controls have 44px minimum targets, visible focus, pressed state, labels and live loading/error announcements; reduced-motion disables the chart skeleton animation. Responsive CSS uses logical spacing and the trend layout collapses to one column on narrow screens. Rendered layout, keyboard interaction and actual tooltip behavior still require browser verification.

### IMPLEMENTED BUT NOT BROWSER-VERIFIED

- Responsive card/table breakpoints and chart/dashboard behavior are implemented, but have not been visually checked at 390px, 430px, 768px, 1024px or desktop. Playwright assertions for those widths are present but were not executed.
- The new migration and SQL test file are versioned in the repository, but their SQL behavior is not verified in this environment. The database-dependent assertion logic was inspected statically only.

### BLOCKED BY ENVIRONMENT

- `bash tool/test_db.sh` was attempted once after adding SQL. It stopped before executing the first SQL test because Podman could not access its user configuration: `Failed to obtain podman configuration: set sticky bit on: chmod /run/user/1000/libpod: read-only file system`. The prior 19/19 SQL/RLS result is the pre-migration baseline and must not be reported as a pass for the current migration. No repeat privileged Podman attempt was made.
- Full Playwright/browser QA remains blocked by the local Supabase/Podman limitation. The suite was not run; discovery is not a browser pass.
- The analytics migration has not been applied to the linked cloud database. Applying a new reporting function without first running its SQL/RLS verification would not be a safe production change.

### REMAINING

- Run the full SQL/RLS suite, including the new analytics tests, in an environment with the repository's local Supabase/Podman stack available. Expected prior baseline was 19/19; the new result remains unknown.
- After SQL tests pass, apply the versioned analytics migration to the linked project using the established production-safe migration process. Until then, deployed environments without this function will show the dashboard analytics error state.
- Execute Playwright against local Supabase and perform rendered RTL/LTR, keyboard/focus, tooltip, responsive, touch-target and overflow verification at the required widths. Keep browser QA marked blocked until that run succeeds.

No development data was added to or pushed to cloud Supabase in this continuation.

## Admin analytics SQL validation continuation — 2026-09-28

This is the current analytics validation record and supersedes any prior inference that the migration is ready for production based on static checks alone.

### IMPLEMENTED

- The migration retains UTC-bounded 7D/30D/90D day ranges and a 12-calendar-month monthly range, inclusive at the start and exclusive at the next UTC midnight. Every requested range produces a complete date spine; missing aggregates become zero through `LEFT JOIN` and `COALESCE`.
- Captured payments are deduplicated by payment ID within a reporting range before sums are computed. Failed/cancelled payment events do not contribute to captured payment volume. `revenue_egp` is explicitly gross captured order value by capture date: an immutable capture remains counted after a later refund. This is not net revenue after refunds and must not be described as such. Order/reservation/customer counts represent records created in the range regardless of subsequent lifecycle status.
- The SQL test now includes a normal customer, a `sales` staff member without `reports.read`, and an authorized owner; it exercises an actual anonymous-role RPC attempt plus ACL inspection, empty buckets, current and 40-day historical records, exact inclusive and exclusive UTC boundaries, same-day aggregation, duplicate capture events, failed/cancelled payment attempts, post-capture refunded status, all four ranges, invalid range rejection and aggregate totals.

### VERIFIED

- Static review confirmed the RPC signature/return names match the API and TypeScript point type: `admin_analytics_timeseries(p_range text)` returns `bucket_date`, `revenue_egp`, `orders`, `reservations`, `customers`, and `captured_payments_egp`. The client sends only `7d`, `30d`, `90d`, or `12m`, uses those field names, and has explicit loading, error/retry and empty states without fabricated fallback values.
- Static security review confirmed `SECURITY DEFINER` is used to aggregate profiles and operational data whose RLS intentionally restricts row-level selection; it uses `SET search_path = ''`, schema-qualified data/function references, checks both non-null `auth.uid()` and `public.has_permission('reports.read')`, revokes `PUBLIC` and `anon`, and grants execution only to `authenticated`. The API independently checks authentication and `reports.read`; database authorization remains authoritative.
- The function bounds data scans to at most 12 months and uses indexes for order, reservation, profile, and captured-event timestamps. Grouped source CTEs avoid join multiplication. Each source is aggregated independently before joining to the bounded bucket spine.
- `bash tool/test_db.sh` was attempted after the migration review. It failed before executing its first SQL file with `Failed to obtain podman configuration: set sticky bit on: chmod /run/user/1000/libpod: read-only file system`. Additional ACL, deduplication, and boundary assertions were then added; they remain unexecuted for the same environment limitation.
- Non-SQL checks for this continuation: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (6 files / 15 tests), `npm run build` (102 route/page entries) and `git diff --check` pass. Playwright discovery remains 7 tests across 5 files; the browser suite was not executed.

### NOT VERIFIED

- SQL syntax/runtime, grants under the local Supabase role setup, date aggregation results, migration indexes/plans and the new SQL assertions have not executed. The previous 19/19 SQL/RLS run predates this migration and is not a current pass.
- No SQL query plan was available because there is no local PostgreSQL/Podman runtime. Performance conclusions are based on bounded predicates, aggregate shape and declared indexes only.

### CLOUD

- The migration has NOT been applied to the linked Supabase cloud project. No remote database mutation was attempted. It must remain unapplied until the full local SQL/RLS runner executes successfully and its new tests pass.

### BROWSER QA

- Playwright was not executed in this continuation. Earlier test discovery is syntax/discovery evidence only, not browser execution. Responsive chart, range selector and RTL appearance remain unverified in a browser.

### REMAINING

- Run `bash tool/test_db.sh` in an environment where the repository's local Supabase/Podman database is available; resolve any SQL/test failures before considering this migration verified.
- After successful full SQL/RLS verification, review the query plan at representative data volume, then follow the production migration process. If the business needs net revenue, add refund amounts as a separate explicit metric rather than interpreting gross captured value as net.
- Browser QA is still outstanding and blocked by the local Supabase/Podman environment.

## Analytics SECURITY DEFINER grant verification — 2026-09-28

### IMPLEMENTED

- Identified `public.admin_analytics_timeseries(text)` as the exact function that triggered `Unexpected authenticated SECURITY DEFINER function grant`. It is intentionally `SECURITY DEFINER`: reporting roles can have `reports.read` without row-level `orders.read`, `reservations.read`, or `payments.read`, and profile RLS is self-only. An invoker function would return incomplete per-user data or require granting broad raw-row access. This function instead performs the permission check before querying and returns only bounded aggregate buckets.
- The function uses `SET search_path = ''`, qualifies data/function references, contains no dynamic SQL, checks `auth.uid()` and `public.has_permission('reports.read')`, and emits only dates, totals and counts. The immutable capture semantics are documented as gross captured revenue, with failed/cancelled attempts excluded and later refunds not netted from historical capture totals.
- The migration explicitly revokes `EXECUTE` from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then grants it only to `authenticated`. The authenticated call remains protected by the internal `reports.read` check.
- Updated `supabase/tests/security_definer_grants.sql` without weakening its guard: it now asserts anonymous denial and authorized authenticated availability. The allowlist includes the new name only with an additional OID equality check for the exact signature `public.admin_analytics_timeseries(text)`; an overload with the same name remains rejected.
- The analytics SQL test covers customer denial, sales staff without `reports.read`, authorized owner access, actual anonymous invocation denial, aggregate-only results, empty/single-day/multi-day data, duplicate capture de-duplication, failed/cancelled attempts, post-capture refunded status under gross-capture semantics, all four ranges, and inclusive/exclusive UTC boundaries.

### VERIFIED

- `bash tool/test_db.sh`: **20 SQL/RLS test files passed, 0 failed**, including `supabase/tests/admin_analytics_timeseries.sql` and `supabase/tests/security_definer_grants.sql`.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 6 files / 15 tests passed.
- `npm run build`: passed; Next.js generated 102 route/page entries.
- `git diff --check`: passed.

### NOT VERIFIED

- Browser QA was not executed in this continuation. This task's database verification ran locally; it does not constitute Playwright or visual verification.
- No production-volume query plan was measured; SQL correctness, grants and runtime tests passed locally, while the existing bounded date predicates and indexes were reviewed statically.

### CLOUD

- The migration has NOT been applied to cloud Supabase. Only the local database was used for the full SQL/RLS suite.

### BROWSER QA

- Playwright runtime was not executed. Existing test discovery is not treated as browser execution.
