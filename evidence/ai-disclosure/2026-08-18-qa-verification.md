# Phase 38+ AI Disclosure — QA Verification

**Tested by:** Claude (automated code-level verification + one manual
production-build screenshot)
**Date:** August 18, 2026
**Result:** ⚠️ **CONDITIONAL PASS** — functionally implemented and correct
by design, but several checklist items as literally written don't match
the real implementation, and a meaningful slice of the checklist (live
cross-browser/device testing, screenshots on 2+ real tenant sites,
performance timing) was not possible in this environment. See below.
**Ready for production as-is:** Yes, for what's built. **Ready for an
external SOC 2 auditor to inspect against this exact checklist:** No —
fix the discrepancies in §1 first, or hand the auditor the corrected
facts, not the original checklist's assumptions.

This report checks the real code against the QA prompt's checklist. Where
the checklist's assumed file names, colors, or exact text don't match
what was actually built, that's called out explicitly rather than
checked off — several similar checklists this project has received
turned out to describe components/tables that don't exist, and rubber-stamping
those would put wrong claims into SOC 2 evidence.

---

## 1. Discrepancies vs. the checklist's literal assumptions

| Checklist assumed | Actual implementation |
|---|---|
| `components/BlogAIBadge.tsx` standalone component | No such file exists. Badge is inline JSX in `apps/web/src/app/portal/[slug]/blog/[postSlug]/page.tsx:62-70` |
| Badge checks `blog.ai_generated === true` | Badge is gated on `article.disclose_ai_assistance` (the tenant's own toggle) — every tenant post is `ai_generated: true` already, so gating on that would show the badge unconditionally and defeat the toggle |
| Badge text "⚡ AI-Assisted", blue `#2563eb` | Text matches. Color is sky-blue `#0c4a6e` on `#f0f9ff`, not `#2563eb` |
| Bot label "🤖 Powered by AI", gray `#6b7280`, 0.75rem | Text is "Powered by AI" with **no emoji**. Color `#8a90a3`, size `11px` (0.6875rem) |
| `components/ChatbotWidget.jsx` | Real path: `apps/web/src/components/shared/ChatbotWidget.tsx` (`.tsx`, and under `shared/`) |
| CRM badge "AI-Assisted" (mixed case), blue `#dbeafe`/`#1e40af` | Real text is **"AI-ASSISTED"** (uppercase), teal/cyan `#5eead4`, matching this widget's existing teal accent — not blue |
| `components/CRMBot.jsx` | Real path/name: `apps/web/src/components/layout/CrmBotWidget.tsx` |
| `tenant_blogs` table | Real table: `blog_articles` (shared by QCypher's own blog and tenant blogs, disambiguated by `is_qcypher_blog`) |
| Audit `details` JSON nests `blog_id`, `title` | `resource_id`/`resource_name` are separate top-level columns on `audit_logs`, not nested inside `details`. `details` is just `{model, badge_shown}` (admin-approved publishes add `approved_by_admin: true`) |
| `audit_logs` gets an `ai_chatbot_interaction` row | **Never happens.** Anonymous website-chatbot interactions are intentionally logged to a separate `chatbot_interaction_logs` table instead — `audit_logs` requires a non-null `tenant_id`/`user_id` scoped to a real tenant member, which an anonymous visitor doesn't have. This was a deliberate architecture decision made earlier this session, not an oversight — see that table's migration comment. |
| 90-day retention + 30-day grace period on `audit_logs` | Retention is real (see §3) but there's **no grace period** on `audit_logs` — it's a flat 90-day hard delete via a daily cron + `purge_old_audit_logs()` RPC. A "30-day grace" does exist in this codebase, but for tenant *account deletion*, an unrelated feature. |

None of these are functional bugs — the actual behavior is correct and, in a few cases (badge gated on the tenant toggle rather than `ai_generated`), more correct than what the checklist assumed. But if this checklist is handed to an actual auditor as-is, the file names/colors/JSON shape it describes won't match what they find in the repo, which will look like conflicting evidence.

---

## 2. Policy document (Part 1)

- `docs/ai-disclosure-policy.md` and its evidence mirrors exist and are committed. Content structure (sections 1–8) matches what the checklist expects.
- **Not verified, still open**: the FTC/EU/California citations and the $53,088/€15M penalty figures were supplied by the business owner and published as requested, but were never checked against a primary legal source by me — flagged in the original implementation evidence doc and unchanged since. Checklist item "1.3 All compliance citations are accurate" is **unverified**, not confirmed.

## 3. Audit trail (Part 3)

- `ai_blog_published` and `ai_crm_bot_query` are real, confirmed inserts (see §1 table for exact shape).
- Retention: real enforcement exists — `apps/web/vercel.json` runs `/api/cron/purge-audit-logs` daily, which calls `purge_old_audit_logs()` (defined in the Phase 22 migration), hard-deleting `audit_logs` rows older than 90 days. This is genuine, not just documented — good sign for auditor purposes.
- `ai_chatbot_interaction` is not an `audit_logs` action — see §1.

## 4. Evidence documentation (Part 4)

- `evidence/ai-disclosure/2026-08-16-policy-implementation.md` exists and, unusually for this kind of document, already lists its own gaps (see its §4) rather than claiming full coverage — that's intentional and should stay that way rather than being "cleaned up" to look fully green.

## 5. Cross-browser / device / performance testing (Parts 2.5, 5.4, 7.1)

**Not performed, and not honestly performable in this environment**: no access to Safari/Firefox, no live tenant production sites, no mobile devices, no performance profiler attached to a real deployment. The one thing actually verified visually: a `next build && next start` production screenshot confirming the "Powered by AI" label renders correctly above the chat input (done earlier this session). Everything else in Parts 2.5/5.4/7.1 — pixel-perfect color checks, 375px/768px/1920px screenshots, dark-mode rendering, render/write timing — is **unchecked**, not silently assumed passing.

## 6. `/security` page link (Part 8.2)

Not implemented. `docs/` is not a web-served route in this Next.js app, so linking to `docs/ai-disclosure-policy.md` from a public page would be a dead link. Skipped deliberately, not missed.

---

## 7. Recommendation

Functionally, ship as-is — the badges, toggle, meta tag, and audit logging all work as designed. Before treating this checklist itself as SOC 2-ready evidence:

1. Get the legal citations reviewed by actual counsel (repeated flag, still open).
2. Either update this checklist's assumptions to match the real file names/colors/schema, or note in the evidence trail that the original checklist described a different (earlier-drafted) implementation than what shipped.
3. If an auditor needs cross-browser/device proof, that testing still needs to happen against the live production site with real browsers — it hasn't yet.
