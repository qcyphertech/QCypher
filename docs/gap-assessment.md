<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">SOC 2 Gap Assessment</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

Verified against the actual codebase and live database on 2026-08-16 —
not assumed from the original phase plan. Where the original claim was
wrong or overstated, that's called out explicitly rather than quietly
corrected.

## Existing controls

| Control | Status | Evidence |
|---|---|---|
| Multi-tenant RLS | ⚠️ **Two real gaps found & fixed** | 30 tenant-scoped tables had RLS. `order_number_counters` had **no RLS at all** — fixed 2026-08-16. `invite_tokens` (raw invite token + invited email) also had **no RLS at all**, and was genuinely exploitable — any authenticated user could read every tenant's pending invites — fixed the same day the isolation test suite first actually ran end-to-end and caught it. See `docs/risk-register.md` Risk #1. |
| RLS isolation test suite non-functional | ✅ **Fixed 2026-08-16.** | Had never once run successfully. Fixed in two passes: first got 4 of 8 files running (missing `ts-node`, Vitest APIs used under Jest, a missing-semicolon ASI bug), then provisioned real `TEST_TENANT_A/B` fixtures to unlock the other 4, which surfaced 2 more bugs (`getUserByEmail` doesn't exist in the installed SDK; one file re-authenticated per-test and hit Supabase's rate limit). All 8 suites now pass in real CI, 91 tests, blocking (not `continue-on-error`). See Risk #1. |
| RBAC (4 tiers) | ✅ Confirmed, source cited wrong originally | Not `auth_services.ts` (doesn't exist) — real logic in `apps/web/src/lib/actions/team.ts` (3 tenant roles: `owner`/`member`/`read_only`) + `apps/web/src/lib/auth/superadmin.ts` (platform super-admin flag). |
| Audit logs (90-day retention) | ✅ Confirmed | Table + `purge_old_audit_logs()` function, invoked daily via `/api/cron/purge-audit-logs`. Real automated purge, not just a documented policy. |
| Incident response plan | ✅ Confirmed, more detailed than expected | `docs/INCIDENT_RESPONSE_PLAYBOOK.md` — real automated detection (`/api/cron/check-incidents`) + email/SMS alerting. Note: the playbook itself documents that only 2 of 4 originally-spec'd detection triggers are implemented (bulk deletion, self-role-escalation) — RLS-rejection and failed-login detection are explicitly out of scope, not silently missing. |
| Data retention/deletion policy | ✅ Confirmed | `/privacy` page has real content; account deletion cron (`/api/cron/purge-deleted-accounts`) runs daily with a 30-day grace period. Caveat: auth user records aren't deleted, only tenant data — a documented scope reduction. |
| Vulnerability scanning (weekly) | ✅ Confirmed | `.github/workflows/zap-baseline-scan.yml`, `cron: '0 2 * * 1'` — genuinely weekly, and genuinely produces reports (Phase 34/34b work, verified via multiple real scan runs). |
| Backups (Supabase standard) | ✅ **Independent backup now verified working** (was ⚪, escalated to 🔴 mid-review, then fixed) | Supabase's own managed backups remain unverified platform config. But the separate nightly `pg_dump` → R2 pipeline (`nightly-backup.yml`) had **never once succeeded since it was built** — missing all 5 secrets, silently failing every night. Fixed same day: created the R2 bucket/token, reset the DB password, fixed a pg_dump/server version mismatch, fixed a `pipefail` bug, made pruning non-fatal. Confirmed via a real successful run. Restore is still untested — see `docs/risk-register.md` Risk #2. |

## Control gaps requiring action

Re-prioritized from the original plan based on what verification actually
found, not the original estimate:

| Gap | Priority | Status |
|---|---|---|
| No MFA for staff | 🔴 Critical | **Fixed 2026-08-16.** TOTP required for all super-admin accounts, enforced in `middleware.ts` via session AAL (covers password/Google/magic-link sign-in uniformly). Supabase Auth built-in, no added cost. Verified end-to-end by the account owner. See `docs/risk-register.md` Risk #3. |
| Backup pipeline was silently broken | 🔴 Critical | **Fixed 2026-08-16.** Discovered mid-review that the nightly backup workflow had never succeeded (missing secrets); fixed and confirmed working the same session. See Risk #2. |
| Disaster recovery restore never tested | ✅ **Fixed 2026-08-16.** | Nightly workflow now restores every backup into a disposable Postgres 17 service container and spot-checks 6 core tables. Found and fixed a real bug along the way — 3 tables using `extensions.gen_random_bytes()` were silently failing to restore. Not a full production-equivalent DR drill (no Auth users/storage), but a materially real, automated, nightly-repeated restore test. See Risk #2. |
| Formal change management | 🟠 High | **Partially fixed 2026-08-16, rest documented honestly.** Found and fixed a real bug: `deployment_log` had zero rows despite dozens of real production deploys — the manual logging script was paired with a "vercel --prod" step that doesn't actually exist (deploys auto-trigger via Vercel's GitHub integration). `.github/workflows/log-deployment.yml` now logs every push to `main` automatically; confirmed via a real run — see `evidence/change-management/2026-08-16-deployment-logging-fixed.md`. Still open, deliberately: no required PR review (branch protection evaluated and rejected — would block the 2-person team's direct-push workflow) and `security-audit`/`typecheck` CI jobs stay non-blocking pending TypeScript debt paydown. See `docs/change-management-policy.md`. |
| No risk register | 🟠 High | ✅ Done — `docs/risk-register.md`, 5 scored risks with real mitigations. |
| No third-party risk management | 🟠 High | ✅ Done — `docs/vendor-risk-assessment.md`, 9 actual integrations (verified against wired-up code, not `.env.example`). |
| No data classification policy | (not in original gap table, added) | ✅ Done — `docs/data-classification-policy.md`. |
| No evidence repository | 🟡 Medium | ✅ Scaffolded, no longer empty — `/evidence`. First real entry: `evidence/access-control/2026-08-16-super-admin-review.md`. |
| No periodic super-admin access review | 🟡 Medium (found during this pass, not in original table) | ✅ **Fixed 2026-08-16.** `scripts/review-super-admins.py` — real per-user MFA status via the Auth admin API (not assumed), last sign-in, account list. Monthly cadence, first run completed. See `docs/risk-register.md` Risk #3, `docs/staff-training.md`. |
| No staff training docs | ✅ **Fixed 2026-08-16.** | `docs/staff-training.md` — new-team-member checklist, ongoing security practices, MFA-recovery procedure (also closes that separately-tracked gap — see Risk #3), review cadence. Grounded in real controls this repo already has, not generic content. |
| No system description / architecture diagram | ✅ **Fixed 2026-08-16.** | `docs/system-description.md` — tech stack, Mermaid architecture diagram, data flow, security boundaries, all verified against code (storage buckets, cron jobs, GitHub workflows, middleware auth flow). Also surfaced that `packages/db/migrations/` is stale and no longer used — noted as follow-up debt, not fixed in this pass. |
| No physical access controls | 🟡 Medium | N/A — remote-only team, confirmed still accurate. |
| CI doesn't block on TypeScript errors | ✅ **Fixed 2026-08-16.** | Went from 135 silent `tsc --noEmit` errors to 0 — first via a `@supabase/ssr` version bump (confirmed root cause for ~half of them), then file-by-file triage for the rest. That triage found **5 real production bugs** along the way (a completely broken CSV-import feature, 3 tenant-scoping omissions causing silent insert failures, an MFA enrollment-cleanup bug), not just type noise. `continue-on-error: true` removed from the `typecheck` CI job, confirmed genuinely blocking via a real run. See `docs/typescript-debt-assessment.md`. |

## What changed from the original plan's assumptions

1. **`packages/db/migrations/` is not a fully reliable source of truth.**
   It disagrees with the live database in at least one place
   (`auth.tenant_id()` is defined there but doesn't exist live;
   `public.tenant_id()` is what's actually deployed, despite its own
   `CREATE FUNCTION` statement not being tracked in any migration file).
   This is now itself a tracked risk (`docs/risk-register.md` Risk #4).
2. **CI doesn't currently block anything** — every job in
   `.github/workflows/ci.yml` has `continue-on-error: true`. This wasn't
   mentioned in the original plan's assumptions and materially affects
   how strong the "change management via CI" story can honestly be.
3. **The vendor list was incomplete.** The original plan named Supabase,
   Vercel, Telnyx, Resend, Cal.com. Verification found Stripe and Helcim
   (both payment processors — arguably the highest-risk vendors in the
   whole list) and Google Calendar weren't mentioned at all, and
   Cal.com's env vars were missing from `.env.example` despite being
   live in code.
4. **3 of the 10 Vercel cron jobs have no evidence of ever firing
   successfully** (checked 2026-08-16): `invoice_escalations`,
   `review_requests`, and `renewal_reminders_sent` all have zero rows,
   which is what `escalate-unpaid-invoices`, `send-review-requests`,
   and `send-renewal-reminders` would each write to on a successful
   run. **This is genuinely ambiguous, not a confirmed bug** — unlike
   the nightly-backup and deployment-logging bugs found earlier this
   session (which errored/were provably unused), an empty table here
   could just as easily mean there's been no unpaid invoice, completed
   order, or due renewal yet for a young app with few real customers.
   Deliberately **not invoked live to check**, since these routes send
   real customer-facing email/SMS — testing them isn't something to do
   unattended. Worth a manual spot-check next time there's a real
   invoice/order/renewal that should have triggered one of these, to
   confirm it actually did.

## Effort actually spent vs. estimated

The original plan estimated ~13 days for the full gap-closure list. This
pass covered: gap verification, 4 policy docs, evidence repo scaffold,
one real RLS fix, and one documentation fix (`.env.example`) — in a
single session. Remaining: MFA enablement, DR test, staff training docs,
system description/diagram — still real work, not yet started.
