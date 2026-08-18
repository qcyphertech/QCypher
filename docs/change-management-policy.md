<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Change Management Policy</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

For QCypher's 2-person team (Thomas — CTO, Felix Sam — CEO). Written to match
how changes actually get made here, not an aspirational process the team
doesn't follow — a policy that describes a fictional workflow is worse
than no policy for SOC 2 purposes, since Type II testing checks
consistency against what's written down.

## Current state (as of 2026-08-16)

- **No branch protection on `main` — confirmed, and confirmed why, on
  2026-08-18.** A QA re-verification pass found the earlier claim that
  `rls-isolation`/`TypeScript` were "blocking on PRs" was false (`main`
  had no protection rule; `GET .../branches/main/protection` returned
  404). Branch protection requiring those two checks was enabled as a
  fix, then reverted the same day: GitHub applies required status
  checks to *every* push to a protected branch, not just PR merges, so
  it immediately rejected a normal `git push` to `main` with "2 of 2
  required status checks are expected" — the checks can't have run yet
  for a commit that was just pushed. There is no GitHub setting that
  gates PR merges on CI without also blocking direct pushes; the two
  share one mechanism. Both Thomas and any AI coding assistant acting
  on Thomas's direction still push commits directly to `main`, and a
  failing PR (if one were ever opened) can still be merged regardless
  of CI status — an accepted, real gap, not a fixed one.
- **CI runs on every push and PR** (`.github/workflows/ci.yml`): secret
  audit, dependency audit (high/critical), TypeScript check, and RLS
  isolation tests (main only). The secret and dependency audits are
  `continue-on-error: true` (report findings, don't block). **TypeScript
  check and RLS isolation tests are blocking**, as of 2026-08-16 — the
  TypeScript debt was paid down from 135 errors to 0 that day (see
  `docs/typescript-debt-assessment.md`), and the RLS suite was fixed to
  actually run at all (it had never once passed before then — see
  `docs/risk-register.md` Risk #4).
- **Deploys are automatic on push to `main`, via a Vercel Deploy Hook**
  (`.github/workflows/deploy.yml`), gated on CI passing — fixed
  2026-08-25, the *third* correction to this line. Earlier corrections:
  (1) this doc originally claimed deploys were automatic via Vercel's
  native GitHub integration, which turned out to have been silently
  broken since the repo moved from the `nevis09` GitHub account to the
  `qcyphertech` org on 2026-08-10 — production drifted ~9 days and 190
  commits behind `main` before that was caught and fixed with a deploy
  hook (2026-08-16); (2) that deploy hook then ran on every push
  *independent of CI* — a commit that failed `tsc --noEmit` in CI still
  deployed, because the hook didn't check CI's result. Confirmed for
  real on commit `29c6187` (2026-08-25): CI failed with a genuine type
  error, but the deploy job (a separate GitHub Actions workflow,
  triggered by the same push event rather than by CI's outcome) had
  already fired and succeeded before the fix landed. `deploy.yml` now
  triggers on the CI workflow's own `completed` event and only proceeds
  `if: github.event.workflow_run.conclusion == 'success'`, so a
  type-check or RLS-test failure blocks the deploy, not just the CI
  status badge.
  Confirmed end-to-end with a real push: GitHub Action fired, Vercel
  built and shipped it, live site updated. No staging environment
  exists — every deploy goes straight to production (a deliberate
  scope decision, not an omission).
- **Deployment logging is now automatic**, not manual — see "What
  every deployment should record" below.
- **Database migrations** are written as `.sql` files, pasted into the
  Supabase SQL Editor by a human, then `supabase migration repair` marks
  them applied and types are regenerated. This is a manual gate by
  construction — a migration cannot silently apply itself.

## Why this isn't "no change management"

Even without branch protection, every change has:

1. **A durable record** — every change is a git commit with a message
   explaining the *why*, not just the *what* (enforced by convention, not
   tooling).
2. **A build gate** — `next build` must succeed locally before a deploy is
   attempted; this catches type/import errors that would break production.
3. **An audit trail via GitHub** — commit history, timestamps, and author
   are all visible and immutable (`git log`, GitHub's commit view).
4. **Database changes require a manual, deliberate paste-and-confirm
   step** — there's no path for a migration to apply itself without a
   human reading it first.

What's genuinely missing, compared to a textbook change-management
control: no second-person review before a change ships, and CI findings
don't block anything.

## Gap and remediation plan

| Gap | Why it's not fixed yet | Remediation |
|---|---|---|
| No required PR review | 2-person team; mandatory review would block solo iteration, which is how this app has shipped every phase to date | Accept as a documented residual risk for now. If the team grows past 2 engineers, revisit. |
| No PR-merge CI gate (a failing PR can still be merged) | Tried 2026-08-18 via GitHub branch protection required-status-checks; it also blocks direct pushes to `main` (same mechanism as PR-merge gating), which broke the team's actual workflow within one commit and was reverted same-day. | Revisit only alongside moving to a PR-based workflow — not fixable in isolation while direct pushes to `main` remain how this team ships. |
| `security-audit` CI job doesn't block | Its dependency-audit step surfaces pre-existing findings that need triage before it can gate merges without red-X'ing unrelated pushes. | Triage `security-audit` findings; moot until the PR-merge gate above is revisited, since there's currently no gate to add it to. |
| Deployment logging relied on a human remembering a manual step | The logging script (`scripts/log-deployment.sh`) was written assuming a manual `vercel --prod` step that turned out not to exist — deploys are actually automatic on push via Vercel's GitHub integration, so there was never a natural moment to trigger the script. Result: zero rows in `deployment_log` despite dozens of real deploys, confirmed 2026-08-16. | **Fixed 2026-08-16.** `.github/workflows/log-deployment.yml` logs every push to `main` automatically — no human step to forget. `scripts/log-deployment.sh` remains available for migrations or notes that need attaching by hand. |
| No staging environment | Deliberate scope decision made early in the project — see prior phase notes | Not planned; accepted trade-off for a 2-person team's velocity. |

## What every deployment records

`.github/workflows/log-deployment.yml` runs on every push to `main`
and inserts a `deployment_log` row automatically — no human step to
remember:

- Timestamp (`deployed_at`, set by the database default)
- Who pushed (`deployed_by`, from the commit author)
- Git commit hash and message
- A link back to the GitHub Actions run that logged it

**What it doesn't capture automatically**: which migration (if any)
shipped alongside a given deploy, and free-form notes. For those, run
`scripts/log-deployment.sh ["migration_file"] ["notes"]` by hand
after a deploy that includes a migration — it inserts a second, more
detailed row rather than trying to edit the automated one. See the SOC
2 evidence repo, `evidence/change-management/`, for periodic exports of
this table as evidence.

## Emergency changes (security patches)

Security-critical fixes (e.g. the CSP/CORS/COOP header work in Phase 34)
follow the same process as any other change — there's no separate
"emergency" fast-path today, because the standard path is already fast
(no mandatory review to bypass). The distinction that matters is
**verification before shipping**: security-relevant changes get an
explicit build + header/behavior check before deploy, documented inline
in the commit message, rather than a formal sign-off step.

## Review cadence

This policy should be revisited whenever the team size changes, or at
minimum annually alongside the risk register review (see
`docs/risk-register.md`).
