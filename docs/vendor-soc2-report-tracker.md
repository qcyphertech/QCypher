# Vendor SOC 2 Report Collection — Tracker

Real, sourced request paths for every vendor in
`docs/vendor-risk-assessment.md`, researched 2026-08-16 so you're not
starting from scratch. **Nothing has been requested yet** — every
request path below requires logging into an actual QCypher vendor
account (Supabase, Vercel, etc.) or emailing from a real QCypher
address, which has to be you or Felix Sam, not something done on your
behalf here. Sending vendor emails or account-authenticated requests
without you present is exactly the kind of external, hard-to-reverse
action this assistant won't take unattended — this tracker exists so
that part takes you minutes instead of an afternoon of research.

Ordered by risk level (from `docs/vendor-risk-assessment.md`) — start
at the top.

## How to use this

For each vendor: follow the "Request path," get the report or start
the process, then fill in the Status/Date columns and drop the actual
PDF (or a note that it's on file elsewhere, e.g. a password manager or
shared drive — don't commit the report itself to this git repo) into
`evidence/vendor-management/` (new folder — doesn't exist yet, create
it when the first report lands). Once **all** CRITICAL and HIGH vendors
have a report or a documented "requested, awaiting response," update
`docs/qa-checklist-status.md`'s vendor line.

## Tracker

| Vendor | Risk | Request path | Status | Date requested | Report on file? |
|---|---|---|---|---|---|
| Supabase | CRITICAL | Self-serve request form: **forms.supabase.com/soc2**. Full report download also lives in the Supabase dashboard → Organization → Legal Documents, but only on Team plan or above — confirm QCypher's plan tier first. | Not started | — | No |
| Stripe | CRITICAL | No public self-serve portal found. Email **security@stripe.com**, or check trust.stripe.com for a "Request Security Documentation" flow if logged into the Stripe Dashboard — typically requires an NDA, reports usually arrive in 24-48h after. | Not started | — | No |
| Vercel | HIGH | Trust Center at **security.vercel.com** → Reports → "Get access" flow (SafeBase-hosted). If that flow stalls, email **se@vercel.com** with subject "SafeBase Support Request for Vercel." | Not started | — | No |
| Helcim | HIGH (paused integration, but still HIGH per the risk table) | No SOC 2 self-serve portal found in this research — Helcim's public docs cover **PCI** compliance (downloadable Attestation of Compliance from the account's Security and Compliance page) but don't surface a SOC 2 report path. Since Helcim is currently paused, contact their support directly to ask whether a SOC 2 report exists and how to request it, rather than assuming the PCI AoC substitutes for it. | Not started | — | No |
| Resend | MEDIUM | Self-serve: log into the Resend dashboard → Documents page. Report covers Aug 2023-Feb 2024 per public info — confirm you're getting the current one, not that older window. | Not started | — | No |
| Telnyx | MEDIUM | Public docs note Telnyx currently holds **SOC 2 Type I** (not yet Type II) for Voice/Messaging/Video/Wireless — worth confirming this is still accurate when you ask, since compliance status changes. Request via Telnyx support channels; an NDA may be required. security page: telnyx.com/security. | Not started | — | No |
| Google Calendar / Google Gemini (same vendor, Google Cloud) | MEDIUM / LOW | Google Cloud/Workspace SOC 2 Type II reports are issued quarterly via the **Compliance Reports Manager** in the Google Cloud/Workspace admin console — needs QCypher's Google account to have admin console access, or going through an account manager if there isn't one. Low priority given both integrations are LOW/MEDIUM risk and gracefully degrade if unavailable. | Not started | — | No |
| Cal.com | MEDIUM | Public compliance page (cal.com/compliance/soc-2) states enterprise customers get audit reports directly — likely requires contacting Cal.com sales/support rather than a pure self-serve portal; no public self-serve link found in this research. | Not started | — | No |

## What to actually do with this

Realistically, given the risk ordering: Supabase and Stripe are the
two that matter most (full data store, and real money movement). If
you only do two things this week, request those two — Supabase via the
form (2 minutes), Stripe via email to security@stripe.com. The rest can
follow at whatever pace fits, and MEDIUM/LOW vendors (Telnyx, Cal.com,
Google, Resend) are lower urgency for a first pass.

## A note on Helcim

Public research didn't turn up a SOC 2-specific request path for
Helcim, only PCI. Since Helcim is a paused integration
(`docs/vendor-risk-assessment.md`), it's reasonable to deprioritize
this one — but if you do reach out, it's worth explicitly asking
"do you have a SOC 2 report, or is PCI DSS Level 1 the extent of your
compliance program?" rather than assuming.

## Sources used for this research (2026-08-16)

- [SOC 2 Compliance | Supabase Features](https://supabase.com/features/soc-2-compliance), [SOC2 Request form](https://forms.supabase.com/soc2)
- [Does Vercel have a SOC 2 Type 2 attestation?](https://vercel.com/kb/guide/is-vercel-soc-2-compliant), [Vercel Trust Center](https://security.vercel.com/)
- [Is Stripe SOC 2 Compliant? 2026 Security Status](https://risclens.com/compliance/directory/stripe)
- [Resend is SOC 2 Type II compliant](https://resend.com/blog/soc-2), [SOC 2 · Resend](https://resend.com/security/soc-2)
- [Understanding Telnyx SOC Compliance and Certifications](https://support.telnyx.com/en/articles/12397834-understanding-telnyx-soc-compliance-and-certifications)
- [SOC 2 Type II Certified Scheduling Software | Cal.com](https://cal.com/compliance/soc-2)
- [Get your Helcim PCI report](https://learn.helcim.com/docs/get-helcim-pci-report), [Security - Helcim](https://www.helcim.com/security/)
- [SOC 2: compliance | Google Cloud](https://cloud.google.com/security/compliance/soc-2)
