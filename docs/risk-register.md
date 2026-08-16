# Risk Register

Reviewed quarterly (see cadence note at the bottom). Risk score =
Likelihood (1–5) × Impact (1–5). Every mitigation cited here points to a
real, verified mechanism in the codebase — not an aspirational control.
Verification pass run 2026-08-16 as part of Phase 35 gap assessment.

---

## Risk #1: Tenant Data Exposure (Cross-Tenant Access / IDOR)

**Likelihood:** Medium (2/5) — the class of bug that's easy to introduce
in any multi-tenant app when a new table forgets RLS (see "closed" entry
below for a real example).
**Impact:** Critical (5/5) — reputational, legal, and every customer's
trust simultaneously.
**Risk score:** 10 (HIGH)

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
- RLS isolation test suite (`pnpm test:isolation`, runs in CI on `main`)
  — two real test tenants, verifies neither can read the other's data.

**Residual risk:** Medium. RLS coverage is broad but was proven
non-exhaustive by this same review — see the closed finding below. The
CI isolation test only runs post-merge on `main`, not pre-merge on PRs
(see `docs/change-management-policy.md`), so a regression could still
reach production before being caught.

**Closed finding (evidence RLS review actually works):**
`order_number_counters` had a `tenant_id` column with no RLS policy at
all — found 2026-08-16 during this same gap assessment, fixed same day
(migration `20260820000002_order_number_counters_rls.sql`). No app code
queried the table directly, so this wasn't exploited through the UI, but
it was a real, direct-API-reachable gap. Kept here as evidence the
review process finds and closes real issues, not just documents existing
controls.

---

## Risk #2: Vendor/Infrastructure Outage

**Likelihood:** Low (2/5) — Supabase and Vercel both publish high uptime
SLAs; outages are infrequent industry-wide.
**Impact:** High (4/5) — the app is fully unusable if either is down;
no self-hosted fallback.
**Risk score:** 8 (MEDIUM)

**Mitigation:**
- Supabase handles managed backups (rolling window — see "needs manual
  verification" note below, this is a platform setting not app code).
- No staging environment and no multi-region failover configured — this
  is a deliberate scope trade-off for a 2-person team, not an oversight.

**Residual risk:** Medium-High. This is the least-mitigated risk in this
register. **A real disaster-recovery restore has never been tested** —
see `docs/system-description.md` gap notes / Phase 35 task list.
Backup *existence* is inferred from Supabase's platform defaults, not
verified.

---

## Risk #3: Staff Account Compromise

**Likelihood:** Low (2/5) — 2-person team, both technically sophisticated.
**Impact:** Critical (5/5) — a compromised super-admin account can read
every tenant's data.
**Risk score:** 10 (HIGH — impact-driven, not likelihood-driven)

**Mitigation:**
- Role-based access control: 3 tenant-level roles (`owner`, `member`,
  `read_only` — `apps/web/src/lib/actions/team.ts`) plus a platform-level
  `is_super_admin` flag (`apps/web/src/lib/auth/superadmin.ts`), enforced
  in both JWT claims and RLS policies.
- `audit_logs` captures all actions taken by any authenticated user,
  including super admins.

**Residual risk: High.** **No MFA is currently enabled for staff
accounts.** This is the single largest open gap in this register — a
compromised password alone is sufficient to access the super-admin
console. Supabase Auth supports MFA natively; enabling it is
configuration, not development. This should be the first Phase 35
control gap closed.

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

---

## Risk #5: Change Shipped Without Independent Review

**Likelihood:** Medium (3/5) — every current change ships this way, not
an edge case.
**Impact:** Medium (3/5) — mitigated by fast rollback (redeploy previous
commit) and the fact most changes are additive, not destructive.
**Risk score:** 9 (MEDIUM-HIGH)

**Mitigation:** See `docs/change-management-policy.md` — build must pass
locally before deploy; CI runs (non-blocking) on every push; git history
is the audit trail.

**Residual risk:** Medium. Accepted trade-off for a 2-person team's
velocity — see the change-management policy for the explicit reasoning
and remediation options if the team grows.

---

## Review cadence

Reviewed quarterly by Thomas + Felix. Each review should:
1. Re-score every risk based on what's actually changed (new controls,
   new vulnerabilities, new vendors).
2. Add any risk discovered since the last review — including ones found
   incidentally, like Risk #1's closed finding and Risk #4 above.
3. Record meeting notes in `evidence/risk-assessment/` with the review
   date in the filename.

**Next review: November 2026** (quarterly from 2026-08-16).
