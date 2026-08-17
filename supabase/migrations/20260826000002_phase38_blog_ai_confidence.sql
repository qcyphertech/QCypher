-- Phase 38: auto-computed AI-detection confidence, stored per article so a
-- tenant's self-serve draft shows a score without them needing to run the
-- (super-admin-only) manual detection tool themselves.

alter table blog_articles
  add column if not exists ai_confidence smallint;
