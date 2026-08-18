-- New orders started failing outright ("new row violates row-level
-- security policy for table order_number_counters") after RLS was added
-- to this table. Root cause: assign_order_number()'s upsert is
-- `insert ... on conflict (tenant_id) do update`, and under RLS Postgres
-- needs to see the pre-existing conflicting row to resolve that clause —
-- which requires SELECT-level visibility. This table intentionally has
-- no SELECT policy (the app has no legitimate reason to read it directly,
-- per the original RLS migration), so every upsert past the first order
-- for a tenant hit this wall.
--
-- Fix: make the trigger function SECURITY DEFINER instead of adding a
-- SELECT policy. This is the one legitimate writer/reader of this table
-- — a deterministic, tenant-scoped counter increment fired only from the
-- `orders` insert trigger — so it can safely bypass RLS here, while the
-- table stays fully locked down against any direct API access, which was
-- the actual goal of the original RLS migration.
create or replace function assign_order_number() returns trigger
  security definer
  set search_path = public
as $$
declare
  n integer;
begin
  if new.order_number is not null then
    return new;
  end if;

  insert into order_number_counters (tenant_id, next_number)
  values (new.tenant_id, 2)
  on conflict (tenant_id) do update set next_number = order_number_counters.next_number + 1
  returning next_number - 1 into n;

  new.order_number := n;
  return new;
end;
$$ language plpgsql;
