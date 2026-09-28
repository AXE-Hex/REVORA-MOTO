# Supabase cloud project

The `REVORA MOTO` Supabase project was created in organization `Axe_Apps`, region `eu-central-1`, with project ref `jrtnzbteglgyjqifyvuv`. The repository's Supabase CLI link points to this project. Migrations `202609270001` through `202609270022` were applied and verified against the remote migration history. The public catalog API returned HTTP 200 with an empty result.

No demo seed was pushed. The cloud database has no demo products, motorcycles, customer accounts or staff owner. It is a development cloud project, **not a production launch**. Do not run `supabase db reset --linked` or push `supabase/seed.sql` to it.

The local `.env.local` is ignored by Git and now points to the cloud API using its public anon key. `SUPABASE_SERVICE_ROLE_KEY` remains empty and payments remain in sandbox. The previous local environment file and the generated cloud database password are stored privately under `/home/axe/.local/share/revora-moto/` with restricted permissions; do not copy them into Git or chat.

`npm run test:e2e` obtains the running local Supabase URL and anon key from `supabase status` and explicitly refuses a remote target. Start local Supabase before running browser tests. The SQL runner also targets local Supabase only.

Next cloud setup steps before customer use:

1. Configure Supabase Auth site URL, email confirmation/sender, OAuth credentials and the localized callback URLs for the eventual public domain.
2. Create the first verified staff owner through a privileged administrator session using the documented bootstrap procedure; no owner was seeded.
3. Add reviewed real catalog content and images through the admin UI or controlled import. Keep demo records out of the cloud project.
4. Select and integrate a payment provider; provision a server-only service key and signed webhook only when required by the verified integration.
5. Complete the remaining release gates in `AGENT_STATUS.md` and `DEPLOYMENT.md`.
