-- Sequential per-tenant order numbers — matches the pattern invoices
-- already use, but per-tenant instead of global, since each business
-- expects their own orders to start at #1.

create table if not exists order_number_counters (
  tenant_id   uuid primary key references tenants(id) on delete cascade,
  next_number integer not null default 1
);

alter table orders add column if not exists order_number integer;

create or replace function assign_order_number() returns trigger as $$
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

drop trigger if exists orders_assign_number on orders;
create trigger orders_assign_number
  before insert on orders
  for each row execute function assign_order_number();

-- Backfill existing orders in creation order, per tenant
do $$
declare
  r record;
  seq integer := 0;
  last_tenant uuid := null;
begin
  for r in select id, tenant_id from orders order by tenant_id, created_at asc loop
    if r.tenant_id is distinct from last_tenant then
      seq := 1;
      last_tenant := r.tenant_id;
    else
      seq := seq + 1;
    end if;
    update orders set order_number = seq where id = r.id;
  end loop;
end $$;

-- Seed each tenant's counter to continue after its backfilled max
insert into order_number_counters (tenant_id, next_number)
select tenant_id, coalesce(max(order_number), 0) + 1
from orders
group by tenant_id
on conflict (tenant_id) do update set next_number = excluded.next_number;

create unique index if not exists orders_tenant_order_number_idx
  on orders (tenant_id, order_number);
