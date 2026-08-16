# Phase 35 QA Checklist — Status

Run against the exact checklist provided 2026-08-16, item by item,
verified against real code/CI/evidence state — not assumed. Two
categories: things this session could fix and did, and things that
genuinely require a human (Thomas/Felix) to act — those are **not**
marked done, even where the supporting infrastructure is ready.

## Done, verified

- [x] **MFA enabled for all staff (documented)** — TOTP required for
      all super-admins, enforced in `middleware.ts` via session AAL.
      `docs/staff-training.md`, `docs/risk-register.md` Risk #3.
- [x] **Risk register created (quarterly reviews scheduled)** —
      `docs/risk-register.md`, 5 scored risks, next review Nov 2026.
- [x] **System description & architecture diagram completed** —
      `docs/system-description.md`.
- [x] **Disaster recovery procedure documented + tested** —
      `nightly-backup.yml` restores every backup into a disposable DB
      and verifies row counts. `evidence/availability/2026-08-16-backup-restore-verified.md`.
- [x] **Evidence repository created (organized by control)** —
      `/evidence`, structure in `evidence/README.md`.
- [x] **Audit log retention configured (90+ days)** — `audit_logs` +
      daily `purge_old_audit_logs()` cron.
- [x] **Access reviews scheduled (monthly)** —
      `scripts/review-super-admins.py`, first run recorded in
      `evidence/access-control/2026-08-16-super-admin-review.md`.
- [x] **Backup verification procedure documented + tested** — same as
      DR item above; both creation and restore verified.
- [x] **Data classification policy written** —
      `docs/data-classification-policy.md`.
- [x] **All 9 Common Criteria (CC1-9) addressed** —
      `docs/common-criteria-mapping.md`, each CC mapped to real,
      cited controls. Honestly graded per category (CC8 change
      management and CC1 control environment are marked weakest, not
      papered over) — see that doc's summary table. Confirm with your
      auditor whether they want this narrative format or a literal
      COSO-principle-by-principle table before treating it as final.

## Partially done — real gap, honestly stated

- [ ] **Change management process enforced in GitHub** — deliberately
      **not** enforced. `docs/change-management-policy.md` documents
      the real informal process (build-locally-then-deploy,
      `scripts/log-deployment.sh`) and states explicitly that branch
      protection was evaluated and rejected because it would block the
      2-person team's direct-push workflow. This is an honest
      documentation of a real gap, not a false "enforced" claim — worth
      knowing the checklist wording ("enforced") doesn't match reality
      here, and that's a deliberate trade-off, not an oversight.
- [ ] **Vendor assessments completed (SOC 2 reports collected)** —
      `docs/vendor-risk-assessment.md` documents 9 vendors and what
      each *publicly claims* about their own compliance, but **no
      actual SOC 2 report has been requested from or provided by any
      vendor**. Collecting those requires contacting each vendor
      (Supabase, Vercel, Stripe, etc.) directly — see "Requires your
      action" below.
- [ ] **Incident response plan formalized + tested** — formalized:
      yes (`docs/INCIDENT_RESPONSE_PLAYBOOK.md`, with real automated
      detection for 2 of 4 originally-planned triggers). **Tested:
      prepared, not yet run.** `docs/incident-response-tabletop-drill.md`
      is a full drill script and recording template — a real scenario
      (manually-reported cross-tenant exposure, chosen specifically
      because it's the playbook's least-tested path, not the easy
      cron-detected case), step-by-step walkthrough questions tied to
      each playbook phase, and an outcome template to fill in. This is
      genuinely as far as this can go without you and Felix — running
      a tabletop drill is, by definition, two people actually talking
      it through. See "Requires your action" below.

## Requires your action — cannot be done autonomously

- [ ] **Formal policies signed by executives (Thomas + Felix)** — the
      5 policy docs in `/docs` are written and accurate, but nothing
      is "signed." This needs an actual decision from both of you on
      how you want to formalize sign-off (a signed PDF, a dated commit
      with both names, a Google Doc with signatures — your call), then
      doing it.
- [ ] **6-month evidence collection started (no gaps)** — collection
      *started* today (2026-08-16); a 6-month gapless window is a
      calendar fact that can't be accelerated. The evidence repo
      structure and first entries per category exist now specifically
      so the clock can start.
- [ ] **No audit findings from Type I (if pursuing it)** — depends on
      whether you're pursuing a Type I first. Not decided in this
      session; a decision only you can make.
- [ ] **Auditor selected + engagement letter signed** — requires
      choosing and contracting with a real auditing firm. Nothing to
      automate here.
- [ ] **Timeline agreed (6-9 month observation period)** — depends on
      the auditor engagement above; also gated on when evidence
      collection genuinely started (today).
- [ ] **SOC 2 reports collected from vendors** — requires actually
      emailing/contacting Supabase, Vercel, Stripe, Resend, Telnyx,
      Cal.com, Google, and Helcim's trust/security teams and requesting
      their reports (most publish them via a self-serve trust portal
      once you sign an NDA — Vercel and Supabase both do this).
- [ ] **Incident response drill** — the script is written
      (`docs/incident-response-tabletop-drill.md`); you and Felix need
      to actually block ~30-45 minutes, run through it together, and
      fill in the "Outcome" section, then save a copy into
      `evidence/monitoring/` with the real date.

## What changed this session beyond the checklist itself

A few things were fixed along the way that the checklist doesn't call
out by name but materially affect its accuracy:
- `docs/vendor-risk-assessment.md`'s Supabase entry had a stale claim
  ("restore has never been tested") — corrected once the restore test
  actually started passing, same session.
- `.github/workflows/ci.yml`'s `rls-isolation` job now runs on PRs, not
  just post-merge to `main` — confirmed via a real throwaway PR
  (opened, watched pass, closed — not merged).
- `tsc --noEmit` has 135 real, currently-silent errors — assessed and
  documented (`docs/typescript-debt-assessment.md`), not blind-fixed;
  root cause suspected to be a `@supabase/ssr` version 7 minors behind
  latest, recommended as a scoped follow-up with its own test pass.
