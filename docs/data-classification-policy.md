<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Data Classification & Handling Policy</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

Grounded in what the app's schema and privacy page actually say, not a
generic template — verified against code 2026-08-16.

## Categories

### Public data
The marketing site (`/`, `/about`, `/pricing`, `/faq`, `/security`,
`/privacy`, `/terms`) — no access restrictions, statically served.

### Tenant's customer data (contacts, jobs, invoices, interactions)
This is data QCypher's tenants (the businesses using the CRM) collect
about *their own* customers. QCypher has **custody, not ownership** —
the tenant is the data controller, QCypher is the processor.

- Isolated per-tenant via Row-Level Security (`tenant_id` scoping on
  every tenant-facing table — 30 tables confirmed as of the 2026-08-16
  review, see `docs/risk-register.md` Risk #1 for the one gap found and
  closed).
- Access restricted by role: `owner` / `member` / `read_only`
  (`apps/web/src/lib/actions/team.ts`), plus platform-level
  `is_super_admin` for QCypher's own staff.
- Deletion: tenant account deletion has a **30-day grace period**, after
  which tenant data is hard-deleted (`apps/web/src/app/api/cron/
purge-deleted-accounts/route.ts`, daily cron) with an email notice to
  the account owner. **Auth user records themselves are not deleted or
  anonymized** — only tenant-scoped data — a documented scope reduction,
  confirmed in the code's own comments, not a contradiction of the
  public-facing retention claim on `/privacy`.

### Tenant configuration & payment credentials
API keys, Stripe/Helcim OAuth tokens, webhook secrets tied to a specific
tenant's payment processor connection.

- Access: tenant `owner` role + platform super-admin only.
- Stored via Supabase (encrypted at rest — platform-level, see
  Encryption section below).
- Never exposed to the client bundle — enforced by
  `scripts/secret-audit.sh`, which runs in CI on every push (see caveat
  in `docs/change-management-policy.md`: this check is currently
  non-blocking).

### Platform / system data
`audit_logs`, `incidents`, `vulnerability_scans` /
`vulnerability_findings` — QCypher's own operational data, not owned by
any tenant.

- `audit_logs`: **90-day retention**, enforced by a real automated purge
  function (`purge_old_audit_logs()`, invoked daily via
  `/api/cron/purge-audit-logs`) — not just documented, actually running.
- `incidents`: no automatic purge (incident records are kept as a
  permanent record; this is intentional — they're the evidentiary trail
  for the incident response process, not transient logs).
- `vulnerability_scans` / `vulnerability_findings`: no automatic purge;
  scan history and finding-group tracking (Phase 34/34b) are meant to
  persist to show trend/remediation over time.
- RLS on all of these: super-admin-only, no tenant column — this is
  QCypher's own data, not a tenant's.

## Encryption

- **In transit:** TLS enforced end-to-end (Vercel + Supabase both
  terminate HTTPS only; no plaintext HTTP path exists in production).
- **At rest:** Supabase-managed (AES-256, per Supabase's own published
  security posture) — this is a platform guarantee, not something this
  app's code implements directly. See `docs/vendor-risk-assessment.md`.
- **Backups:** Supabase-managed; **retention window and encryption
  status not independently verified from application code** — this is a
  Supabase project dashboard setting. Flagged as a gap in
  `docs/risk-register.md` Risk #2 (disaster recovery has never been
  tested).

## What this policy does NOT cover

- GDPR/CCPA-specific data subject request handling (export, right to be
  forgotten beyond account deletion) — not currently built. If a tenant
  requires this for their own compliance, it's presently a manual
  process, not a self-service feature.
- Data residency / regional storage requirements — not evaluated; the
  Supabase project's region is wherever it was provisioned, not chosen
  per-tenant.

## Review cadence

Reviewed alongside the risk register — quarterly, or whenever a new
data-handling feature (e.g. a new integration storing new categories of
data) ships.
