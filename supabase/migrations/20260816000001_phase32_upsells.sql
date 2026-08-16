-- Phase 32: Smart Upsells. Rule-based add-on suggestions surfaced while a
-- tenant edits a quote/order and to the customer at portal checkout. RLS
-- pattern mirrors loyalty (20260815000006_phase31_loyalty.sql).

create table if not exists tenant_upsell_rules (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  rule_name                 text not null,
  description               text,
  trigger_catalog_item_id   uuid references catalog_items(id) on delete set null,
  trigger_keywords          text[],
  suggested_catalog_item_id uuid not null references catalog_items(id) on delete cascade,
  bundle_discount_percent   numeric(5,2) not null default 5,
  bundle_description        text,
  bundle_emoji_icon         text,
  show_every_x_bookings     integer not null default 1,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists tenant_upsell_rules_tenant_active_idx on tenant_upsell_rules (tenant_id, is_active);
create index if not exists tenant_upsell_rules_trigger_idx on tenant_upsell_rules (trigger_catalog_item_id);

alter table tenant_upsell_rules enable row level security;

drop policy if exists "tenant_upsell_rules: tenant select" on tenant_upsell_rules;
create policy "tenant_upsell_rules: tenant select"
  on tenant_upsell_rules for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "tenant_upsell_rules: tenant owner write" on tenant_upsell_rules;
create policy "tenant_upsell_rules: tenant owner write"
  on tenant_upsell_rules for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

create table if not exists upsell_analytics (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  upsell_rule_id      uuid not null references tenant_upsell_rules(id) on delete cascade,
  contact_id          uuid not null references contacts(id) on delete cascade,
  order_id            uuid references orders(id) on delete set null,
  shown_in            text not null check (shown_in in ('order_edit','portal_checkout')),
  accepted            boolean not null default false,
  accepted_at         timestamptz,
  base_service_amount numeric(10,2),
  upsell_amount       numeric(10,2),
  discount_given      numeric(10,2),
  revenue_lift        numeric(10,2),
  created_at          timestamptz not null default now()
);

create index if not exists upsell_analytics_tenant_created_idx on upsell_analytics (tenant_id, created_at desc);
create index if not exists upsell_analytics_rule_accepted_idx on upsell_analytics (upsell_rule_id, accepted);

alter table upsell_analytics enable row level security;

drop policy if exists "upsell_analytics: tenant select" on upsell_analytics;
create policy "upsell_analytics: tenant select"
  on upsell_analytics for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "upsell_analytics: tenant owner write" on upsell_analytics;
create policy "upsell_analytics: tenant owner write"
  on upsell_analytics for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));
