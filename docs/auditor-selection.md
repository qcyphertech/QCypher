<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Auditor Selection — Research & Decision Framework</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

**Status: researched, not decided.** Selecting and engaging a firm is a
real financial/contractual commitment only you and Felix Sam can make —
this exists so that decision takes an afternoon of comparing real
options instead of starting from a blank search. Nothing here has been
contacted or committed to on your behalf.

## The decision this actually requires (do this first)

Before comparing firms, settle three things — the auditor search
changes based on the answers:

1. **Type I first, or straight to Type II?** A Type I audits your
   controls' *design* at a single point in time (faster, cheaper,
   often 2-4 weeks). A Type II audits *design and operating
   effectiveness* over an observation window (typically 3-12 months)
   — this is what most enterprise customers actually ask for, and
   what `docs/qa-checklist-status.md` and the original Phase 35 plan
   assume you're pursuing. Since evidence collection already started
   2026-08-16 (see `evidence/`), a Type II observation window is
   already running — going Type I first would mean either a separate,
   shorter engagement now plus a second one later, or just waiting and
   going straight to Type II. **Worth deciding explicitly, not
   defaulting into.**
2. **How long is the observation window?** Auditors won't accept
   anything under ~3 months for a real Type II opinion; 6-9 months is
   more typical for a first report and matches the original Phase 35
   plan. The window can't start counting until it starts — the sooner
   this is decided, the sooner the clock is real instead of informal.
3. **Budget range.** See pricing below — this alone should narrow the
   shortlist from "any auditor" to "auditors realistic for a 2-person
   company."

## Realistic cost and timeline for a company this size

Sourced 2026-08-16, several independent pricing guides:

- **Type I** (design only, single point in time): roughly **$12K-$20K**
  from a specialist/boutique firm, 2-6 week turnaround.
- **Type II** (design + operating effectiveness over the observation
  window): roughly **$15K-$40K** for a small/midsize company from a
  boutique or mid-tier firm — the audit fee itself, not counting your
  own prep time.
- **Total first-year cost** (audit fee + tooling + internal time)
  commonly lands **$30K-$80K** across sources — worth budgeting for
  the whole picture, not just the audit line item.
- **Big 4 firms** (Deloitte, EY, KPMG, PwC) run **$45K-$400K+** —
  almost certainly not the right fit for a 2-person company; boutique
  CPA firms specializing in startups deliver an equivalent report for
  much less.

[Best SOC 2 Auditors in 2026: Complete Guide](https://blog.getagency.com/articles/best-soc-2-auditors-2026-complete-guide) | [SOC 2 Certification Cost in 2026](https://www.brightdefense.com/resources/soc-2-certification-cost/) | [How Much Does a SOC 2 Audit Cost?](https://drata.com/learn/soc-2/cost)

## Firms surfaced in this research (not vetted beyond public info — verify current pricing/availability directly)

Named specifically because public sources describe them as
startup/boutique-oriented with lower price points than mid-tier or Big
4 firms. This is a starting shortlist, not a ranking — get a real
quote from at least 2-3 before deciding.

| Firm | Public positioning | Reported starting price |
|---|---|---|
| BARR Advisory | CPA firm, SaaS/cloud-native focus | $10K-$20K |
| Prescient Assurance / Prescient Security | CPA firm, SOC 2/ISO 27001/cyber attestations, competitive startup pricing | ~$20K |
| Zero Day CPA | Boutique CPA, first-SOC-2 focus, fixed-fee, 4-6 week turnaround | Lower end of the range |
| Johanson Group | Deal-driven Type I engagements | From $15K |
| Thoropass | Bundles software + audit | From $15K |

[USA SOC 2 Auditors (2026): 134 US Firms Compared](https://soc2auditors.org/soc-2-auditors-usa/) | [SOC 2 Auditors for Startups (2026): 36 Firms with Pricing](https://soc2auditors.org/soc-2-auditors-startups/) | [Best SOC 2 Audit Firms for Startups (2026)](https://atlantsecurity.com/learn/best-soc-2-audit-firms-for-startups)

## A separate decision: GRC platform (Vanta / Drata / Secureframe) or not

These platforms automate evidence collection and connect you to a
network of pre-vetted auditors — commonly bundled as "software +
audit." Worth weighing explicitly against what's already built:

**The case for skipping one:** this session already built real,
working evidence infrastructure by hand — `/evidence`, automated
deployment logging, automated monthly access reviews, automated
backup/restore verification, automated ZAP scanning. A GRC platform's
main value (automating evidence collection) is partially already done
here, manually but for free, using tools already in place.

**The case for using one anyway:** these platforms also handle
continuous control monitoring, auditor-ready evidence formatting, and
policy/questionnaire templates that would otherwise be manual ongoing
work — and several (Thoropass, for instance) bundle the software cost
into the audit engagement itself rather than adding a separate
subscription. If ongoing manual evidence collection becomes a burden
as the team grows, this is worth revisiting.

**Recommendation: don't add one for this first audit.** The manual
evidence trail already exists and is real; a platform subscription is
recurring cost for a 2-person team that would mostly duplicate what's
already built. Revisit if evidence collection becomes a bigger burden
or the team grows past a size where manual tracking is realistic.

[Secureframe vs Vanta vs Drata](https://sprinto.com/blog/secureframe-vs-vanta-vs-drata/)

## Questions to ask before signing anything

Sourced from auditor-selection guides, adapted for a first-time,
small-team audit:

1. How many SOC 2 reports has this firm issued in the last 12 months?
   Can they share references from a similarly-sized company?
2. Who specifically leads the engagement, and are they the ongoing
   point of contact (not handed off after the sales call)?
3. What's the actual proposed observation period? **Anything under 3
   months for a Type II should be a red flag** — press for why.
4. How do they scope the system description — do they actually review
   your infrastructure and data flows, or hand you a generic template
   to fill in? (Given `docs/system-description.md` already exists and
   is accurate, this should be a fast conversation either way — but
   still ask.)
5. Which Trust Services Criteria will be in scope? (Security is the
   baseline/Common Criteria set this whole Phase 35 effort maps to —
   see `docs/common-criteria-mapping.md`. Confirm whether
   Availability, Confidentiality, or others are being added, since
   that changes both scope and cost.)
6. What's the testing methodology — sample sizes, how often they test,
   how exceptions get documented? Vague answers here are a signal to
   walk away.
7. Fixed fee or time-and-materials? Get the total in writing, including
   what triggers a change order.
8. Is the firm itself peer-reviewed (required every 2 years for CPA
   firms performing SOC engagements)? Ask directly — a real firm won't
   hesitate to answer.

[8 Questions to Ask Your SOC 2 Auditor Before Signing a Contract](https://www.a-lign.com/articles/blog-questions-to-ask-your-soc2-auditor-before-signing-contract)

## Suggested next step

1. Decide Type I vs. straight-to-Type II (see above) — this changes
   which firms/quotes make sense to request.
2. Get quotes from 2-3 firms from the shortlist above (or others found
   independently) — most offer a free scoping call.
3. Run the question list above on each call.
4. Compare: price, proposed observation window, and how well they
   understood your actual system on the scoping call (not just their
   sales pitch).
5. Sign the engagement letter with whichever firm you choose — that's
   the one step in this whole process that's unambiguously yours to
   do, not something to prep further.

## Sources used for this research (2026-08-16)

- [Best SOC 2 Auditors in 2026: Complete Guide](https://blog.getagency.com/articles/best-soc-2-auditors-2026-complete-guide)
- [USA SOC 2 Auditors (2026): 134 US Firms Compared](https://soc2auditors.org/soc-2-auditors-usa/)
- [SOC 2 Auditors for Startups (2026): 36 Firms with Pricing](https://soc2auditors.org/soc-2-auditors-startups/)
- [Best SOC 2 Audit Firms for Startups (2026) | Atlant Security](https://atlantsecurity.com/learn/best-soc-2-audit-firms-for-startups)
- [SOC 2 Certification Cost in 2026 | Bright Defense](https://www.brightdefense.com/resources/soc-2-certification-cost/)
- [How Much Does a SOC 2 Audit Cost? | Drata](https://drata.com/learn/soc-2/cost)
- [How much does SOC 2 compliance cost in 2026? | Scrut](https://www.scrut.io/hub/soc-2/cost-of-soc-2-audit)
- [Secureframe vs Vanta vs Drata: 2026](https://sprinto.com/blog/secureframe-vs-vanta-vs-drata/)
- [8 Questions to Ask Your SOC 2 Auditor Before Signing a Contract | A-LIGN](https://www.a-lign.com/articles/blog-questions-to-ask-your-soc2-auditor-before-signing-contract)
