-- Lets tenants offer a discount on any line item and/or the whole order,
-- and independently choose — at each level — whether customer-facing
-- views show the discount + original price, or just the final price as
-- if that were the price all along.
--
-- Also brings recalculate_order_total() under version control for the
-- first time: like public.tenant_id(), it only ever existed as a
-- hand-created function never captured in a migration. It needs
-- updating anyway to apply these discounts, so this is the natural
-- point to fix that tracking gap.

alter table order_line_items
  add column if not exists discount_type text check (discount_type in ('percent','flat')),
  add column if not exists discount_value numeric check (discount_value >= 0),
  add column if not exists show_discount boolean not null default true;

alter table orders
  add column if not exists discount_type text check (discount_type in ('percent','flat')),
  add column if not exists discount_value numeric check (discount_value >= 0),
  add column if not exists show_discount boolean not null default true;

-- Shared discount math so the line-item trigger, the order-level trigger,
-- and any future server-side calculation all apply discounts identically.
create or replace function public.apply_discount(amount numeric, discount_type text, discount_value numeric)
returns numeric
language sql
immutable
as $$
  select case
    when discount_type = 'percent' and discount_value is not null then greatest(amount * (1 - discount_value / 100.0), 0)
    when discount_type = 'flat'    and discount_value is not null then greatest(amount - discount_value, 0)
    else amount
  end;
$$;

-- Re-sums order_line_items (applying each line's own discount) and then
-- applies the order-level discount on top, whenever a line item changes.
create or replace function public.recalculate_order_total() returns trigger
  security definer
  set search_path = public
as $$
declare
  v_order_id  uuid;
  v_tenant_id uuid;
  v_subtotal  numeric;
  o           record;
begin
  if TG_OP = 'DELETE' then
    v_order_id  := OLD.order_id;
    v_tenant_id := OLD.tenant_id;
  else
    v_order_id  := NEW.order_id;
    v_tenant_id := NEW.tenant_id;
  end if;

  select coalesce(sum(public.apply_discount(quantity * unit_price, discount_type, discount_value)), 0)
  into v_subtotal
  from order_line_items
  where order_id = v_order_id and tenant_id = v_tenant_id;

  select discount_type, discount_value into o
  from orders where id = v_order_id and tenant_id = v_tenant_id;

  update orders
  set total_amount = public.apply_discount(v_subtotal, o.discount_type, o.discount_value)
  where id = v_order_id and tenant_id = v_tenant_id;

  return null;
end;
$$ language plpgsql;

-- Mirror recalculation when the order's own discount fields change —
-- a BEFORE trigger setting NEW.total_amount directly, so it can't
-- recurse into itself the way an AFTER trigger issuing its own UPDATE
-- would.
create or replace function public.recalculate_order_total_on_order_change() returns trigger
  security definer
  set search_path = public
as $$
declare
  v_subtotal numeric;
begin
  select coalesce(sum(public.apply_discount(quantity * unit_price, discount_type, discount_value)), 0)
  into v_subtotal
  from order_line_items
  where order_id = new.id and tenant_id = new.tenant_id;

  new.total_amount := public.apply_discount(v_subtotal, new.discount_type, new.discount_value);
  return new;
end;
$$ language plpgsql;

drop trigger if exists order_discount_recalc on orders;
create trigger order_discount_recalc
  before update of discount_type, discount_value on orders
  for each row
  when (old.discount_type is distinct from new.discount_type or old.discount_value is distinct from new.discount_value)
  execute function recalculate_order_total_on_order_change();
