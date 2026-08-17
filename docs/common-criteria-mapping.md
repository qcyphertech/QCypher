# SOC 2 Common Criteria (CC1–CC9) Mapping

Maps each Trust Services Criteria category to the real, verifiable
controls in this codebase — not an aspirational description. Where a
category is genuinely thin for a 2-person team, that's stated directly
rather than padded out. Every citation below is a real file, table, or
workflow that exists today; none of this is a plan for future work
unless explicitly marked as a gap.

This uses the 2017 Trust Services Criteria structure (CC1–CC9, the
"Security" / Common Criteria set every SOC 2 report is built on,
regardless of which additional categories — Availability, Confidentiality,
etc. — get added). Confirm this is the structure your auditor expects
before treating this as final; some auditors want a literal
control-by-control table against the full COSO principles underneath
each CC, which this document summarizes but doesn't enumerate line by
line.

---

## CC1 — Control Environment

*Integrity, ethical values, organizational structure, board/management
oversight, commitment to competence, accountability.*

**Status: Thin — real but informal, honestly the weakest section for a
2-person team.**

- Organizational structure: 2 people, both founders — Thomas (CTO,
  technical/engineering decisions) and Felix Sam (CEO, business decisions).
  No board; no separate audit committee. This is accurately described
  in `docs/system-description.md` and `docs/staff-training.md`.
- Accountability: every production change is a git commit attributed to
  a real author (`git log`), and every super-admin account is
  individually identifiable (not a shared login) — see
  `docs/staff-training.md`'s account-tier section.
- Commitment to competence: informal — no documented hiring/training
  program beyond `docs/staff-training.md`'s onboarding checklist,
  because there's been no hiring yet.
- **Gap:** no written code of conduct, no documented management
  oversight structure beyond "the two founders talk to each other."
  For a company this size, auditors typically accept a lightweight
  statement here rather than expecting a formal governance structure —
  but nothing that formal exists yet to point to.

## CC2 — Communication and Information

*Internal/external communication of objectives, responsibilities, and
security expectations.*

**Status: Real, documented.**

- Internal: `docs/staff-training.md` (onboarding checklist, ongoing
  practices, MFA recovery process), `docs/README.md` (index of every
  policy doc), `docs/change-management-policy.md` (how deploys actually
  happen).
- External: `/privacy` page (data retention/deletion policy, real
  content per `docs/gap-assessment.md`'s verification).
- Incident communication: `docs/INCIDENT_RESPONSE_PLAYBOOK.md` defines
  the 24h/48h notification clock for security incidents.

## CC3 — Risk Assessment

*Identifying and analyzing risk to objectives; assessing fraud risk;
identifying and assessing significant change.*

**Status: Real, documented, actively used.**

- `docs/risk-register.md` — 5 scored risks (Likelihood × Impact),
  reviewed quarterly (next: November 2026), each with a real cited
  mitigation, not a generic one.
- Risk #4 in that register (`packages/db/migrations/` vs. live schema
  drift) and the TypeScript-debt finding
  (`docs/typescript-debt-assessment.md`) are both examples of risk
  identification actually happening during normal work, not just at
  review time — see the register's own "Closed finding" write-ups for
  more.

## CC4 — Monitoring Activities

*Ongoing/separate evaluations to ascertain whether controls are present
and functioning.*

**Status: Real, automated, evidenced.**

- Weekly OWASP ZAP baseline scan against production
  (`.github/workflows/zap-baseline-scan.yml`), results in the Admin
  Console Security tab and `evidence/monitoring/`.
- Automated incident detection (`/api/cron/check-incidents`) for bulk
  deletion and self-role-escalation — see
  `docs/INCIDENT_RESPONSE_PLAYBOOK.md` for what is/isn't covered.
- Monthly super-admin access review
  (`scripts/review-super-admins.py`), evidenced in
  `evidence/access-control/`.
- `audit_logs` table capturing every mutating action, 90-day retention,
  daily automated purge.

## CC5 — Control Activities

*Policies and procedures that help ensure management directives (risk
mitigations) are carried out.*

**Status: Real, technically enforced where it matters most.**

- Row-Level Security on 30+ tenant-scoped tables, enforced by
  `public.tenant_id()` reading the JWT — this is the single
  highest-stakes control in the whole system and it's enforced at the
  database layer, not just in application code.
- RBAC: 3 tenant roles (`owner`/`member`/`read_only`,
  `apps/web/src/lib/actions/team.ts`) + platform super-admin flag
  (`apps/web/src/lib/auth/superadmin.ts`).
- RLS isolation is tested, not just declared — 8 test files, 91 tests,
  now blocking in CI on both push-to-main and pull requests (see
  `docs/risk-register.md` Risk #1).

## CC6 — Logical and Physical Access Controls

*Access provisioning/deprovisioning, authentication, and physical
security.*

**Status: Real for logical access; physical is N/A and correctly so.**

- Authentication: Supabase Auth (password, Google OAuth, magic link).
- MFA: TOTP required for all super-admin accounts, enforced via session
  AAL in `middleware.ts` — applies uniformly regardless of sign-in
  method. See `docs/risk-register.md` Risk #3.
- Access review: monthly, automated, evidenced (see CC4 above).
- Deprovisioning: **not automated** — no documented "remove access
  when someone leaves" procedure beyond manually disabling the account
  in Supabase's dashboard. For a 2-person team this hasn't been
  exercised for real; flagging it as thin rather than claiming a
  process that's never been run.
- Physical access controls: **N/A, confirmed accurate** — fully remote
  team, no office (`docs/staff-training.md`, `docs/gap-assessment.md`).

## CC7 — System Operations

*Detecting and responding to security events, incident management,
recovery.*

**Status: Real, but "tested" is partial — see the honest caveat.**

- Detection: automated (bulk deletion, self-role-escalation via
  `/api/cron/check-incidents`); vulnerability scanning (ZAP, weekly).
- Response: `docs/INCIDENT_RESPONSE_PLAYBOOK.md` defines the process
  and notification timeline.
- Recovery: independent nightly backup + automated restore test into a
  disposable database, confirmed working —
  `evidence/availability/2026-08-16-backup-restore-verified.md`.
- **Gap:** the incident response *plan* is real and the *detection*
  code runs for real, but there is no record of an actual tabletop
  drill or simulated-incident walkthrough. "Formalized" is true;
  "tested" (in the sense auditors usually mean — a deliberate exercise
  with a written outcome) is not yet true. See
  `docs/qa-checklist-status.md`.

## CC8 — Change Management

*Authorizing, designing, developing, testing, approving, and
implementing changes to infrastructure, data, and software.*

**Status: The weakest technical control area — documented honestly, not
inflated.**

- What's real: every change is a git commit with an explanatory
  message; a local build must pass before any deploy; GitHub provides
  an immutable audit trail; database migrations require a manual
  paste-and-confirm step (no auto-apply path).
- What's genuinely missing, per `docs/change-management-policy.md`:
  **no required PR review before merging to `main`**, and **CI checks
  other than `rls-isolation` don't block merges**
  (`continue-on-error: true` on `security-audit` and `typecheck`).
  Branch protection was evaluated and deliberately not enabled — see
  that policy doc for the reasoning (would block the 2-person team's
  direct-push workflow).
- This is the control area most likely to draw direct auditor
  questions. The mitigating argument is documented in
  `docs/change-management-policy.md`'s "Why this isn't 'no change
  management'" section — worth having read before an auditor
  conversation, since it's the honest defense, not a workaround.

## CC9 — Risk Mitigation

*Vendor and business-partner risk management; business continuity.*

**Status: Documented; one real gap (vendor SOC 2 reports not yet
collected).**

- `docs/vendor-risk-assessment.md` — 9 real integrations (verified
  against wired-up code, not `.env.example`), each with a stated risk
  level and shared-responsibility breakdown.
- Business continuity: independent backup/restore pipeline (see CC7),
  no staging environment or multi-region failover — a stated, deliberate
  trade-off for team size, not an oversight.
- **Gap:** vendor risk assessment currently documents what each vendor
  *publicly claims* about their own SOC 2 status — no actual SOC 2
  report has been requested from or received by any vendor yet. See
  `docs/qa-checklist-status.md`'s "Requires your action" section.

---

## Summary table

| CC | Category | Status |
|---|---|---|
| CC1 | Control Environment | 🟡 Thin — real but informal |
| CC2 | Communication & Information | ✅ Documented |
| CC3 | Risk Assessment | ✅ Documented, active |
| CC4 | Monitoring Activities | ✅ Automated, evidenced |
| CC5 | Control Activities | ✅ Enforced, tested |
| CC6 | Logical & Physical Access | 🟡 Strong except deprovisioning |
| CC7 | System Operations | 🟡 Real, drill not yet run |
| CC8 | Change Management | 🔴 Weakest — no PR review/blocking CI |
| CC9 | Risk Mitigation | 🟡 Documented, vendor reports not collected |

None of the 🟡/🔴 items above are silently missing — each has an
existing doc describing the real state and, where relevant, a
remediation plan. See `docs/qa-checklist-status.md` for which of these
require your (Thomas/Felix Sam's) direct action vs. further engineering
work.

## Review cadence

Revisit this mapping whenever a new control is added or removed, and at
minimum alongside the quarterly risk register review
(`docs/risk-register.md`).
