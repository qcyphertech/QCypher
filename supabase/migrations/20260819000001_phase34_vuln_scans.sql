-- Phase 34: Automated Vulnerability Scanning. Platform-wide security scan
-- history — no tenant_id, this is QCypher's own data, not a tenant's.
-- RLS is super-admin-only (select+write), no owner-role carve-out.

create table if not exists vulnerability_scans (
  id                uuid primary key default gen_random_uuid(),
  scan_date         date not null default current_date,
  scan_type         text not null default 'weekly' check (scan_type in ('weekly','on_demand')),
  environment       text not null default 'production',
  critical_count    integer not null default 0,
  high_count        integer not null default 0,
  medium_count      integer not null default 0,
  low_count         integer not null default 0,
  info_count        integer not null default 0,
  report_url        text,
  status            text not null default 'completed' check (status in ('completed','failed')),
  error_message     text,
  alert_sent_at     timestamptz,
  alert_recipients  text[],
  created_at        timestamptz not null default now()
);

create index if not exists vulnerability_scans_date_idx on vulnerability_scans (scan_date desc, environment);

alter table vulnerability_scans enable row level security;

drop policy if exists "vulnerability_scans: super admin only" on vulnerability_scans;
create policy "vulnerability_scans: super admin only"
  on vulnerability_scans for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create table if not exists vulnerability_findings (
  id                    uuid primary key default gen_random_uuid(),
  scan_id               uuid not null references vulnerability_scans(id) on delete cascade,
  vulnerability_type    text,
  severity              text not null check (severity in ('Critical','High','Medium','Low','Info')),
  affected_url          text,
  affected_parameter    text,
  description           text,
  remediation_advice    text,
  owasp_category        text,
  is_resolved           boolean not null default false,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists vulnerability_findings_scan_severity_idx on vulnerability_findings (scan_id, severity);
create index if not exists vulnerability_findings_unresolved_idx on vulnerability_findings (is_resolved, created_at desc);

alter table vulnerability_findings enable row level security;

drop policy if exists "vulnerability_findings: super admin only" on vulnerability_findings;
create policy "vulnerability_findings: super admin only"
  on vulnerability_findings for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
