-- Phase 26 Part 1: per-tenant pricing overrides (super-admin controlled).
create table if not exists customer_pricing (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade unique,
  base_price_tier          text not null default 'starter'
    check (base_price_tier in ('starter', 'growth', 'all_in')),
  override_monthly_amount  numeric(10,2),
  override_one_time_amount numeric(10,2),
  effective_from           timestamptz not null default now(),
  effective_to             timestamptz,
  reason                   text
    check (reason is null or reason in ('negotiated_discount', 'volume_deal', 'retention', 'non_profit')),
  notes                    text,
  created_by                uuid not null references auth.users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists customer_pricing_tenant_effective_idx
  on customer_pricing (tenant_id, effective_from desc);

alter table customer_pricing enable row level security;

drop policy if exists "customer_pricing: super admin only" on customer_pricing;
create policy "customer_pricing: super admin only"
  on customer_pricing for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Phase 26 Part 3: QCypher -> customer invoices, paid via Helcim.
create sequence if not exists invoice_number_seq;

create table if not exists invoices (
  id                uuid primary key default gen_random_uuid(),
  invoice_number    text not null unique
    default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0')),
  tenant_id         uuid references tenants(id) on delete set null,
  amount            numeric(10,2) not null,
  description       text,
  invoice_type      text not null default 'one_time'
    check (invoice_type in ('one_time', 'monthly', 'custom')),
  created_by        uuid not null references auth.users(id),
  status            text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  helcim_checkout_token text,
  helcim_secret_token   text,
  helcim_transaction_id text,
  sent_to_email     text,
  sent_at           timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists invoices_tenant_created_idx on invoices (tenant_id, created_at desc);
create index if not exists invoices_status_paid_idx on invoices (status, paid_at desc);

alter table invoices enable row level security;

drop policy if exists "invoices: super admin only" on invoices;
create policy "invoices: super admin only"
  on invoices for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Drafts older than 90 days that were never sent are low-value clutter —
-- purged by a daily cron, matching the Phase 25 retention pattern.
create or replace function purge_stale_draft_invoices() returns void as $$
  delete from invoices
  where status = 'draft'
    and created_at < now() - interval '90 days';
$$ language sql security definer;
