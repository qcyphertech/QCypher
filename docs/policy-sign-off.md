# Executive Policy Sign-Off

**Status: prepared, not yet signed.** This exists so that formalizing
sign-off is a 10-minute task instead of a research project. The actual
attestation — both of you reading each policy and agreeing to it — is
something only you and Felix can do; nothing below fakes that it's
already happened.

## Why this matters for the audit

A SOC 2 auditor checks CC1 (Control Environment) and CC2
(Communication) partly by confirming that management has actually
*read and approved* the policies the company claims to follow — not
just that the policies exist as files in a repo. "We wrote it" and "we
approved it" are different claims, and right now only the first one is
true. See `docs/common-criteria-mapping.md`'s CC1 section, which
already flags this as the weakest area for a 2-person team.

## What "signed" needs to mean, minimally

For a company this size, auditors generally accept a lightweight but
real attestation — it doesn't need notarization or a formal board
resolution. What it does need:

1. Evidence that **both** of you individually read and approved each
   policy (not just one of you deciding for both).
2. A **date**, so the audit's observation window can show these were
   approved before or at the start of that window, not backfilled
   right before the audit.
3. Something **durable** — not a verbal "yeah looks good" in a call
   that leaves no record.

## Three ways to do this — pick one

### Option A: Dated commit, both names (recommended — fits how this team already works)

Everything else in this repo's compliance story is git-native
(commits as the audit trail, PRs as the change record). This option
matches that pattern exactly:

1. Both of you read each policy doc listed below.
2. Fill in the table at the bottom of this file with your name, the
   date, and "approved" (or notes if you want a change first).
3. Commit it with both your names in the commit message or as
   co-authors, e.g.:
   ```
   git commit -m "Executive sign-off: Phase 35 policies approved

   Reviewed and approved by Thomas Ocloo and Felix [surname], 2026-09-XX.

   Co-Authored-By: Felix [surname] <[felix's real email]>"
   ```
4. Push it. The commit itself, in `evidence/policies/` or this file's
   own history, is the durable record.

**Why this is enough**: git commits are already this project's audit
trail for every other control (see `docs/change-management-policy.md`).
An auditor who accepts "git history is our change record" for code
should accept the same standard for policy approval — it's the same
kind of evidence, applied consistently.

### Option B: Signed PDF

Export each policy (or a summary cover sheet referencing all 5) to
PDF, both of you sign it (DocuSign, Adobe Sign, or literally print/
sign/scan), and store the signed PDF in
`evidence/policies/2026-XX-XX-executive-sign-off.pdf` (don't commit a
PDF with a real signature image to a public-facing repo path if this
repo or its history could ever be public — check that before choosing
this option).

### Option C: Shared doc with signature blocks

A Google Doc or similar with both your typed names, the date, and
"Approved" next to each policy, exported as a PDF or kept as a
permanent link, referenced from `evidence/policies/`.

**Recommendation: Option A.** It requires no new tooling, matches this
project's existing evidence pattern, and takes the least time.

## The policies to review and approve

| Policy | What you're approving |
|---|---|
| [`docs/change-management-policy.md`](change-management-policy.md) | How code ships today (direct push, no required review) and the explicit trade-offs accepted — including that this was a deliberate choice, not an oversight. |
| [`docs/data-classification-policy.md`](data-classification-policy.md) | What data exists, who can access it, and the retention periods actually enforced in code. |
| [`docs/INCIDENT_RESPONSE_PLAYBOOK.md`](INCIDENT_RESPONSE_PLAYBOOK.md) | The process for detecting, responding to, and communicating a security incident — including its documented known gaps (no RLS-rejection or failed-login detection). |
| [`docs/staff-training.md`](staff-training.md) | The onboarding checklist and ongoing security practices staff (currently the two of you) are expected to follow. |
| [`docs/risk-register.md`](risk-register.md) | The 5 identified risks, their scoring, and accepted residual risk for each — approving this means agreeing the residual risk levels are acceptable to the business, not just accurate. |

If either of you disagrees with something in a policy while reviewing
it, that's a real finding — fix the doc first (or flag it for a
follow-up session), then sign the corrected version. Approving a
policy you disagree with defeats the point of this step.

## Sign-off record

Fill in once actually reviewed — leave blank until then, don't
backfill a date earlier than when you actually read it.

| Name | Role | Date reviewed | Outcome |
|---|---|---|---|
| Thomas Ocloo | CTO | | |
| Felix | CEO | | |

**Next review:** annually, or whenever a listed policy changes
materially — whichever comes first. Re-approval after a material
change should be a quick re-read + updated date, not a full redo.
