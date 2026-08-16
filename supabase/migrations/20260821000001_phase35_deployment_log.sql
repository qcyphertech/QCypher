-- Phase 35: Deployment log — evidence trail for the change-management
-- policy (docs/change-management-policy.md). Platform-wide data, no
-- tenant_id, RLS is super-admin-only, same pattern as vulnerability_scans.
--
-- Deploys in this app are manual (pnpm exec next build, then
-- `vercel --prod --yes`), not triggered by CI on push — so this table is
-- populated by a wrapper script (scripts/log-deployment.sh) run alongside
-- each deploy, not by a GitHub Actions job.

create table if not exists deployment_log (
  id                 uuid primary key default gen_random_uuid(),
  deployed_at        timestamptz not null default now(),
  deployed_by        text not null,       -- e.g. "thomas" or "claude-code (thomas)"
  commit_hash        text not null,
  commit_message     text,
  environment        text not null default 'production',
  migration_applied  text,                -- migration filename, if one shipped alongside this deploy
  status             text not null default 'success' check (status in ('success','rolled_back')),
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists deployment_log_deployed_at_idx on deployment_log (deployed_at desc);

alter table deployment_log enable row level security;

drop policy if exists "deployment_log: super admin only" on deployment_log;
create policy "deployment_log: super admin only"
  on deployment_log for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
