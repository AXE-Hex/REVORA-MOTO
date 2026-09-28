# REVORA MOTO — remaining work plan

Authoritative requirements: `Web`; continuation brief: `Web2`. Work stays in this repository. Status is recorded in `AGENT_STATUS.md`. No live payment capture or external refund is permitted until the user selects a provider.

## Execution order and owners

| Stage                             | Owner                       | Deliverable                                                                                                                        | Acceptance gate                                                                                 |
| --------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 0. Baseline and ownership         | Primary agent               | Confirm current gaps, assign non-overlapping files, review every contribution                                                      | Existing tests pass; no overwritten work                                                        |
| 1A. Admin visibility and settings | Agent 1                     | Permission-gated customers and audit pages; safe site settings management with RLS/RBAC and audit history; focused SQL tests       | Staff can access only allowed data/actions; unauthorized writes fail                            |
| 1B. Motorcycle media and SEO      | Agent 2                     | Fullscreen/zoom/swipe/keyboard gallery, accessible controls, product/motorcycle structured data and focused browser checks         | Gallery works by mouse, touch and keyboard; JSON-LD uses database values and safe serialization |
| 1C. Integration review            | Primary agent               | Review security, data model and UI; fix conflicts; update status/docs                                                              | Format, lint, TypeScript, unit, SQL, browser tests and build pass                               |
| 2. Fulfillment and operations     | Primary agent after stage 1 | Warehouse allocation, shipping/tax/invoice policy, scheduled expiration and richer admin workflows                                 | Server-calculated amounts, immutable stock history, tested transitions                          |
| 3. Notifications and remaining UX | Primary agent after stage 2 | Delivery worker/provider, missing event types, search/fitment depth, accessibility and localization audit                          | Events delivered or clearly pending; customer/admin flows verified                              |
| 4. Release gate                   | Primary agent               | Provider-specific payment/refund integration after user chooses provider, legal approval, security review and deployment rehearsal | No launch claim until every release gate passes                                                 |

## Boundaries and review

- Agent 1 owns new `admin/customers`, `admin/audit`, `admin/settings` routes/actions and additive migrations/tests starting at `202609270022`. It may minimally update the admin navigation only after coordinating with the primary agent. It does not edit gallery, SEO, payments or project documentation.
- Agent 2 owns `showroom-gallery.tsx`, related CSS, product/motorcycle detail SEO, and its focused E2E test. It does not edit SQL migrations, admin pages, payments or project documentation.
- The primary agent owns shared documentation, integration, final checks and any cross-domain change. Every agent reports changed files, test evidence and risks. The primary agent reviews before accepting their work.
- Database changes are additive migrations. Every privileged action must enforce authorization in the server and RLS/RBAC. Money, status, role and inventory values are never trusted from the browser.
- The selected payment provider, mail provider and legal approval are external decisions. Their absence does not block independent implementation.

## Verification gates

1. `npm ls --depth=0`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`.
2. Local Supabase reset and `bash tool/test_db.sh` for all SQL suites; browser tests against local seed.
3. `npm run build` after the browser dev server stops.
4. Review `git status`, `git diff --check` and new untracked files; update `AGENT_STATUS.md` and user-facing docs with honest remaining gaps.

## Current execution status

Stages 0, 1A, 1B and 1C are complete for this iteration. Agent 1 delivered migration `022`, the customer/audit/settings pages and SQL authorization tests. Agent 2 delivered gallery improvements, structured data and browser/unit tests. The primary agent added catalog pagination and integration checks. Stages 2–4 remain open; payment integration stays blocked until a provider is chosen.
