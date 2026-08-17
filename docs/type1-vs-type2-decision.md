# Type I vs. Type II — Decision Writeup

**Status: analysis complete, decision not made.** This is written to
give you and Felix Sam everything needed to decide in one sitting, not to
decide for you — which path to take depends on something only you two
know: whether there's an actual deal or prospect waiting on a report
right now, or whether this is running ahead of sales need.

## What each actually certifies

- **Type I** — an auditor confirms your controls are **suitably
  designed** as of a single point in time. Think of it as "here's our
  security program, and an independent auditor agrees it's designed
  correctly." Fast: typically **2-8 weeks** once controls are actually
  in place (they are — see below).
- **Type II** — an auditor confirms your controls were **suitably
  designed AND operated effectively** over an observation window
  (commonly 3-9 months). This is the report most enterprise procurement
  teams actually mean when they say "SOC 2." Slower by definition —
  the window has to actually elapse, nothing shortens it.

[SOC 2 Type 1 vs Type 2: Cost, Timeline & Which to Choose (2026)](https://soc2auditors.org/insights/soc-2-type-1-vs-type-2/)

## Where QCypher actually stands right now

This changes the calculus compared to a generic "which one should a
startup pick" article:

- **The controls already exist and are working** — MFA, RLS on 30+
  tables (tested), automated backups with verified restore, automated
  deployment logging, weekly vulnerability scanning, monthly access
  reviews, an incident response plan. A Type I audit tests *design*,
  and the design is already real and documented (`docs/gap-assessment.md`,
  `docs/common-criteria-mapping.md`) — there's very little "get ready
  for the audit" work left that a Type I would require.
- **The Type II observation window already started** — evidence
  collection began 2026-08-16 (`evidence/README.md`), independent of
  whether you pursue a Type I first. That clock doesn't reset if you
  also get a Type I along the way; the two aren't mutually exclusive
  in sequence.
- **This means the "Type I first" path costs relatively little extra
  time here**, compared to a company that still has real design gaps
  to close. The controls being audited for Type I are the same ones
  already accumulating Type II evidence.

## The actual trade-off

| | Type I first, then Type II | Straight to Type II only |
|---|---|---|
| Time to *any* signed report | 2-8 weeks | 3-9+ months (full observation window) |
| Total audit cost | Both fees — Type I (~$12-20K) + Type II (~$15-40K) later | One fee (~$15-40K) |
| Useful for closing a deal *now* | Yes — many procurement teams accept Type I to unblock a deal, with Type II required at renewal | No — nothing to show until the window closes |
| Useful for a deal 6+ months out | Marginal — Type II will likely be ready by then anyway | Fine — timeline already matches |
| Extra auditor overhead | A second, smaller engagement | None |

[SOC 2 Compliance for Startups: Close Bigger Deals (2026)](https://soc2auditors.org/insights/soc-2-compliance-for-startups/)

## The actual question to answer

This is genuinely just one question: **is there a real deal, prospect,
or procurement requirement waiting on a report in the next 1-3
months?**

- **If yes** — get a Type I now. It's fast, the controls are already
  there, the cost is modest relative to what a stalled deal costs, and
  it doesn't slow down the Type II timeline at all since that clock is
  already running independently.
- **If no** — skip Type I and save the extra audit fee. Go straight to
  Type II, let the observation window run its course (already
  in progress), and get one report instead of two. Most companies in
  this position eventually need Type II anyway, so paying for an
  interim Type I that nobody asked for is pure overhead.

There isn't a universally correct answer here — it's a sales-timing
question, not a security or engineering one, which is exactly why this
wasn't decided automatically.

## If you decide "Type I now"

- This doesn't block or restart the Type II clock — evidence
  collection continues exactly as already scoped.
- Get quotes for *both* Type I and Type II from the shortlist in
  `docs/auditor-selection.md` at the same time — most firms will quote
  the pair together, sometimes at a discount vs. two separate
  engagements.
- Ask explicitly (per `docs/auditor-selection.md`'s question list)
  whether the same engagement letter can cover both phases.

## If you decide "Type II only"

- Nothing changes about current work — evidence collection continues,
  and the auditor search in `docs/auditor-selection.md` should filter
  for firms quoting Type II timelines matching your actual target
  observation window (see that doc's "Timeline agreed" question,
  still open).

## Sources used for this research (2026-08-16)

- [SOC 2 Type 1 vs Type 2: Cost, Timeline & Which to Choose (2026)](https://soc2auditors.org/insights/soc-2-type-1-vs-type-2/)
- [SOC 2 Compliance for Startups: Close Bigger Deals (2026 Guide)](https://soc2auditors.org/insights/soc-2-compliance-for-startups/)
