# Deployment

This repository is **not ready for production deployment**. The following are prerequisites, not a claim that launch gates have passed.

1. The linked cloud development project has versioned migrations through `20260928095017` applied. Review every migration and the current RLS/ACL state for a separate production Supabase project. Do **not** run `supabase/seed.sql` in production. Create the first verified owner through the documented secure bootstrap procedure.
2. Configure Auth email confirmation, OAuth credentials and localized callback URLs. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` and a server-only `SUPABASE_SERVICE_ROLE_KEY`. Set a maintained `USD_EGP_RATE` only if USD display is offered.
3. Select and implement a licensed Egyptian payment provider; verify its real webhook, card/InstaPay state and refunds in sandbox. Keep financial states pending until confirmed. Configure the payment environment values documented in `PAYMENTS.md`.
4. Configure an email delivery provider for `email_outbox`; verify the scheduled expiration/cleanup worker, warehouse-aware fulfillment, shipping/tax rules, invoice/legal requirements, media storage, rate limiting, monitoring and backup/recovery procedures.
5. Finish legal/privacy policy approval, accessibility/mobile and security reviews, provider tests and all critical browser/admin workflows. Then run the checks in `TESTING.md`, build with `npm run build`, and deploy behind HTTPS.

Read `AGENT_STATUS.md` and `IMPLEMENTATION_AUDIT.md` for verified product gaps, and `SECURITY.md` for controls needing review. Supabase Auth leaked-password protection must be enabled before launch; the cloud Security Advisor currently flags it as disabled.

The linked cloud project and current local environment are described in `CLOUD_SETUP.md`. Its existence does not satisfy the production launch gates.
