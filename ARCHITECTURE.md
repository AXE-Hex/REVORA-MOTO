# Architecture

The Next.js App Router is in `src/app`. Localized public and account routes live under `src/app/[locale]`. Server components read through `src/lib/catalog.ts` and Supabase SSR helpers; client components handle interactive gallery, cart, authentication and fitment. Arabic routes set RTL on the locale container, English routes LTR.

`src/lib/supabase/server.ts` uses request cookies and `getUser()` for identity. Server Actions validate input with Zod. Transactional database RPCs own checkout, coupon quote/application, reservation, stock, sales transitions, returns, warranties and role assignment. RLS and column grants provide a second enforcement layer. The browser receives only the Supabase publishable key. The service-role key is limited to server payment routes.

Migrations `001`–`022` are ordered under `supabase/migrations`. `public_products` and `public_motorcycles` expose safe catalog data. Role assignments and permissions are checked by `has_permission()`. Location inventory and an immutable movement ledger track stock. Catalog stock is reconciled with location balances; checkout still consumes catalog stock and does not allocate a customer order to a specific warehouse. This is an operational gap.

Prices and deposits are stored in EGP. USD display requires a maintained positive `USD_EGP_RATE`; checkout never trusts client money values. Payment initiation uses a provider interface and a pending sandbox. The email outbox records messages but needs a delivery worker/provider.

## Remaining architecture work

Implement warehouse-aware fulfillment and shipping/tax/invoice policy, a selected provider's real payment/refund API, email delivery, scheduled expiration jobs, richer media storage and gallery interactions, and complete SEO/accessibility/performance review. See `AGENT_STATUS.md` for the broader gap list.
