<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Incident Response Playbook</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

For QCypher's 2-person team. This is a checklist, not a workflow tool — if you're
reading this during a real incident, start at **Phase 1** and work down.

## The clock

**The 24-hour and 48-hour clocks both start at T+0 = detection, not discovery.**

- "Detection" = the moment the `incidents` row is created — either by the daily
  cron (`detected_at` timestamp), or the moment you click "Report incident
  manually" if you found it yourself.
- "Discovery" (you personally noticing/understanding it's a real incident) almost
  always happens *after* detection, sometimes hours after. The clock does not
  wait for you to notice. If the cron detects something at 6:30am and you don't
  see the alert until noon, you have already used part of your 24 hours.
- Practical implication: check incident alerts (email + SMS) promptly. The system
  is built to page you, not to be checked once a day.
- **Detection lag**: the automated cron runs once daily (06:30 UTC) — Vercel's
  free Hobby plan rejects any deployment with a cron running more than once a
  day, so a genuinely hourly check would require upgrading to Vercel Pro. On the
  free tier, a bulk-delete pattern that starts right after a run could go up to
  ~24 hours before the next check catches it. Manual reporting doesn't have this
  lag — use it the moment you notice something, don't wait for the cron.

| Deadline | Action | Where |
|---|---|---|
| T+0 | Incident detected, super admins alerted | Automatic (cron) or manual report |
| T+0 to T+24h | Investigate, scope impact, notify affected customers | Admin Console → Incidents |
| T+24h to T+48h | Root cause analysis, remediation, send summary email | Admin Console → Incidents |
| T+48h | Root cause summary sent, incident marked resolved | Admin Console → Incidents |

## Phase 1 — Detection → Alert (automatic)

Nothing for you to do here except **check your email/phone**. The daily cron
(`/api/cron/check-incidents`, 06:30 UTC) creates the incident row and emails +
texts both super admins immediately when it detects:

- **Bulk data exposure**: one user deleting >20 contacts/templates/events within
  the last 24 hours
- **Self role escalation**: a user's role changed to their own action (should be
  impossible — the app blocks this in code; if you see this alert, something
  bypassed that guard and needs immediate attention)

What the cron does **not** detect (see "Known gaps" below): brute-force login
attempts, RLS policy rejections, infrastructure error-rate spikes. If you learn
about one of those some other way (a customer report, checking Supabase logs
directly, etc.), use **"Report incident manually"** in the Admin Console — that
starts the same 24/48-hour clock.

## Phase 2 — Investigation (T+0 to T+24h)

1. Open the incident in **Admin Console → Incidents**, expand it.
2. Read the description and timeline. Click through to **Admin Console → Audit
   Trail**, filter by the affected tenant/user, and reconstruct what happened.
3. Decide: real incident, or false alarm?
   - False alarm → mark **resolved**, write one line in Root Cause explaining
     why (e.g. "Legitimate bulk cleanup by tenant owner, confirmed by phone").
     Done, skip the rest of this playbook.
   - Real incident → continue.
4. Click **"Mark as investigating."**
5. Assess severity:
   - **Critical** — customer data exposed or deleted without authorization
   - **High** — unauthorized access attempt, breach attempt
   - **Medium** — failed attempt that was blocked (no actual access)
   - **Low** — system anomaly, no customer impact
6. Do the minimum remediation needed to stop ongoing harm: e.g. remove the
   offending user's access (Settings → Team → remove/change role), rotate any
   leaked credentials. This is a judgment call — there's no button for this,
   it's a manual step in whatever system needs it (Supabase, Vercel, Telnyx,
   etc.).
7. Click **"Mark as confirmed."**

## Phase 3 — Customer Notification (must complete by T+24h)

Only applies to incidents tied to a specific tenant (system-wide incidents have
no customer to notify).

1. In the incident card, fill in:
   - **Affected data** — stay vague. "Customer records" or "contact
     information," never specific field names or record counts.
   - **Actions taken so far** — one sentence, plain English.
2. Click **"Send initial notification."** This emails every admin (owner-role
   user) of the affected tenant using the spec'd template, from the app's
   branded sender.
3. That's it — the incident record's `customers_notified` flag and
   `notification_sent_at` timestamp are set automatically.

**If more than ~100 customers/tenants are affected by the same incident**,
don't blast all the notification emails in one call — Resend and your own
inbox for replies will both get overwhelmed. Send in batches (e.g. 20-30
tenants at a time, a few minutes apart) rather than all at once. There's no
built-in batching for this yet — do it manually by only filling in/sending for
a subset of affected tenants per pass.

## Phase 4 — Root Cause Analysis (T+24h to T+48h)

**For cron-detected incidents, the Root cause and Remediation fields are
auto-populated** with a factual draft the moment the incident is created —
built from the actual detection data (who, what, how many, threshold
exceeded), prefixed with `[DRAFT — confirm before sending to customer]`.
You don't start from a blank field. What the system can't determine for you
is *why* it happened (legitimate cleanup vs. compromised account, etc.) —
that still needs your judgment.

**The "Send root cause summary" button is disabled while that `[DRAFT]`
prefix is still present** — both in the UI and enforced server-side in
`sendRootCauseSummary()`. This is deliberate: it stops a factual-but-unverified
draft from going out to a customer as if it were a confirmed finding. To
unlock sending, edit the field (removing the `[DRAFT...]` prefix at minimum)
and click "Save root cause / remediation."

Manually-reported incidents get no auto-draft (there's no structured
detection data to build one from) — those fields start blank as before.

Work through these five questions when editing the draft (or writing from
scratch for a manual report):

1. **What happened?** — one or two sentences, factual.
2. **Why did it happen?** — the actual root cause. Examples:
   - "A misconfigured RLS policy allowed a user to read another tenant's data."
   - "A leaked API key was used for unauthorized access."
   - "A third-party service had a security update we hadn't applied yet."
3. **How did we detect it?** — automated cron, or manual discovery (and how).
4. **What's the fix?** — specific, technical, in the Remediation field.
5. **How do we prevent it?** — one sentence on the process/code change.

Write these in plain English where possible — the same text (or a lightly
simplified version) goes to the customer in Phase 5.

## Phase 5 — Customer Follow-Up (at T+48h)

1. Confirm the **Root cause** field is filled in (the send button is disabled
   until it is).
2. Click **"Send root cause summary."** This emails the same tenant admins with
   the root cause, remediation, and full timeline.
3. The incident's `summary_sent_at` timestamp is set automatically.
4. Click **"Mark as resolved."**

## Phase 6 — Post-Incident Review (after resolution, optional but recommended)

Not currently a button in the UI — do this as a short written note (Slack
message, doc, whatever you actually use) covering:

1. Did the cron catch it, or did we find it manually? If manually, should a new
   automated trigger be built for this pattern?
2. Did we hit the 24-hour and 48-hour deadlines?
3. Was the customer communication clear and reassuring, based on any replies?
4. What would we do differently next time?

## Known gaps (be aware of these, don't assume coverage you don't have)

- **No detection for RLS-blocked write attempts or failed logins.** `audit_logs`
  only records actions the app successfully performed — a blocked write never
  reaches it, and Supabase Auth's failed-login logs aren't queryable from this
  app without the separate Supabase Management API, which isn't configured.
  If you suspect a brute-force or unauthorized-access attempt, check Supabase
  Dashboard → Logs → Auth directly, and file a manual incident report if
  confirmed.
- **No infrastructure/error-rate monitoring.** There's no 5xx error tracking
  anywhere in the app. If Vercel or Supabase's own dashboards show anomalies,
  file a manual incident report.
- **SMS alerts require `ALERT_PHONE_NUMBERS`** to be set (comma-separated
  E.164 numbers) — without it, only email alerts fire.

## Data handling in incident records

Incident records (`incidents` table) never store the *content* of what was
accessed or deleted — only counts, user emails, resource types, and
timestamps pulled from `audit_logs`, which itself only logs actions and
resource names (e.g. a contact's name as a label), never full record content.
Customer notification emails go further and stay intentionally vague per
Phase 3 above.

## Legal review

These email templates (`lib/actions/incidents.ts` —
`sendInitialCustomerNotification`, `sendRootCauseSummary`) should be reviewed
by legal counsel before the first real incident, and re-reviewed annually or
after any relevant legal consultation. Nothing about the templates enforces
this review — it's a process step for the humans running this playbook.
