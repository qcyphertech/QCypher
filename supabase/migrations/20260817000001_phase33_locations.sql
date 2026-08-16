-- Phase 33: Multi-Location Support (v1 — data tagging, not access isolation).
-- Tenants can create named locations and tag contacts with them. No RLS
-- restriction: anyone with tenant access still sees all locations' data,
-- same as today. RLS pattern mirrors upsells (20260816000001_phase32_upsells.sql).

create table if not exists tenant_locations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  location_name  text not null,
  location_code  text not null,
  address        text,
  phone          text,
  timezone       text not null default 'America/New_York',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, location_name),
  unique (tenant_id, location_code)
);

create index if not exists tenant_locations_tenant_active_idx on tenant_locations (tenant_id, is_active);

alter table tenant_locations enable row level security;

drop policy if exists "tenant_locations: tenant select" on tenant_locations;
create policy "tenant_locations: tenant select"
  on tenant_locations for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "tenant_locations: tenant owner write" on tenant_locations;
create policy "tenant_locations: tenant owner write"
  on tenant_locations for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

alter table contacts       add column if not exists location_id uuid references tenant_locations(id) on delete set null;
alter table orders         add column if not exists location_id uuid references tenant_locations(id) on delete set null;
alter table catalog_items  add column if not exists location_id uuid references tenant_locations(id) on delete set null;
alter table recurring_jobs add column if not exists location_id uuid references tenant_locations(id) on delete set null;

create index if not exists contacts_location_idx on contacts (location_id);
