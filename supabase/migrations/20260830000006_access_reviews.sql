-- Automates the "monthly super-admin access review" that
-- scripts/review-super-admins.py could previously only run by hand —
-- confirmed 2026-08-18 during a QA pass that nothing actually
-- scheduled it, so "scheduled (monthly)" in docs/qa-checklist-status.md
-- was aspirational, not real. A Vercel Cron hitting
-- /api/cron/review-super-admins on the 1st of each month now writes a
-- row here automatically, platform-wide (not tenant-scoped — RLS
-- intentionally restricts reads to super-admins only, same audience
-- as the data being reviewed).
create table public.access_reviews (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  super_admin_count int not null,
  flagged_count int not null default 0,
  details jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.access_reviews enable row level security;

create policy "Super admins can read access reviews"
  on public.access_reviews for select
  using ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean is true);
