# SOC 2 Gap Assessment

Verified against the actual codebase and live database on 2026-08-16 —
not assumed from the original phase plan. Where the original claim was
wrong or overstated, that's called out explicitly rather than quietly
corrected.

## Existing controls

| Control | Status | Evidence |
|---|---|---|
| Multi-tenant RLS | ⚠️ **Mostly true, one gap found & fixed** | 30 tenant-scoped tables had RLS (`packages/db/migrations/*`, various phases). `order_number_counters` had a `tenant_id` column with **no RLS at all** — found and fixed same day (`supabase/migrations/20260820000002_order_number_counters_rls.sql`). See `docs/risk-register.md` Risk #1. |
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
| Disaster recovery restore never tested | 🟠 High (downgraded from Critical now that backup creation is verified) | **Still open.** A verified backup now genuinely exists in R2, but restoring from it has never been exercised. `RESTORE_DB_URL` is supported by the script but intentionally left unset for now. See Risk #2. |
| Formal change management | 🟠 High | **Documented honestly, not "fixed."** `docs/change-management-policy.md` describes the real (informal) process and why it hasn't been formalized yet, rather than claiming a PR-review gate that doesn't exist. Branch protection was evaluated and deliberately not enabled — it would block the team's actual direct-push workflow. |
| No risk register | 🟠 High | ✅ Done — `docs/risk-register.md`, 5 scored risks with real mitigations. |
| No third-party risk management | 🟠 High | ✅ Done — `docs/vendor-risk-assessment.md`, 9 actual integrations (verified against wired-up code, not `.env.example`). |
| No data classification policy | (not in original gap table, added) | ✅ Done — `docs/data-classification-policy.md`. |
| No evidence repository | 🟡 Medium | ✅ Scaffolded — `/evidence`, structure + collection cadence documented. Still empty pending the DR test; MFA is now live and could have its first evidence entry (enrollment confirmation) added. |
| No staff training docs | 🟠 High | **Not started.** Out of scope for this pass. |
| No system description / architecture diagram | 🟠 High | **Not started.** Out of scope for this pass. |
| No physical access controls | 🟡 Medium | N/A — remote-only team, confirmed still accurate. |

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

## Effort actually spent vs. estimated

The original plan estimated ~13 days for the full gap-closure list. This
pass covered: gap verification, 4 policy docs, evidence repo scaffold,
one real RLS fix, and one documentation fix (`.env.example`) — in a
single session. Remaining: MFA enablement, DR test, staff training docs,
system description/diagram — still real work, not yet started.
