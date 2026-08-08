-- The Phase 25 hard-delete cron logs an 'account_deleted' entry authored by
-- 'system' (no real user_id) — audit_logs.user_id was NOT NULL, which
-- silently failed that insert (Supabase JS doesn't throw on insert errors
-- unless checked). Allow a null user_id for system-authored entries.
alter table audit_logs alter column user_id drop not null;
