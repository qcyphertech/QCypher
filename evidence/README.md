# Evidence Repository

Evidence for the SOC 2 observation period — proof that controls documented
in `/docs` were actually followed, not just written down. A Type II audit
tests **consistency over the observation window**, so the goal here is a
running paper trail, collected on a schedule, not a one-time snapshot
assembled right before the audit.

## Structure

| Folder | What goes here | Collection cadence |
|---|---|---|
| `access-control/` | MFA enrollment status, access reviews, role changes | Monthly |
| `change-management/` | Branch protection config, deployment log exports | Monthly |
| `monitoring/` | Audit log samples, ZAP scan history, incident response records | Monthly |
| `availability/` | Backup verification, disaster recovery test results, uptime | Quarterly (DR tests), monthly (backups/uptime) |
| `risk-assessment/` | Quarterly risk register reviews, meeting notes | Quarterly |
| `policies/` | Reference to `/docs` policy files (see `policies/README.md`) — the policies themselves aren't evidence, but auditors expect them alongside it | N/A (reference only) |

## Ground rules

- **Real evidence only.** A screenshot of a settings page, an actual CSV
  export, an actual GitHub Actions run URL — not a description of what
  *should* happen. If a control doesn't have evidence yet, that's a gap to
  close, not something to backfill or fabricate.
- **Timestamp everything.** File names should include the date
  (`YYYY-MM-DD-description.ext`) so a reviewer can see the cadence was
  actually monthly/quarterly, not assembled retroactively.
- **Don't include actual customer data.** Audit log samples, incident
  records, etc. should show that logging/detection worked — row counts,
  action types, timestamps — not real tenant customer PII. Redact before
  saving here.

## Status

This repository was scaffolded 2026-08-16 as part of Phase 35 SOC 2 prep.
See `/docs` for the gap assessment and policies. Evidence collection
starts once the underlying controls (branch protection, deployment
logging, MFA) are actually implemented — collecting evidence of a control
that doesn't exist yet isn't possible.
