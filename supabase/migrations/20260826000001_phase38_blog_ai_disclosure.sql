-- Phase 38: honest AI-assistance disclosure toggle for tenant blog posts.
-- QCypher's own blog (is_qcypher_blog = true) is unaffected by this toggle.

alter table blog_articles
  add column if not exists disclose_ai_assistance boolean not null default false;
