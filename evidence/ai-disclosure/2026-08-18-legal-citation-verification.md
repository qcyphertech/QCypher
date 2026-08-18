# AI Disclosure Policy — Legal Citation Verification

**Date:** August 18, 2026
**Method:** Independent web research against primary/secondary legal
sources, not legal advice — this is fact-checking of citations, not a
substitute for review by qualified counsel. It replaces "unverified" with
"checked against these specific sources, on this date," which is a
meaningfully different and weaker claim than "confirmed correct by an
attorney."

This closes the open item first flagged when `docs/ai-disclosure-policy.md`
was originally published (see `evidence/ai-disclosure/2026-08-16-policy-implementation.md`,
§1: "citations were supplied by the business owner, not verified"). Five
specific claims were checked; two were accurate as stated, two were
inaccurate/mischaracterized and have been corrected in the policy
document, and one was accurate but mislabeled.

## Findings

### 1. "FTC March 2026 AI policy" — ❌ WRONG, CORRECTED
The disclosure language ("clear, conspicuous, and made before or at the
point of interaction") is real, but it comes from a **proposed** FTC
policy statement on AI accuracy and output steering issued **July 1,
2026** (comment period through July 31, 2026) — not March 2026, and not
yet finalized/adopted as binding.
Sources: [Natlawreview](https://natlawreview.com/article/ftc-issues-proposed-policy-statement-ai-accuracy-and-output-steering), [Forbes](https://www.forbes.com/sites/lanceeliot/2026/07/06/ftc-floats-ai-policy-aiming-to-ensure-that-ai-makers-disclose-the-truth-about-biases-in-their-llms/), [regulations.gov docket FTC-2026-0859-0013](https://www.regulations.gov/document/FTC-2026-0859-0013)
**Policy doc updated:** §4.1 and §2.2 now describe this correctly as a
proposed, not-yet-finalized statement, redated to July 2026.

### 2. "EU AI Act Article 50, effective August 2, 2026" — ✅ VERIFIED ACCURATE
Confirmed: Article 50 of Regulation (EU) 2024/1689 requires disclosure of
AI interaction (chatbots) and machine-readable marking/detectability of
AI-generated content, applicable from August 2, 2026 (with a further
grace period to December 2, 2026 for marking/detection on systems already
on the market).
Sources: [Cooley](https://www.cooley.com/news/insight/2026/2026-08-03-eu-ai-act-transparency-obligations-take-effect-2-august-2026), [Sidley](https://datamatters.sidley.com/2026/06/24/eu-ai-act-transparency-obligations-preparing-for-compliance-by-2-august-2026/), [artificialintelligenceact.eu](https://artificialintelligenceact.eu/transparency-rules-article-50/)
**Policy doc:** unchanged, no correction needed.

### 3. "California SB 942 — AI-generated text labeling" — ❌ MISCHARACTERIZED, CORRECTED
SB 942 (the California AI Transparency Act) is real, but:
- Its effective date was moved from January 1, 2026 to **August 2, 2026**
  by AB 853 (signed October 13, 2025), to align with the EU AI Act.
- Its actual scope is **image, video, and audio** content (manifest/latent
  disclosure + a free public detection tool), not primarily text — and it
  only applies to covered providers with **over 1,000,000 monthly
  California users**, a threshold QCypher does not meet.
Sources: [AI Compliance Atlas](https://aicomplianceatlas.com/law/california-sb-942), [Jones Day](https://www.jonesday.com/en/insights/2024/10/california-enacts-ai-transparency-law-requiring-disclosures-for-ai-content), [ailawsbystate.com](https://www.ailawsbystate.com/blog/california-ai-transparency-act-sb-942-)
**Policy doc updated:** §4.3 now states QCypher's blog-text labeling is a
**voluntary** practice exceeding what SB 942 actually requires at
QCypher's scale, not a claim of SB 942 compliance for a law that doesn't
yet apply to QCypher.

### 4. "$53,088 per violation" (FTC) — ⚠️ ACCURATE BUT MISLABELED, CORRECTED
$53,088 is confirmed as the real, current (2026, unchanged from 2025 per
OMB Memorandum M-26-11) maximum civil penalty under FTC Act §§5(l)/5(m)(1)
for knowing violations of an FTC rule, final order, or unfair-or-deceptive
determination. It is a general Section 5 ceiling, not an AI-specific
figure, and only applies once such a rule/order exists — which the
proposed July 2026 statement (see #1) is not yet.
Sources: [Federal Register, July 2026](https://www.federalregister.gov/documents/2026/07/07/2026-13629/no-adjustment-to-civil-monetary-penalty-amounts), [FTC 2025 press release](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-publishes-inflation-adjusted-civil-penalty-amounts-2025)
**Policy doc updated:** §7 now frames this as an illustrative reference
point for future exposure if the proposed FTC statement is finalized and
enforced, not as active, currently-applicable penalty risk.

### 5. "€15M" (EU AI Act, transparency violations) — ✅ VERIFIED ACCURATE
Confirmed: the AI Act's three-tier penalty structure sets €15M or 3% of
global annual turnover (whichever is higher) for most breaches including
Article 50 transparency violations — distinct from the €35M/7% tier for
prohibited practices and the €7.5M/1% tier for supplying incorrect
information to authorities.
Sources: [aiactblog.nl](https://www.aiactblog.nl/en/posts/article-50-enforcement-fines-ai-act-2026), [AI Act Base](https://aiactbase.eu/ai-act-penalties-fines/), [Article 99 text](https://artificialintelligenceact.eu/article/99/)
**Policy doc:** unchanged, no correction needed.

## Summary

| # | Claim | Result |
|---|---|---|
| 1 | FTC March 2026 policy | Wrong date, overstated as final — corrected |
| 2 | EU AI Act Art. 50, Aug 2 2026 | Accurate |
| 3 | SB 942 text labeling | Wrong scope, wrong applicability to QCypher — corrected |
| 4 | $53,088 FTC penalty | Accurate figure, mislabeled as AI-specific — corrected |
| 5 | €15M EU penalty | Accurate |

## What this does and doesn't establish

This is independent research against public sources, done by an AI
system, not a legal opinion. It's a meaningful upgrade from "unverified,
supplied by the business owner" to "checked against named, dated sources"
— but it is still not a substitute for review by qualified counsel before
this document is relied on in an actual regulatory inquiry or SOC 2
auditor engagement. That review is still recommended, particularly given
two of five claims required correction.
