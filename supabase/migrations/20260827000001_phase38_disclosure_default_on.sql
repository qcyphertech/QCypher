-- Phase 38+: AI-assistance disclosure now defaults ON for new blog posts,
-- matching the compliance-disclosure policy (visible badge at point of
-- interaction, not opt-in). Existing rows are left as-is — tenants who
-- already have posts live keep their current setting rather than being
-- silently flipped.

alter table blog_articles
  alter column disclose_ai_assistance set default true;
