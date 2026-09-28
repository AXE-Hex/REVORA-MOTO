# Supabase cloud project

The `REVORA MOTO` Supabase project was created in organization `Axe_Apps`, region `eu-central-1`, with project ref `jrtnzbteglgyjqifyvuv`. The repository's Supabase CLI link points to this project. Versioned migrations through `20260928101530_cart_quantity_updates.sql` (31 migrations) are applied and verified against the remote migration history. This migration removes direct cart-table write privileges from anonymous/authenticated roles and adds a quantity-update RPC that checks ownership and available stock. The reviewed `db push --linked --dry-run` preview contained exactly this migration. No seed or development records were pushed.

No demo seed was pushed. The cloud database has no demo products, motorcycles, customer accounts or staff owner. It is a development cloud project, **not a production launch**. Do not run `supabase db reset --linked` or push `supabase/seed.sql` to it.

The local `.env.local` is ignored by Git and points to the cloud API using its public anon key. Do not print or commit its values. `SUPABASE_SERVICE_ROLE_KEY` remains unset and payments remain pending/sandbox. Any privileged key must remain server-only. The previous local environment file and generated cloud database password are stored privately under `/home/axe/.local/share/revora-moto/` with restricted permissions; do not copy them into Git or chat.

`npm run test:e2e` obtains the running local Supabase URL and anon key from `supabase status` and explicitly refuses a remote target. Start local Supabase before running browser tests. The SQL runner also targets local Supabase only.

Current remote security review: internal `SECURITY DEFINER` helpers have had broad execute grants removed by migration `20260928095017`. The Supabase Security Advisor still reports intentionally callable authenticated business RPCs, two read-only public RPCs, and the Auth dashboard warning that leaked-password protection is disabled. Review these in the dashboard before launch; do not grant broader SQL function access to silence expected reports.

Cart access now follows read-through-RLS/write-through-RPC: authenticated customers can select only their own cart rows; direct insert/update/delete/truncate privileges are revoked from `public`, `anon`, and `authenticated`. Cart add, quantity update and removal use authenticated functions; quantity changes reject inactive products, invalid quantities and stock overages.

Next cloud setup steps before customer use:

1. Configure Supabase Auth site URL, email confirmation/sender, OAuth credentials and the localized callback URLs for the eventual public domain.
2. Create the first verified staff owner through a privileged administrator session using the documented bootstrap procedure; no owner was seeded.
3. Add reviewed real catalog content and images through the admin UI or controlled import. Keep demo records out of the cloud project.
4. Select and integrate a payment provider; provision a server-only service key and signed webhook only when required by the verified integration.
5. Configure the Auth leaked-password protection setting and complete the remaining release gates in `AGENT_STATUS.md` and `DEPLOYMENT.md`.
