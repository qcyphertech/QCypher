<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Incident Response Tabletop Drill — Prep & Script</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

**Status: prepared, not yet run.** This is the drill script and
recording template for Thomas and Felix Sam to actually walk through
together — it can't be run autonomously since it's a discussion
exercise between the two of you, not something to fake or simulate
into existence. See `docs/qa-checklist-status.md` for why this is
listed as "requires your action."

Once you run it, fill in the "Outcome" section at the bottom and save
this file (or a copy) into `evidence/monitoring/` with the actual date,
e.g. `evidence/monitoring/2026-09-XX-incident-response-drill.md`.

**Verified against live code 2026-08-16** (not just written from
memory — confirmed each factual claim the script relies on still
holds):
- The "Report incident manually" button exists exactly as described,
  top-right of the Incidents panel
  (`apps/web/src/components/admin/IncidentsPanel.tsx`).
- The Audit Trail panel has a working tenant filter dropdown
  (`apps/web/src/components/admin/AdminAuditTrailPanel.tsx`).
- The "known gap" the scenario is built around is real, not
  hypothetical: `logAudit()` is called from mutating actions
  (`locations.ts`, `payment-accounts.ts`, `account-deletion.ts`,
  `upsells.ts`, etc.) but the contacts list/detail pages
  (`app/(app)/contacts/**`) do a plain `.select()` with no audit call —
  a cross-tenant *read* genuinely leaves no trace in `audit_logs`
  today, exactly as Step 2 asks you to discuss.

If any of this changes (a new page added, logging behavior changed),
re-verify before running the drill — don't assume this note stays
accurate forever.

## Express version (10 minutes)

If 30-45 minutes doesn't fit, this covers the one finding that
actually matters most, cut down to 4 questions. Skip straight to
**Outcome** at the bottom when done — the full version below is there
if you want more depth later, not required.

Same scenario as below: a tenant ("Acme Rentals") reports seeing
another tenant's customer in their contacts list. No incident
auto-detected (the daily cron only catches bulk deletion and
self-role-escalation, not this).

1. **Where's "Report incident manually"?** (Admin Console → Incidents,
   top-right button.) If either of you had to think about it or look
   it up, that's already a finding — write it down.
2. **The one real question:** the audit trail won't show anything for
   this, because *reads* aren't logged — only mutating actions are
   (confirmed against the actual code, see the verification note
   above). If the audit trail comes up empty, how would you actually
   confirm or rule out a cross-tenant exposure? Say the answer out
   loud. If neither of you has a good one, that's the finding this
   drill exists to surface.
3. **Severity, out loud:** agree together this would be **Critical**
   (customer data exposed to the wrong tenant) — don't let it default
   to something lower just because nothing's confirmed yet.
4. **One gut check:** would you two actually hit the 24-hour deadline
   for customer notification if this happened for real today, given
   how you'd actually find out (not how fast a drill goes)?

Fill in **Outcome** below with whatever came up — even "we don't have
a good answer to #2 yet" is a real, useful result.

## Why this scenario, specifically

Picked to deliberately exercise the playbook's weakest, least-tested
path — not the easy case. The daily cron
(`/api/cron/check-incidents`) only detects bulk deletion and
self-role-escalation; a cross-tenant data exposure via an RLS gap is
explicitly called out in `docs/INCIDENT_RESPONSE_PLAYBOOK.md`'s "Known
gaps" section as **not automatically detected**. This is also exactly
the failure mode `docs/risk-register.md` Risk #1 scores as the
highest-impact risk in the whole register, and the one two real bugs
were found against this session (`order_number_counters`,
`invite_tokens`). Drilling the manual-report path for this scenario is
more valuable than drilling the automated path, which is already
exercised for real every time the cron runs.

**Time needed:** ~30-45 minutes for the full version, **10 minutes**
for the express version above — both of you together (or async with a
shared doc, but a live discussion surfaces more real gaps).

**Format:** one of you plays "on-call responder," the other plays
"skeptical auditor" asking "how do you actually know that?" at each
step. Swap roles halfway through if time allows.

---

## Scenario

> **9:14 AM, a Tuesday.** A message arrives from a tenant contact
> (call them "Acme Rentals"): *"Hey, weird thing — when I opened my
> contacts list this morning I saw a customer named 'Dana Park' with a
> phone number I don't recognize, and I don't think that's one of our
> customers. Is something wrong?"*
>
> There is no incident in the Admin Console. The daily cron ran at
> 06:30 UTC and found nothing (bulk-delete and self-role-escalation
> only — this scenario is neither).

Discuss and actually do (not just talk about) each step below, using
the real Admin Console / Supabase dashboard / codebase where the
playbook says to.

### Step 1 — Detection → manual report (Phase 1)

- Walk through: what's the very first action you'd take? The playbook
  says use "Report incident manually" the moment you notice something
  — do you actually know where that button is right now, without
  looking it up? Time yourselves finding it.
- **Discuss:** the 24/48-hour clock starts now, at your manual report,
  not at 9:14 AM when the customer messaged. Is there a gap between
  "customer told us" and "we filed the report" in this drill? How long
  was it, realistically, given how you'd actually receive that message
  (email? a call? Slack?)?

### Step 2 — Investigation (Phase 2)

- Open **Admin Console → Audit Trail**, filter by Acme Rentals'
  tenant. **Actually do this for real** — even though nothing
  happened, confirm you know how to filter by tenant and by
  contact-related actions, and that the audit trail is legible enough
  to reconstruct a timeline under time pressure.
- **Discuss:** in a real version of this, what would you be looking
  for? (A contact record whose `tenant_id` doesn't match Acme's, or an
  `insert`/`update` action attributed to a session that shouldn't have
  write access to Acme's data.)
- **Discuss the actual known gap:** if the audit trail shows nothing
  unusual (because the exposure was a *read*, and reads aren't
  logged to `audit_logs` — only mutating actions are), how would you
  actually confirm or rule this out? Be honest here — per
  `docs/INCIDENT_RESPONSE_PLAYBOOK.md`'s "Known gaps" section, there is
  currently no way to audit a cross-tenant *read* after the fact
  through the app itself. Would you go to Supabase directly? What
  would you look for there? Write down the answer — if there isn't a
  good one, that's a real finding from this drill, not a hypothetical.
- Decide severity together: this would be **Critical** (customer data
  exposed to the wrong tenant) if confirmed real. Agree out loud that
  you'd classify it that way, don't just assume it.

### Step 3 — Containment

- **Discuss, don't execute:** if this were real and you traced it to a
  specific missing RLS policy on some table, what's the fastest safe
  action? (Likely: apply an emergency RLS-enabling migration via the
  Supabase SQL Editor, the same manual paste-and-confirm path every
  other migration uses — see `docs/change-management-policy.md`.) Is
  there anything faster you'd reach for first (e.g., temporarily
  disabling the affected feature) if the RLS fix itself needs more
  investigation?

### Step 4 — Customer notification (Phase 3)

- Open the incident card fields in your head (or in a scratch note):
  what would you actually write for "Affected data"? Practice writing
  one sentence right now, following the playbook's "stay vague" rule
  ("customer records," not specific field names or counts).
- **Discuss:** Acme Rentals already told you what they saw
  ("Dana Park," a phone number) before you notify them. Does the
  notification email need to acknowledge what they already reported,
  or just follow the standard template? Agree on an answer.

### Step 5 — Root cause & remediation (Phase 4)

- Since this is a manually-reported incident, there's no auto-drafted
  root cause (per the playbook, that only happens for cron-detected
  incidents). Practice writing the five-question root cause draft from
  scratch, using a plausible fictional cause for this drill, e.g.:
  *"A newly added table storing contact metadata was missing an RLS
  policy, allowing any authenticated user to query rows across
  tenants. Introduced in migration X, caught only when a customer
  noticed. Fix: RLS policy added and the isolation test suite extended
  to cover this table going forward."*
- **Discuss:** does your actual RLS isolation test suite
  (`apps/web/src/__tests__/isolation/`) cover every tenant-scoped
  table today, or could a newly added table ship without RLS the same
  way `order_number_counters` and `invite_tokens` did before this was
  caught? (Honest answer, from `docs/risk-register.md` Risk #1: the
  suite tests the tables it knows about; a brand-new table isn't
  automatically covered until someone adds a test for it. That's a
  real, standing gap — say so out loud in the drill rather than
  assuming the suite is exhaustive.)

### Step 6 — Post-incident review (Phase 6)

Answer these for real, based on what came up during the drill:

1. Did anything in Phases 1-5 take meaningfully longer than the 24h/48h
   deadlines would allow, once you accounted for realistic
   response time (not drill time)?
2. What's the single weakest point you found? (Likely candidate,
   unless the drill surfaces something else: no way to audit
   cross-tenant *reads* after the fact.)
3. Is there a cheap fix for that weak point, or does it need real
   engineering work? If the latter, does it belong in
   `docs/risk-register.md` as a new or updated risk?

---

## Outcome (fill in after actually running this)

**Date run:** _____
**Participants:** _____
**Format:** live discussion / async — swapped roles? Y/N

**Findings:**
- _____
- _____

**Timing:** did the group find the "Report incident manually" button
quickly? Any step that took longer than expected?

**Action items (add to risk register / backlog if real):**
- _____

**Would the group be comfortable running this for real if it
happened tomorrow?** Y/N — if no, why not.
