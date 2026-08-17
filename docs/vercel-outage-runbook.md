# Vercel Outage / Migration Runbook

**Purpose:** the cheap contingency for Vercel (HIGH risk, no fallback
today — see `docs/vendor-risk-assessment.md`) that costs writing time,
not infrastructure spend. Multi-cloud hosting for a 2-person team isn't
cost-efficient; knowing exactly what a manual migration requires, in
advance, is. Verified against the actual codebase 2026-08-16, not
written generically.

## The good news, confirmed by checking the code

This app has **very little Vercel-proprietary lock-in**:
- No `@vercel/*` packages in `apps/web/package.json` (no Vercel Blob,
  KV, Analytics, or Edge Config).
- No `export const runtime = 'edge'` anywhere — everything runs as
  standard Node.js, which any Next.js-capable host can run.
- No Vercel-specific image loader config in `next.config.js`.

**What actually depends on Vercel specifically:**
1. **10 cron jobs** defined in `apps/web/vercel.json` — Vercel's cron
   scheduler is the only thing triggering these today. This is the
   single biggest thing that silently stops working if Vercel is down
   or you migrate away, since nothing else calls these routes.
2. **Environment variables** — 29 vars per `.env.example`, currently
   only set in Vercel's dashboard.
3. **DNS** — `www.qcyphertech.com` currently points at Vercel.
4. **Webhook callback URLs** (Stripe, Helcim, Cal.com) — these point at
   your domain, not directly at Vercel, so **DNS repointing is enough**;
   no need to update webhook URLs in Stripe/Helcim/Cal.com dashboards
   during a migration, only during a domain change.

## If Vercel has an extended outage (hours, not a full migration)

1. Check [vercel-status.com](https://www.vercel-status.com) to confirm
   it's a platform-wide outage, not something on QCypher's side.
2. The 10 cron jobs (audit purge, incident detection, account
   deletion, invoice reminders, recurring job scheduling, etc.) will
   silently not run for the duration. None of these are
   real-time-critical over a few hours — but if the outage crosses a
   cron's scheduled time, that run is simply skipped, not queued.
   After Vercel recovers, no backfill happens automatically — check
   `deployment_log` and, for anything security-relevant
   (`check-incidents`), consider running that check manually via the
   Admin Console's "Report incident manually" path if a long outage
   coincided with suspicious activity.
3. No action needed beyond waiting — the app itself has no other
   Vercel dependency that requires manual intervention during a
   short outage.

## If you need to actually migrate off Vercel

Realistic alternatives for a stock Next.js app with cron needs:
**Railway, Render, Fly.io**, or a plain VPS + `next start` behind a
process manager. All support standard Node.js hosting; none of them
are a rewrite.

1. **Stand up the new host** — `pnpm --filter web exec next build` +
   `next start`, same as local. No Vercel-specific build config to
   translate.
2. **Copy environment variables** — all 29 from `.env.example`'s keys,
   sourced from wherever you actually store the real values (password
   manager, Vercel dashboard while you still have access, etc.). This
   is the step most likely to be forgotten under pressure — go through
   `.env.example` line by line, don't rely on memory.
3. **Replace the 10 cron jobs** — Vercel's scheduler won't exist on
   the new host. Options, cheapest first:
   - **GitHub Actions scheduled workflows** hitting each route with an
     authenticated `curl` — this repo already has 3 working examples
     of exactly this pattern (`nightly-backup.yml`,
     `zap-baseline-scan.yml`, `evidence-gap-check.yml`), so the
     mechanics are proven, just needs the 10 routes/schedules from
     `vercel.json` translated into workflow files. Free, no new
     vendor.
   - A free-tier external cron service (cron-job.org, EasyCron) if you
     want the scheduling decoupled from GitHub entirely.
   - The new host's own cron/scheduled-task feature, if it has one
     (Railway and Render both do).
4. **Repoint DNS** — `www.qcyphertech.com` to the new host. Webhooks
   (Stripe, Helcim, Cal.com) don't need updating since they already
   point at your domain, not Vercel directly (confirmed above) — but
   expect a brief window of downtime/DNS propagation delay.
5. **Verify the cron jobs actually fire** on the new schedule before
   fully decommissioning Vercel — don't assume, check
   `deployment_log`/relevant tables for evidence each job ran.

## What this runbook doesn't cover

- A from-scratch cost/timeline estimate for a full migration — that
  depends on which host you'd actually pick, which hasn't been
  decided and isn't needed unless this ever becomes real.
- Vercel's edge network / CDN characteristics — none of the
  alternatives above match that exactly, so expect some latency
  difference, not a functional gap.

## Review cadence

Revisit this if the app starts using a genuinely Vercel-specific
feature (Edge Config, Vercel Blob, Edge Middleware beyond what exists
today) — at that point this runbook's "very little lock-in" claim
would need re-verifying, not assumed to still hold.
