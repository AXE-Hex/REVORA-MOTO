# REVORA MOTO

Arabic and English motorcycle marketplace and gear store using Next.js App Router and Supabase. This is an **in-progress implementation** of [`Web`](./Web), continued under [`Web2`](./Web2). It is **not production ready**.

## Run locally

1. Install Node.js 20.9 or newer and the Supabase CLI with Docker or Podman.
2. Run `npm ci`.
3. Run `supabase start`; copy its API URL and publishable/anon key into `.env.local` using `.env.example`. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
4. Run `supabase db reset --local` to apply all migrations and demo seed data.
5. Run `npm run dev` and open `/ar` or `/en` on port 3000.

The seed creates 28 products and six motorcycles with demo flags. It creates no customer or staff Auth accounts. Demo images are illustrative.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
bash tool/test_db.sh
npm run test:e2e
npm run build
```

The SQL runner requires a running **local** Supabase database and rolls back each suite. Browser tests create local Auth/order/reservation data; reset the local database before repeating them if reservation conflicts arise. Run the production build after browser tests stop their dev server.

## Current scope

- Public bilingual catalog, motorcycle comparison, fitment, active My Garage, search, cart, variant checkout, reservations and customer account pages.
- Customer returns and warranty claims, staff inventory/purchasing, promotions, catalog/vehicle editing, sales transitions, moderation, staff permissions and real-data reports.
- Permission-gated customer directory, audit log and safe site settings; paginated catalogs, enhanced motorcycle gallery and database-derived structured data.
- Supabase RLS and server-side transaction RPCs for privileged stock, price, deposit, discount, status and case changes.
- Pending payment architecture. The user has deferred choosing an Egyptian gateway, so card/InstaPay captures and external refunds remain unavailable. Email notifications enter an outbox but are not delivered.

Read [`AGENT_STATUS.md`](./AGENT_STATUS.md) for each major feature's status, [`CLOUD_SETUP.md`](./CLOUD_SETUP.md) for the linked cloud project, and [`DEPLOYMENT.md`](./DEPLOYMENT.md) for release prerequisites.
