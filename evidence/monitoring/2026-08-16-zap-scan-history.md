# Vulnerability Scanning — First Verified Runs

Weekly OWASP ZAP baseline scan against production
(`.github/workflows/zap-baseline-scan.yml`, `cron: '0 2 * * 1'`).

## Runs on record so far

| Date | Run | Conclusion |
|---|---|---|
| 2026-08-16 18:14 UTC | https://github.com/qcyphertech/QCypher/actions/runs/31964014031 | success |
| 2026-08-16 17:56 UTC | https://github.com/qcyphertech/QCypher/actions/runs/31963083533 | success |
| 2026-08-16 17:39 UTC | https://github.com/qcyphertech/QCypher/actions/runs/31962249053 | success |

Multiple same-day runs reflect active Phase 34/35 development
(manually triggered via `workflow_dispatch` to verify fixes), not the
steady-state cadence — see `apps/web/src/components/admin/SecurityPanel.tsx`
in the Admin Console for the full scan history with per-finding detail,
which is the actual system of record. This file exists to satisfy the
evidence repo's "real evidence, not just a description" rule for the
monitoring control specifically.

## Findings status as of 2026-08-16

- **Cross-Domain Misconfiguration** (real CORS bug — Vercel's CDN
  defaulting to `Access-Control-Allow-Origin: *` on static content):
  fixed in `next.config.js`, marked resolved.
- Medium/Low findings from earlier scans: addressed — see commit
  history around 2026-08-16 for the specific header/config fixes.
- **Cross-Origin-Opener-Policy Header Missing or Invalid**: accepted,
  not a bug. `next.config.js` deliberately sends
  `same-origin-allow-popups` instead of the stricter `same-origin`
  because no popup-based flow (OAuth, `window.open()`) has been
  audited as safe to break. Documented in the Phase 34 plan and in
  `next.config.js` itself.

## Next expected evidence

Steady-state cadence going forward is weekly (Monday 02:00 UTC, per
the cron above). Future entries here should show that cadence holding,
not clusters of manual same-day runs.
