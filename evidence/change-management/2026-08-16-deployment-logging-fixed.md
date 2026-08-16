# Deployment Logging — Fixed and First Automated Entry

**Run:** https://github.com/qcyphertech/QCypher/actions/runs/31976238387
**Date:** 2026-08-16

## The gap this closes

`deployment_log` existed since Phase 35's first migration but had
**zero rows** as of this review, despite `vercel ls` confirming dozens
of real production deploys. `scripts/log-deployment.sh` was written to
be run manually alongside a `vercel --prod` step that turns out not to
exist — Vercel's GitHub integration deploys automatically on every
push to `main`, so there was never a moment for a human to remember to
run the script. This is documented in
`docs/change-management-policy.md`'s gap table.

## The fix

`.github/workflows/log-deployment.yml` now logs every push to `main`
automatically, using GitHub Actions' own event data (commit hash,
message, author) — no human step involved. First real row, confirmed
via direct query against the table:

```json
{
  "deployed_by": "Thomas Ocloo",
  "commit_hash": "b1e815db9206c4666cbc96cabbb4f48549d831b8",
  "commit_message": "Automate deployment logging; fix stale 'manual deploy' assumption",
  "deployed_at": "2026-08-16T22:24:13.292265+00:00"
}
```

That row logged the exact commit that introduced the logging workflow
itself — the first entry is the fix logging its own deployment.

## What's still manual

`scripts/log-deployment.sh` remains for attaching a migration filename
or free-form notes to a deploy that needs them — the automated
workflow doesn't know which deploys include a migration. This is an
optional enrichment step, not a dependency for the base record to
exist.

## What this does and doesn't fix in the broader CC8 gap

This closes the "deployment logging is unused" half of the change
management gap. Still open, and not attempted here (deliberately — see
`docs/change-management-policy.md`): no required PR review before
merging to `main`, and `security-audit`/`typecheck` CI jobs remain
non-blocking pending TypeScript debt paydown.
