-- Phase 41: Analytics & Reporting Dashboard (MVP)
--
-- Scoped down from the original spec after verifying the real schema:
--   - No `invoices`-only revenue source is used — this mirrors the existing
--     (app)/dashboard/page.tsx convention of orders.payment_status = 'paid'
--     as the revenue source, to avoid a second, inconsistent definition of
--     "revenue" in the same app.
--   - No completion-timestamp or rating data exists anywhere in the schema,
--     so "avg completion time", "on-time rate", and "quality score" are
--     dropped — only a real jobs_completed_month count is kept.
--   - No staff/technician-to-order assignment exists, so the whole "Team
--     Performance" section is dropped for v1.

create table if not exists analytics_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  snapshot_date           date not null default current_date,

  revenue_mtd             numeric(10,2) not null default 0,
  revenue_ytd             numeric(10,2) not null default 0,
  revenue_growth_percent  numeric(6,2),
  revenue_monthly_trend   jsonb not null default '[]'::jsonb, -- [{month, revenue}] x12
  revenue_by_service      jsonb not null default '[]'::jsonb, -- [{name, revenue}] top 5

  customers_active        int not null default 0,
  customers_new_month     int not null default 0,
  customers_inactive_30d  int not null default 0,
  retention_rate_percent  numeric(6,2), -- null until a prior snapshot exists to compare against

  jobs_completed_month    int not null default 0,

  revenue_summary         text,
  customer_summary        text,
  job_summary              text,

  refresh_type            text not null default 'manual' check (refresh_type in ('auto', 'manual')),
  triggered_by            uuid references auth.users(id) on delete set null,

  created_at              timestamptz not null default now(),
  unique (tenant_id, snapshot_date)
);

create index if not exists analytics_snapshots_tenant_date_idx
  on analytics_snapshots (tenant_id, snapshot_date desc);

alter table analytics_snapshots enable row level security;

drop policy if exists "analytics_snapshots: tenant owner read" on analytics_snapshots;
create policy "analytics_snapshots: tenant owner read"
  on analytics_snapshots for select
  using (tenant_id = public.tenant_id() and public.user_role() = 'owner');

-- Writes go through the server action's admin client (service role bypasses
-- RLS) — same pattern as blog_articles/blog_metrics elsewhere in this app.

-- Feature-flag wiring, matching every other nav module (show_pipeline, etc.)
alter table tenants
  alter column settings set default '{
    "show_pipeline":  true,
    "show_calendar":  true,
    "show_templates": true,
    "show_catalog":   true,
    "show_orders":    true,
    "show_overview":  true,
    "show_crm_bot":   true,
    "show_analytics": true
  }'::jsonb;

update tenants set settings = settings || '{"show_analytics": true}'::jsonb
  where not (settings ? 'show_analytics');

insert into platform_modules (key, label, description, icon_key, color, sort_order) values
  ('show_analytics', 'Analytics', 'Revenue, customer health, and job metrics dashboard', 'BarChart3', '#0d6dff', 7)
on conflict (key) do nothing;
