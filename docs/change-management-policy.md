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

- **No branch protection on `main`.** Both Thomas and any AI coding
  assistant acting on Thomas's direction push commits directly to `main`.
  There is no mandatory pull request or peer review step today.
- **CI runs on every push and PR** (`.github/workflows/ci.yml`): secret
  audit, dependency audit (high/critical), TypeScript check, and RLS
  isolation tests (main only). **All four jobs are configured with
  `continue-on-error: true`** — they report findings but do not block
  anything. This is a known, deliberate gap, not an oversight: the
  TypeScript check has pre-existing errors unrelated to any single change
  (fixing them is out of scope for a quick toggle), so making it blocking
  today would immediately red-X every future push.
- **Deploys are automatic on push to `main`**, via Vercel's GitHub
  integration — confirmed 2026-08-16 by cross-checking `vercel ls`
  against git push history (dozens of production deploys, one per
  push, no separate manual `vercel --prod` step involved). This
  corrects an earlier version of this doc, which assumed a manual
  build-then-`vercel --prod` step — that assumption was wrong, and it's
  *why* `deployment_log` had zero rows despite real deploys happening:
  the logging script was written to pair with a manual step that
  doesn't actually exist in the real workflow. No staging environment
  exists — every deploy goes straight to production (a deliberate scope
  decision, not an omission).
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
| `security-audit` and `typecheck` CI jobs don't block | `typecheck` has 135 pre-existing errors (see `docs/typescript-debt-assessment.md`) — flipping it to blocking today would red-X every future push regardless of what changed. `security-audit`'s dependency-audit step also surfaces pre-existing findings that need triage before it can block. | Pay down the TypeScript debt (tracked, root cause suspected), triage `security-audit` findings, then flip both to blocking. `rls-isolation` — the highest-value gate for a multi-tenant app — is **already fixed**: it runs on both `push` to `main` and `pull_request`, and is genuinely blocking (2026-08-16). |
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
