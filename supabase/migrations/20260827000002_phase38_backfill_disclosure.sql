-- Phase 38+: backfill existing tenant blog posts to the new default-ON
-- disclosure setting, so posts published before this change also carry
-- the visible badge (QCypher's own blog is unaffected).

update blog_articles
set disclose_ai_assistance = true
where is_qcypher_blog = false
  and disclose_ai_assistance = false;
