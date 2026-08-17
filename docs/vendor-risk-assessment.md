# Third-Party Vendor Risk Assessment

Vendor list verified against actual wired-up code (not `.env.example`
placeholders) as of the 2026-08-16 gap assessment. Security posture
claims below are what each vendor publicly states — none of these have
been independently audited by QCypher; that's noted explicitly rather
than implied.

---

## Supabase — Database, Auth, Storage
**Integration:** ~30 files across `apps/web/src/lib/supabase/*`. This is
the system of record for every tenant's data.
**Risk level: CRITICAL** — full outage or breach here is a full outage
or breach for QCypher.

- Publicly states SOC 2 Type II compliance, encryption at rest (AES-256)
  and in transit (TLS) — not independently verified by QCypher.
- **Shared responsibility:** Supabase secures the infrastructure;
  QCypher is responsible for RLS policies, access control, and key
  management. QCypher's side: RLS on 30 tenant tables (see
  `docs/risk-register.md` Risk #1), RBAC (Risk #3).
- **Contingency:** Supabase's own backup/restore remains unverified
  platform config. An independent nightly `pg_dump` backup to Cloudflare
  R2 exists and was confirmed working 2026-08-16 (was silently broken
  since it was built — see Risk #2). **Update, same day:** the restore
  path is now also tested — every nightly run restores into a disposable
  Postgres 17 container and spot-checks 6 core tables, confirmed via a
  real successful run
  (`evidence/availability/2026-08-16-backup-restore-verified.md`). Both
  backup creation and restore are now verified controls.

## Vercel — Hosting, Edge/Serverless, Cron
**Integration:** All deploys, `apps/web/vercel.json` for scheduled cron
jobs (audit purge, incident detection, account deletion, ZAP report
scheduling doesn't run here — that's GitHub Actions).
**Risk level: HIGH** — serves every user-facing request.

- Publicly states SOC 2 compliance, automatic HTTPS, DDoS protection.
- **Shared responsibility:** Vercel secures the platform; QCypher is
  responsible for secure deployment practices and environment variable
  hygiene (enforced partially via `scripts/secret-audit.sh`, currently
  non-blocking in CI — see change-management policy).
- **Contingency:** No live failover, but a documented runbook now
  exists — `docs/vercel-outage-runbook.md`, written 2026-08-16 after
  actually checking the codebase for Vercel lock-in (there's very
  little: no `@vercel/*` packages, no edge runtime, no proprietary
  image loader). The one real dependency is the 10 cron jobs in
  `vercel.json`, which would need replacing with GitHub Actions
  scheduled workflows (a pattern this repo already uses successfully
  for 3 other jobs) or an external cron service. This is a
  documentation-only mitigation — cheap, matches a 2-person team's
  budget — not a tested live failover.

## Resend — Transactional Email
**Integration:** `apps/web/src/lib/email/send.ts`, used across incident
alerts, account notices, invoice/portal emails, ZAP scan alerts (9+ call
sites).
**Risk level: MEDIUM** — an outage delays notifications (including
security incident alerts) but doesn't expose data.

- Pay-as-you-go, no stored payment/customer data beyond email addresses
  and message content at send time.
- **Contingency:** No fallback email provider configured. If Resend is
  down during an active incident, the incident response playbook's
  email-based alerting (`alertSuperAdmins()`) would be delayed —
  SMS via Telnyx is the only other alert channel, and only if
  `ALERT_PHONE_NUMBERS` is configured.

## Telnyx — SMS / Voice
**Integration:** `apps/web/src/lib/telnyx.ts`, used for review requests,
appointment reminders, and optional incident SMS alerts.
**Risk level: MEDIUM** — customer phone numbers pass through this
vendor; an outage degrades a secondary notification channel, not a
primary one.

- **Contingency:** SMS is already treated as optional/best-effort
  throughout the app (features degrade gracefully without it).

## Stripe — Payment Processing (Connect)
**Integration:** `apps/web/src/lib/stripe-connect.ts`, OAuth flow
(`/api/oauth/stripe/connect`, `/callback`), webhook
(`/api/webhooks/stripe-connect`). **Live/primary payment processor**
(per user memory: Stripe Connect fully deployed 2026-08-14).
**Risk level: CRITICAL** — handles real money movement for tenants.

- Publicly PCI-DSS Level 1 certified — the industry-standard bar for
  payment processors; not independently verified by QCypher beyond
  relying on their published compliance status.
- **Shared responsibility:** Stripe handles card data and PCI scope
  directly (QCypher never touches raw card numbers — Stripe Connect's
  hosted/tokenized flow). QCypher's responsibility is limited to
  webhook signature verification and correct OAuth token handling.
- **Contingency:** Helcim exists as a second payment processor
  integration but is intentionally paused (per user memory) — could be
  reactivated as a fallback if Stripe had an extended outage, though
  this hasn't been tested as a live failover path.

## Helcim — Payment Processing (Connect, paused)
**Integration:** `apps/web/src/lib/helcim-connect.ts`, OAuth
(`/api/oauth/helcim/connect`), webhook (`/api/portal/helcim/webhook`).
Also embeds a payment iframe directly in checkout flows
(`secure.helcim.app`) — this is why the CSP/COEP header work in Phase 34
treated it as the single highest-business-risk integration to avoid
breaking.
**Risk level: HIGH** (would be CRITICAL if reactivated as primary).

- Same PCI-scope reasoning as Stripe — card data doesn't transit
  QCypher's own servers.
- **Contingency:** Currently paused by design, so its own outage has no
  live impact today.

## Google Calendar — Tenant OAuth Integration
**Integration:** `/api/google-cal/connect`, `/callback`. Lets a tenant
sync appointments to their own Google Calendar.
**Risk level: MEDIUM** — OAuth tokens grant calendar read/write on a
tenant's own Google account; scoped to calendar only, not broader Google
account access.

- **Contingency:** Feature degrades to "no calendar sync" if the
  integration is unavailable — not a blocking dependency for core CRM
  function.

## Cal.com — Tenant OAuth Integration
**Integration:** `/api/cal/connect`, `/callback`, `/webhook`. Similar
booking-sync integration to Google Calendar.
**Risk level: MEDIUM** — same reasoning as Google Calendar.
**Documentation gap found and fixed 2026-08-16:** `CAL_CLIENT_ID`,
`CAL_CLIENT_SECRET`, `CAL_ENCRYPTION_KEY`, `CAL_WEBHOOK_SECRET` were
wired into real functionality but entirely missing from
`.env.example` — now added.

## Google Gemini — AI (single feature, optional)
**Integration:** Phase 14C monthly report narration only. If
`GEMINI_API_KEY` is unset, the feature falls back to a plain data-only
summary with no AI call — confirmed graceful degradation, not a hard
dependency.
**Risk level: LOW** — no tenant customer PII sent beyond aggregate
report data for one non-critical feature.

---

## Not currently used (mentioned in earlier planning, verified absent)
**Formspree** — referenced in the original CSP allowlist work
(Phase 34) for the pricing page's contact form, but not confirmed as a
distinct backend integration beyond a client-side form POST target.
Lower scrutiny than the vendors above since no QCypher server code
calls it directly.

## Review cadence

Reviewed whenever a new vendor is integrated, or annually alongside the
risk register.
