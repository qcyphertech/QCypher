-- Phase 33b: Staff-Location Assignments + real RLS isolation. Restricts
-- non-owner users to location-tagged rows they're assigned to. Three
-- safety properties (confirmed with the user) keep this a no-op for any
-- tenant that hasn't adopted multi-location:
--   1. location_id IS NULL rows stay visible to everyone
--   2. owners / super admins always see everything
--   3. the restriction is inert while a tenant has zero tenant_locations rows

create table if not exists staff_location_assignments (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references tenants(id) on delete cascade,
  user_id                     uuid not null references auth.users(id) on delete cascade,
  location_id                 uuid not null references tenant_locations(id) on delete cascade,
  role                        text not null default 'technician' check (role in ('manager','technician','admin')),
  is_primary_location         boolean not null default true,
  can_schedule_cross_location boolean not null default false,
  assigned_at                 timestamptz not null default now(),
  unique (user_id, location_id)
);

create index if not exists staff_location_assignments_tenant_location_idx on staff_location_assignments (tenant_id, location_id);
create index if not exists staff_location_assignments_user_tenant_idx on staff_location_assignments (user_id, tenant_id);

alter table staff_location_assignments enable row level security;

drop policy if exists "staff_location_assignments: tenant select" on staff_location_assignments;
create policy "staff_location_assignments: tenant select"
  on staff_location_assignments for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "staff_location_assignments: tenant owner write" on staff_location_assignments;
create policy "staff_location_assignments: tenant owner write"
  on staff_location_assignments for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

-- Core visibility gate — same shape/security posture as public.user_role()
-- and public.is_super_admin() (stable, security definer).
create or replace function public.can_view_location_row(row_location_id uuid) returns boolean as $$
  select
    row_location_id is null
    or public.is_super_admin()
    or public.user_role() = 'owner'
    or not exists (select 1 from tenant_locations tl where tl.tenant_id = public.tenant_id())
    or exists (
      select 1 from staff_location_assignments sla
      where sla.tenant_id = public.tenant_id()
        and sla.user_id = auth.uid()
        and sla.location_id = row_location_id
    );
$$ language sql stable security definer;

-- The live DB has TWO overlapping SELECT policies per table (contacts,
-- orders, catalog_items) using different tenant-check mechanisms —
-- auth.jwt()->>'tenant_id' directly, a bare tenant_id() function, and an
-- undocumented get_tenant_id() function — none of which are captured
-- together in any single migration file. Since Postgres ORs multiple
-- permissive policies, the location check must be ANDed onto EVERY
-- existing SELECT policy, not just one, or it's trivially bypassed by
-- whichever policy doesn't have it. Each original expression is
-- preserved verbatim (exact text confirmed live via pg_policies) —
-- nothing is dropped or reimplemented, only extended.

drop policy if exists "catalog_items: tenant isolation select" on catalog_items;
create policy "catalog_items: tenant isolation select"
  on catalog_items for select
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_catalog_items_select" on catalog_items;
create policy "tenant_catalog_items_select"
  on catalog_items for select
  using (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "contacts: tenant isolation select" on contacts;
create policy "contacts: tenant isolation select"
  on contacts for select
  using ((tenant_id = tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "tenant_contacts_select" on contacts;
create policy "tenant_contacts_select"
  on contacts for select
  using (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "orders: tenant isolation select" on orders;
create policy "orders: tenant isolation select"
  on orders for select
  using (((tenant_id)::text = (auth.jwt() ->> 'tenant_id'::text)) and public.can_view_location_row(location_id));

drop policy if exists "tenant_orders_select" on orders;
create policy "tenant_orders_select"
  on orders for select
  using (((tenant_id)::text = get_tenant_id()) and public.can_view_location_row(location_id));

drop policy if exists "recurring_jobs: tenant select" on recurring_jobs;
create policy "recurring_jobs: tenant select"
  on recurring_jobs for select
  using (((tenant_id = tenant_id()) or is_super_admin()) and public.can_view_location_row(location_id));
