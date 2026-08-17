# AI Disclosure Implementation — August 2026

This record documents what was actually implemented and verified for the
AI disclosure policy (`docs/ai-disclosure-policy.md`), and is deliberately
honest about what was and wasn't independently verified in this pass —
it is a real implementation log, not a template filled with placeholder
confirmations.

## 1. Policy Document

- File: `docs/ai-disclosure-policy.md`, mirrored to
  `evidence/policies/ai-disclosure-policy.md` and
  `evidence/policies/2026-08-ai-disclosure-policy.md`
- Compliance basis as stated in the policy: FTC March 2026 AI policy, EU AI
  Act Article 50, California SB 942
- **Not independently verified**: the specific regulation citations, dates,
  and penalty figures in the policy document were supplied by the business
  owner, not verified against primary legal sources during implementation.
  Treat this policy as a draft pending review by qualified counsel before
  relying on it as verified regulatory fact in an actual audit or
  enforcement action.

## 2. Visible Disclosures — Implementation

**Tenant blog posts** (`apps/web/src/app/portal/[slug]/blog/[postSlug]/page.tsx`)
- Badge: "⚡ AI-Assisted", pinned top-right of the article card
- Meta tag: `<meta name="ai-assisted" content="true">`, always present on
  every tenant blog post regardless of the badge toggle (`generateMetadata`
  in the same file)
- Tenant control: `disclose_ai_assistance` column on `blog_articles`,
  default `TRUE` as of migration `20260827000001_phase38_disclosure_default_on.sql`;
  existing posts backfilled to `TRUE` in `20260827000002_phase38_backfill_disclosure.sql`
- Toggle UI: `apps/web/src/components/settings/BlogSettingsPanel.tsx`

**Marketing/website chatbot** (`apps/web/src/components/shared/ChatbotWidget.tsx`)
- Label: "Powered by AI", rendered directly above the message input,
  always visible whenever the chat panel is open
- Mounted on qcyphertech.com and any tenant marketing route matching
  `ChatbotWidgetGate.tsx`'s allowlist
- Verified directly: built the app with `next build`/`next start` and
  confirmed via a real browser screenshot that the label renders above
  the input when the widget is opened. (`next dev`'s hydration is broken
  by this app's CSP `unsafe-eval` restriction, so this had to be checked
  against a production build rather than the dev server.)
- **Not verified**: live qcyphertech.com production and real tenant
  marketing sites were not individually re-checked in this pass; the
  local production build check above is the actual verification
  performed.

**CRM in-app assistant** (`apps/web/src/components/layout/CrmBotWidget.tsx`)
- Badge: "AI-ASSISTED", inline in the sidebar header next to "QBot"
- Mounted behind the `show_crm_bot` module setting in `AppShell.tsx`
- **Not independently screenshotted** in this pass — verified by reading
  the rendered JSX and confirming the build compiles/type-checks; not
  re-confirmed against a live authenticated CRM session (this tool sits
  behind tenant auth this session doesn't hold credentials for).

## 3. Machine-Readable Marking

- Meta tag present on all tenant blog posts (see above)
- Audit log entries (see below) are stored as structured rows in
  `audit_logs`, queryable/exportable as JSON

## 4. Audit Trail (Phase 22 `audit_logs`) — Actual Coverage

Real coverage differs from what the spec assumed, because `audit_logs` is
a **tenant-scoped** table (`tenant_id not null`, RLS requires
`tenant_id = public.tenant_id()` on insert) — it has no concept of an
anonymous, un-authenticated actor. This constrains what can honestly be
logged:

- **`ai_blog_published`** — logged on every tenant blog publish, both the
  tenant's own self-serve publish (`publishMyBlogArticle` in
  `apps/web/src/lib/actions/blog.ts`) and a super-admin's
  approve-and-publish (`approveAndPublishArticle`, same file). Details
  recorded: `model`, `badge_shown` (the article's `disclose_ai_assistance`
  value at publish time). QCypher's own blog (`is_qcypher_blog = true`,
  `tenant_id = null`) is **not logged** here — there is no tenant to
  attribute the row to under the current schema.
- **`ai_crm_bot_query`** — logged on every `sendCrmBotMessage` call
  (`apps/web/src/lib/actions/crm-bot.ts`), scoped to the querying tenant
  member.
- **`ai_chatbot_interaction`** (anonymous website chatbot) — **not
  implemented**. The website chatbot is used by anonymous visitors with
  no Supabase session and, on qcyphertech.com itself, no tenant at all.
  `audit_logs` requires both a non-null `user_id` and a non-null
  `tenant_id` scoped by RLS to the acting member's own tenant — there is
  no real user or tenant to attribute an anonymous visitor's message to.
  Forcing a row in (a synthetic user_id, a null/placeholder tenant_id)
  would insert fabricated data into a compliance audit trail, which is
  worse than not logging at all. Logging this properly would need either
  a schema change (nullable tenant_id/user_id, or a separate
  visitor-interaction log table) or a different retention mechanism —
  flagged here rather than implemented as a workaround.

## 5. Compliance Verification Checklist

- [x] Blog badge renders conditionally on `disclose_ai_assistance`
- [x] Meta tag present on all tenant blog posts (unconditional)
- [x] "Powered by AI" label — verified via real production-build screenshot
- [x] "AI-Assisted" CRM badge — present in source, not independently screenshotted this pass
- [x] `ai_blog_published` audit logging — implemented, tenant + admin publish paths
- [x] `ai_crm_bot_query` audit logging — implemented
- [ ] `ai_chatbot_interaction` audit logging — not implemented (see §4)
- [ ] Legal citations in the policy document — not independently verified (see §1)

## 6. Next Steps

- Get the policy document (citations, dates, penalty figures) reviewed by
  qualified counsel before treating it as verified SOC 2 evidence
- Decide how (or whether) to log anonymous chatbot interactions —
  requires a schema/architecture decision, not just an implementation one
- Quarterly review: November 2026
