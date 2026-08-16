# QCypher Policy & Process Docs

Written for a real 2-person team, grounded in verified codebase facts —
not generic compliance templates. See each file's own notes on when it
was last verified against the actual code.

| Doc | Covers |
|---|---|
| [gap-assessment.md](gap-assessment.md) | What controls actually exist vs. claimed, verified against code and the live database — not the original plan's assumptions. |
| [INCIDENT_RESPONSE_PLAYBOOK.md](INCIDENT_RESPONSE_PLAYBOOK.md) | What to do during a real security incident — detection, investigation, customer notification, root cause, post-mortem. |
| [change-management-policy.md](change-management-policy.md) | How code changes actually ship today, honest gaps (no PR review, non-blocking CI), and a remediation plan. |
| [risk-register.md](risk-register.md) | Scored risks (tenant data exposure, vendor outage, staff account compromise, doc drift, unreviewed changes) with real mitigations and honest residual risk. |
| [data-classification-policy.md](data-classification-policy.md) | What data exists, who can access it, retention periods (with actual enforced numbers, not aspirational ones), encryption. |
| [vendor-risk-assessment.md](vendor-risk-assessment.md) | Every third-party service actually wired into the app, what data/access each has, contingency notes. |
| [system-description.md](system-description.md) | What QCypher is, the monorepo layout, tech stack, an architecture diagram, data flow, and security boundaries — grounded in verified code, not an aspirational diagram. |
| [staff-training.md](staff-training.md) | New-team-member security checklist, ongoing practices, MFA recovery, review cadence — every item points to a real control, not generic security-awareness content. |

## SOC 2 context

These docs were written as part of Phase 35 (SOC 2 Type II preparation).
See `/evidence` for the running evidence trail that proves these policies
are actually followed, not just written down.

Reviewed quarterly (risk register, vendor assessment, data
classification) or whenever the underlying process changes (change
management). Last full pass: 2026-08-16.
