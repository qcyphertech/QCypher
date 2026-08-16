# Change Management Policy

For QCypher's 2-person team (Thomas — CTO, Felix — CEO). Written to match
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
- **Deploys are manual**: `pnpm exec next build` locally, then
  `vercel --prod --yes`. No staging environment exists — every deploy
  goes straight to production (see `docs/` and prior phase notes; this
  was a deliberate scope decision, not an omission).
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
| CI checks don't block merges | TypeScript check has pre-existing debt; RLS isolation tests need live Supabase secrets and currently only run post-merge on `main`, not pre-merge on PRs | Pay down the TypeScript debt, then flip `typecheck` to blocking. Move `rls-isolation` to also run on `pull_request` events (secrets are already available to same-repo PRs) and make it blocking — this is the single highest-value gate for a multi-tenant app, since it directly tests cross-tenant isolation. |
| No staging environment | Deliberate scope decision made early in the project — see prior phase notes | Not planned; accepted trade-off for a 2-person team's velocity. |

## What every deployment should record

Going forward, use this as the standard for what "log a deployment"
means, even without an automated table (see the SOC 2 evidence repo,
`evidence/change-management/`, for where to keep this):

- Timestamp
- Who deployed (developer or "AI assistant on behalf of [name]")
- Git commit hash
- What changed (one line, matches the commit message)
- Any migration applied alongside it
- Deploy outcome (success / rolled back)

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
