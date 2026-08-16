# QCypher Policy & Process Docs

Written for a real 2-person team, grounded in verified codebase facts —
not generic compliance templates. See each file's own notes on when it
was last verified against the actual code.

| Doc | Covers |
|---|---|
| [INCIDENT_RESPONSE_PLAYBOOK.md](INCIDENT_RESPONSE_PLAYBOOK.md) | What to do during a real security incident — detection, investigation, customer notification, root cause, post-mortem. |
| [change-management-policy.md](change-management-policy.md) | How code changes actually ship today, honest gaps (no PR review, non-blocking CI), and a remediation plan. |
| [risk-register.md](risk-register.md) | Scored risks (tenant data exposure, vendor outage, staff account compromise, doc drift, unreviewed changes) with real mitigations and honest residual risk. |
| [data-classification-policy.md](data-classification-policy.md) | What data exists, who can access it, retention periods (with actual enforced numbers, not aspirational ones), encryption. |
| [vendor-risk-assessment.md](vendor-risk-assessment.md) | Every third-party service actually wired into the app, what data/access each has, contingency notes. |

## SOC 2 context

These docs were written as part of Phase 35 (SOC 2 Type II preparation).
See `/evidence` for the running evidence trail that proves these policies
are actually followed, not just written down.

Reviewed quarterly (risk register, vendor assessment, data
classification) or whenever the underlying process changes (change
management). Last full pass: 2026-08-16.
