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

- [ ] **Change management process enforced in GitHub** — mixed
      progress, still genuinely partial. **Fixed 2026-08-16:**
      deployment logging was completely unused (`deployment_log` had
      zero rows against dozens of real deploys — the manual script was
      paired with a `vercel --prod` step that doesn't actually exist)
      — now automatic via `.github/workflows/log-deployment.yml`,
      confirmed working. **Still deliberately not enforced:** no
      required PR review (branch protection was evaluated and rejected
      because it would block the 2-person team's direct-push
      workflow — that decision wasn't revisited, since it wasn't part
      of what was broken), and `security-audit`/`typecheck` CI jobs
      remain non-blocking pending TypeScript debt paydown. The
      checklist's word "enforced" still overstates reality here, and
      that's a stated, deliberate trade-off — not an oversight.
- [ ] **Vendor assessments completed (SOC 2 reports collected)** —
      `docs/vendor-risk-assessment.md` documents 9 vendors and what
      each *publicly claims* about their own compliance, but **no
      actual SOC 2 report has been requested from or provided by any
      vendor**. `docs/vendor-soc2-report-tracker.md` researches and
      records the real request path for each one (self-serve portal
      URL, or who to email, sourced 2026-08-16) so requesting them is
      minutes of work, not research — but the actual request still
      needs your login/email. See "Requires your action" below.
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

- [ ] **Formal policies signed by executives (Thomas + Felix)** —
      `docs/policy-sign-off.md` is prepared: why this matters for the
      audit (CC1/CC2), three concrete options with a recommendation
      (a dated commit with both names — matches this project's
      existing git-native evidence pattern), the 5 policies to review,
      and a blank sign-off table to fill in. Still needs the actual
      15-30 minutes of both of you reading each policy and recording
      the outcome — that can't be done for you.
- [ ] **6-month evidence collection started (no gaps)** — collection
      *started* today (2026-08-16); a 6-month gapless window is a
      calendar fact that can't be accelerated. What's automatable
      about "no gaps" specifically **is now done**:
      `.github/workflows/evidence-gap-check.yml` runs monthly, compares
      each `evidence/` category's most recent file against its
      documented cadence, and opens a GitHub issue automatically if
      anything goes stale — so a missed month gets caught instead of
      silently becoming a gap discovered at audit time (the same
      failure mode already found twice this session for the nightly
      backup workflow and deployment logging). Confirmed working via a
      real run. The actual months of evidence still have to happen —
      nothing accelerates that.
- [ ] **No audit findings from Type I (if pursuing it)** — whether to
      pursue one is analyzed in full in
      `docs/type1-vs-type2-decision.md`: what each report actually
      certifies, the real trade-off table (time/cost/deal-closing
      value), and why QCypher's situation narrows it to one real
      question — is there a deal or prospect waiting on a report in
      the next 1-3 months? If yes, Type I first; if no, skip straight
      to Type II. Still a business call only you and Felix can make.
- [ ] **Auditor selected + engagement letter signed** —
      `docs/auditor-selection.md` researches this: realistic cost/
      timeline for a 2-person company ($12K-$40K depending on Type I
      vs II), a shortlist of boutique/startup-oriented firms with
      sourced pricing, a GRC-platform (Vanta/Drata/Secureframe)
      buy-vs-skip analysis (recommends skipping — the manual evidence
      trail already built this session covers most of what those
      platforms automate), and the questions to ask before signing.
      Still requires choosing and contracting with a real firm —
      nothing to automate there.
- [ ] **Timeline agreed (6-9 month observation period)** — depends on
      the auditor engagement above; also gated on when evidence
      collection genuinely started (today).
- [ ] **SOC 2 reports collected from vendors** — every vendor's real
      request path is now researched and written down
      (`docs/vendor-soc2-report-tracker.md`): Supabase is a 2-minute
      self-serve form, Stripe is an email to security@stripe.com,
      Vercel has a Trust Center "Get access" flow, etc. Highest
      priority: Supabase and Stripe (CRITICAL risk vendors) — do those
      two first if time is short.
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
