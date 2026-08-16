-- Phase 34b: deduplicate vulnerability findings across scans. Each scan
-- still inserts its own vulnerability_findings rows (raw per-scan detail
-- history is preserved), but every finding is now linked to a
-- vulnerability_finding_groups row keyed by a stable fingerprint
-- (type + affected URL + affected parameter). Remediation tracking moves
-- to the group: resolving a group means "no longer seeing this on
-- production." If the same fingerprint reappears on a later scan, the
-- ingest route reopens the group (is_resolved reset to false) — a genuine
-- false positive that keeps re-flagging isn't "resolved" in any
-- meaningful sense, it needs a separate suppression mechanism, which is
-- out of scope for this pass.

create table if not exists vulnerability_finding_groups (
  id                    uuid primary key default gen_random_uuid(),
  fingerprint           text not null unique,
  vulnerability_type    text,
  severity              text not null check (severity in ('Critical','High','Medium','Low','Info')),
  affected_url          text,
  affected_parameter    text,
  description           text,
  remediation_advice    text,
  owasp_category        text,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  occurrence_count      integer not null default 1,
  is_resolved           boolean not null default false,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists vulnerability_finding_groups_open_idx on vulnerability_finding_groups (is_resolved, last_seen_at desc);

alter table vulnerability_finding_groups enable row level security;

drop policy if exists "vulnerability_finding_groups: super admin only" on vulnerability_finding_groups;
create policy "vulnerability_finding_groups: super admin only"
  on vulnerability_finding_groups for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

alter table vulnerability_findings
  add column if not exists group_id uuid references vulnerability_finding_groups(id) on delete set null;

create index if not exists vulnerability_findings_group_idx on vulnerability_findings (group_id);
