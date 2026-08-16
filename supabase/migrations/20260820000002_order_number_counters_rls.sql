-- order_number_counters has a tenant_id column but was never given RLS —
-- found during Phase 35 SOC 2 gap assessment. No app code queries this
-- table directly (it's only touched by the assign_order_number() trigger
-- on `orders`, which runs as the calling user), so without RLS any
-- authenticated user could read/write another tenant's order-numbering
-- counter directly via the Supabase REST API. Only insert/update policies
-- are added — the app has no reason to select or delete rows here, and
-- deletes still happen via the tenant FK's `on delete cascade`, which
-- runs as the deleting (service) role and isn't blocked by RLS.

alter table order_number_counters enable row level security;

drop policy if exists "order_number_counters: tenant insert" on order_number_counters;
create policy "order_number_counters: tenant insert"
  on order_number_counters for insert
  with check (tenant_id = public.tenant_id());

drop policy if exists "order_number_counters: tenant update" on order_number_counters;
create policy "order_number_counters: tenant update"
  on order_number_counters for update
  using (tenant_id = public.tenant_id())
  with check (tenant_id = public.tenant_id());
