<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Risk Register</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

Reviewed quarterly (see cadence note at the bottom). Risk score =
Likelihood (1–5) × Impact (1–5). Every mitigation cited here points to a
real, verified mechanism in the codebase — not an aspirational control.
Verification pass run 2026-08-16 as part of Phase 35 gap assessment.

---

## Risk #1: Tenant Data Exposure (Cross-Tenant Access / IDOR)

**Likelihood:** Medium (2/5) — the class of bug that's easy to introduce
in any multi-tenant app when a new table forgets RLS (see "closed"
entries below for two real examples this same review found).
**Impact:** Critical (5/5) — reputational, legal, and every customer's
trust simultaneously.
**Risk score:** 8 (HIGH — down from 10; full suite now genuinely running)

**Mitigation:**
- Row-Level Security on tenant-scoped tables, enforced via
  `public.tenant_id()` reading `auth.jwt() -> app_metadata -> tenant_id`
  — confirmed present on 30 tables as of this review.
- Weekly automated vulnerability scanning (Phase 34, OWASP ZAP baseline)
  — passive scan, won't catch IDOR directly, but catches missing
  security headers and misconfigurations that widen the attack surface.
- `audit_logs` table (90-day retention) records every mutating action,
  enabling forensic reconstruction if cross-tenant access is suspected.
- Incident response playbook (`docs/INCIDENT_RESPONSE_PLAYBOOK.md`) with
  a defined 24h/48h notification clock.
- **RLS isolation test suite — fully working as of 2026-08-16, all 8
  files.** Was completely non-functional before this review (see the
  first closed finding below for the fix history). Once the first 4
  files were fixed, 2 more real bugs turned up while provisioning the
  `TEST_TENANT_A/B` fixtures the remaining 4 files need:
  `admin.auth.admin.getUserByEmail()` doesn't exist in the installed
  `supabase-js` version (all 4 files used it identically), and one file
  re-authenticated on every single `test()` case (22 logins) instead of
  once per file, tripping Supabase's own sign-in rate limit even on a
  clean run. Both fixed. Confirmed via a real CI run: 8/8 suites pass,
  91 tests, `continue-on-error` removed — a genuine blocking check now,
  not a decorative one.

**Residual risk:** Medium (down from High now that the full suite runs,
not just half of it). What's still open: the CI isolation test only runs
post-merge on `main`, not pre-merge on PRs (see
`docs/change-management-policy.md`), so a regression could still reach
production before being caught. 9 tests (across 2 files) remain
deliberately skipped — not a coverage gap in RLS itself, but a mismatch
between what those specific tests assumed (Bearer-token API auth) and
what this app's cookie-only auth model actually supports; see the second
closed finding below.

**Closed finding #1 (evidence RLS review actually works — a real gap,
not just a documentation exercise):**
`order_number_counters` had a `tenant_id` column with no RLS policy at
all — found 2026-08-16 during this same gap assessment, fixed same day
(migration `20260820000002_order_number_counters_rls.sql`). No app code
queried the table directly, so this wasn't exploited through the UI, but
it was a real, direct-API-reachable gap.

**Closed finding #2 (a genuinely exploitable one, caught the moment the
test suite actually ran for the first time):**
`invite_tokens` — which stores the raw invite token string plus the
invited email — had **no RLS at all**, by original design
(`packages/db/migrations/00004_phase2_admin.sql`: "client code never
touches this table"). That assumption was wrong: nothing stops an
authenticated user from querying any public-schema table directly via
the Supabase client SDK, regardless of what the app's own code does. Any
authenticated tenant user could read every other tenant's pending
invites and insert fake ones for any `tenant_id`. Found and fixed same
day (migration `20260821000002_invite_tokens_rls.sql`, RLS enabled with
zero policies — correct here, since only `service_role` legitimately
touches this table). This is the clearest evidence in this whole
register that finishing the test suite, not just writing policy docs
about it, was worth doing.

---

## Risk #2: Vendor/Infrastructure Outage

**Likelihood:** Low (2/5) — Supabase and Vercel both publish high uptime
SLAs; outages are infrequent industry-wide.
**Impact:** High (4/5) — the app is fully unusable if either is down;
no self-hosted fallback.
**Risk score:** 4 (LOW-MEDIUM — down from 8; see mitigation below)

**Mitigation:**
- Supabase handles managed backups (rolling window — platform setting,
  not app code, not independently verified by QCypher).
- **Independent nightly backup + restore pipeline, fixed and verified
  working 2026-08-16** (`.github/workflows/nightly-backup.yml` +
  `scripts/backup-verify.sh`): `pg_dump` → gzip → upload to a dedicated
  Cloudflare R2 bucket (`qcypher-backups`) → upload-integrity check
  (byte-size match) → **restore into a disposable Postgres 17 service
  container → spot-check 6 core tables' row counts** → 30-day-old backup
  pruning. This workflow existed since before this review but **had
  never once succeeded** — it was missing all 5 required secrets, so it
  silently failed every night with no one noticing (GitHub Actions has
  no alerting wired to workflow failure beyond the Actions UI itself).
  Fixed same day: created the R2 bucket + scoped API token, reset the
  Supabase DB password to get a usable connection string, fixed a
  `pg_dump`/server major-version mismatch (runner ships v16, Supabase
  runs 17.6), fixed a `pipefail` false-negative in the table-presence
  check, made the prune step best-effort, and — critically — actually
  enabled and debugged the restore path rather than leaving it optional:
  found and fixed a real bug where 3 tables (`orders`, `invite_tokens`,
  `payment_requests`) use `extensions.gen_random_bytes()` in a column
  default, which was silently failing to restore (along with everything
  referencing those tables) because `--schema=public` doesn't dump
  Supabase's `extensions` schema. Confirmed via a real run: full backup,
  full restore, all 54 tables present with correct row counts.
- No staging environment and no multi-region failover configured — this
  is a deliberate scope trade-off for a 2-person team, not an oversight.
- **Vercel outage runbook added 2026-08-16** (`docs/vercel-outage-runbook.md`):
  written after actually checking the codebase for Vercel-specific
  lock-in — there's very little (no `@vercel/*` packages, no edge
  runtime, no proprietary image loader). The one real dependency is the
  10 cron jobs in `vercel.json`, which the runbook shows how to
  replace with GitHub Actions scheduled workflows (a pattern already
  proven working elsewhere in this repo). A documentation-only
  mitigation, not a tested live failover — appropriate cost for the
  actual likelihood here.

**Residual risk:** Low-Medium (down from Medium). Both backup *creation*
and *restore* are now genuinely verified working on every nightly run,
not just assumed — this is the strongest-evidenced control in this
entire register. What's still open: the restore target is a disposable
scratch container, not a full Supabase-equivalent environment (Supabase
Auth users, storage objects, and `auth`-schema-dependent RLS policies
aren't part of this test) — a real incident would still involve manual
work beyond what's automated here. The tested guarantee is now "a
recent backup exists, is byte-verified in R2, and its schema+data
demonstrably restores," which is a materially stronger claim than
before this fix, even though it isn't a full production-equivalent
disaster-recovery drill.

---

## Risk #3: Staff Account Compromise

**Likelihood:** Low (2/5) — 2-person team, both technically sophisticated.
**Impact:** Critical (5/5) — a compromised super-admin account can read
every tenant's data.
**Risk score:** 6 (MEDIUM — down from 10; see mitigation below)

**Mitigation:**
- Role-based access control: 3 tenant-level roles (`owner`, `member`,
  `read_only` — `apps/web/src/lib/actions/team.ts`) plus a platform-level
  `is_super_admin` flag (`apps/web/src/lib/auth/superadmin.ts`), enforced
  in both JWT claims and RLS policies.
- `audit_logs` captures all actions taken by any authenticated user,
  including super admins.
- **MFA (TOTP) required for super admins — closed 2026-08-16.** Was the
  single largest open gap in this register; a compromised password alone
  used to be sufficient to reach the super-admin console. Enforced in
  `middleware.ts` via the session's Authenticator Assurance Level, so it
  applies uniformly across every sign-in method (password, Google OAuth,
  magic link) rather than gating one login path — a super admin with no
  verified factor is redirected to mandatory enrollment
  (`/auth/mfa-setup`) before reaching any protected route; one with a
  verified factor but an aal1 session is redirected to
  `/auth/mfa-challenge`. Uses Supabase Auth's built-in TOTP — no added
  vendor, no per-verification cost. Deliberately scoped to super admins
  only, not tenant users — that's the account tier that actually carries
  cross-tenant risk, and it avoids adding login friction for paying
  customers. Verified working end-to-end by the account owner
  (enrolled, scanned, confirmed via a real code).

**Residual risk: Low** (down from Low-Medium). The core gap — a bare
password being sufficient for full cross-tenant access — is closed. MFA
reset now has a documented (if still manual, not self-service) recovery
path — see "Lost your MFA device" in `docs/staff-training.md`. A real
periodic access review process now exists too —
`scripts/review-super-admins.py`, checking both account list correctness
and actual per-user MFA enrollment status (via the Auth admin API's
`/factors` endpoint, not just assumed) — first run completed 2026-08-16,
see `evidence/access-control/2026-08-16-super-admin-review.md`. Monthly
cadence going forward. What's still open: if both super admins lose
their MFA device simultaneously, recovery requires direct Supabase
support, not anything this app can do itself — an accepted residual risk
for a 2-person team, not something worth building self-service recovery
infrastructure for.

---

## Risk #4: Documentation / Migration-File Drift

**Likelihood:** Medium (3/5) — already observed directly, not
hypothetical.
**Impact:** Medium (3/5) — doesn't cause a breach by itself, but can
cause a *wrong fix* during an incident (e.g. writing an RLS policy
against a function that doesn't exist in production).
**Risk score:** 9 (MEDIUM-HIGH)

**Mitigation:** None currently — newly identified 2026-08-16.

**Evidence this is real, not theoretical:** during this same gap
assessment, `packages/db/migrations/00001_init_schema.sql` defines
`auth.tenant_id()`, and that name was used in a first draft of the
`order_number_counters` RLS fix above — which **failed against the live
database** with `function auth.tenant_id() does not exist`. The
live/correct function is `public.tenant_id()`, used across 18+ other
migration files but whose own `CREATE FUNCTION` statement isn't present
in any tracked migration file (it was applied directly at some point,
consistent with this project's established pattern of pasting SQL into
the Supabase SQL Editor). `packages/db/migrations/` and
`supabase/migrations/` also disagree with each other on RLS coverage for
several tables — neither directory alone is a reliable source of truth
for what's actually live.

**Recommended mitigation:** periodically diff actual live schema
(`pg_policies`, `pg_proc`) against both migration directories and
reconcile; treat any migration file that references a function not
provably defined elsewhere as suspect until verified against production.

**Second closed finding (2026-08-16, same day, found via TypeScript
triage rather than a schema diff):** the entire `imports` table from
`packages/db/migrations/00011_phase11_imports.sql` was never applied
live — confirmed via a direct query returning "Could not find the
table 'public.imports' in the schema cache." This is the most
consequential instance of this risk yet: `/contacts/import`, a real,
linked, user-facing feature, has been unable to import a single
contact since it shipped, because `commitImport()` inserts into
`imports` before inserting any contacts. Fixed with a new migration
(`supabase/migrations/20260822000001_phase11_imports_table.sql`),
using `public.tenant_id()` instead of the stale `public.get_tenant_id()`
referenced in the original file, applied via `supabase db push`, and
verified with a real insert/delete round-trip. While applying it,
also found (and repaired via `supabase migration repair`) 3 more
migrations already correctly applied live but never marked in the
CLI's migration-history table — the same drift pattern as this whole
risk, just in the other direction (applied-but-unrecorded rather than
recorded-but-unapplied). See `docs/typescript-debt-assessment.md`.

---

## Risk #5: Change Shipped Without Independent Review

**Likelihood:** Medium (3/5) — every current change ships this way, not
an edge case.
**Impact:** Medium (3/5) — mitigated by fast rollback (redeploy previous
commit) and the fact most changes are additive, not destructive.
**Risk score:** 9 (MEDIUM-HIGH)

**Mitigation:** See `docs/change-management-policy.md` — build must pass
locally before deploy; CI runs (non-blocking) on every push; git history
is the audit trail. **Improved 2026-08-16:** deployment logging is now
automatic (`.github/workflows/log-deployment.yml`) rather than a manual
step that turned out to have never actually fired — every push to
`main` now creates a real `deployment_log` row with commit hash,
message, and author, no human step to forget. See
`evidence/change-management/2026-08-16-deployment-logging-fixed.md`.

**Residual risk:** Medium (audit trail is now more reliable, but the
core gap — no independent review before a change ships — is unchanged).
Accepted trade-off for a 2-person team's velocity — see the
change-management policy for the explicit reasoning and remediation
options if the team grows.

---

## Review cadence

Reviewed quarterly by Thomas + Felix Sam. Each review should:
1. Re-score every risk based on what's actually changed (new controls,
   new vulnerabilities, new vendors).
2. Add any risk discovered since the last review — including ones found
   incidentally, like Risk #1's closed finding and Risk #4 above.
3. Record meeting notes in `evidence/risk-assessment/` with the review
   date in the filename.

**Next review: November 2026** (quarterly from 2026-08-16).
