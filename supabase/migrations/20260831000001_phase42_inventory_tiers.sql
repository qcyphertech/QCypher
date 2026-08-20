-- Phase 42: Inventory Lite/Full tiers. Extends the existing catalog_items
-- table (Lite already covered by name/type/price/billing_unit/taxable/
-- deposit — this adds the stock + Full-tier fields) instead of a parallel
-- inventory_items table.
alter table catalog_items
  add column if not exists quantity         integer,
  add column if not exists unit_of_measure  text,
  add column if not exists reorder_point    integer,
  add column if not exists expiry_date      date,
  add column if not exists image_url        text;

-- Tier gate. NOT modeled via platform_modules/tenant_module_access — that
-- system defaults every module to "granted unless a super admin explicitly
-- restricts it" (see listTenantModuleAccess: `enabled: overrideMap.get(m.key)
-- ?? true`), which is backwards for a tier a tenant should NOT have until a
-- super admin explicitly grants it. A plain column keeps the same
-- "super-admin sets it, tenant just reads it" shape without inverting that
-- shared default for every other module.
alter table tenants
  add column if not exists inventory_tier text not null default 'lite'
    check (inventory_tier in ('lite', 'full'));

-- No plan currently maps to an auto-Full tier (only 'free' exists today —
-- confirmed via `select distinct plan from tenants`), so no backfill query
-- is needed; every existing tenant already defaults to 'lite' above.

create table if not exists catalog_rentals (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  catalog_item_id      uuid not null references catalog_items(id) on delete cascade,
  order_id             uuid references orders(id) on delete set null,
  rented_by            uuid not null references auth.users(id),
  rented_date          timestamptz not null default now(),
  due_date             timestamptz not null,
  returned_date        timestamptz,
  condition_on_return  text check (condition_on_return in ('good', 'needs_repair', 'damaged')),
  notes                text,
  created_at           timestamptz not null default now()
);

alter table catalog_rentals enable row level security;

-- Tenant isolation only — Full-tier gating happens in the server actions
-- (getInventoryTier()), matching how every other tier/feature check in
-- this app is enforced in application code, not RLS.
drop policy if exists "catalog_rentals: tenant isolation" on catalog_rentals;
create policy "catalog_rentals: tenant isolation"
  on catalog_rentals for all
  using (tenant_id::text = get_tenant_id())
  with check (tenant_id::text = get_tenant_id());

create index if not exists catalog_rentals_tenant_id_idx on catalog_rentals(tenant_id);
create index if not exists catalog_rentals_catalog_item_id_idx on catalog_rentals(catalog_item_id);
