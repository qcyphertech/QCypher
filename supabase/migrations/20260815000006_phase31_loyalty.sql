-- Phase 31: Loyalty & Rewards. Layer 1 (tenant's customers: tier discounts,
-- referral credit, redeemable at checkout) and Layer 2 (tenants referring
-- other tenants: tracked, manually fulfilled — there's no automated tenant
-- billing pipeline to hook a real discount/credit into). RLS pattern mirrors
-- recurring_jobs (20260815000004_phase30_recurring_jobs.sql).

create table if not exists loyalty_settings (
  tenant_id                      uuid primary key references tenants(id) on delete cascade,
  bronze_min_amount              numeric(10,2) not null default 500,
  bronze_discount_percent        numeric(5,2) not null default 5,
  silver_min_amount              numeric(10,2) not null default 1500,
  silver_discount_percent        numeric(5,2) not null default 10,
  gold_min_amount                numeric(10,2) not null default 3000,
  gold_discount_percent          numeric(5,2) not null default 15,
  referral_credit_amount         numeric(10,2) not null default 25,
  referral_requires_completion   boolean not null default true,
  tier_program_enabled           boolean not null default true,
  referral_program_enabled       boolean not null default true,
  updated_at                     timestamptz not null default now()
);

alter table loyalty_settings enable row level security;

drop policy if exists "loyalty_settings: tenant select" on loyalty_settings;
create policy "loyalty_settings: tenant select"
  on loyalty_settings for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "loyalty_settings: tenant owner write" on loyalty_settings;
create policy "loyalty_settings: tenant owner write"
  on loyalty_settings for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

create table if not exists customer_loyalty (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  contact_id          uuid not null references contacts(id) on delete cascade,
  current_tier        text not null default 'bronze' check (current_tier in ('bronze','silver','gold')),
  lifetime_spend      numeric(10,2) not null default 0,
  -- Recurring-job bonus only; spend-based points are derived from
  -- lifetime_spend on read, not stored as a separate ledger figure.
  bonus_points        integer not null default 0,
  credit_balance      numeric(10,2) not null default 0,
  tier_promoted_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, contact_id)
);

create index if not exists customer_loyalty_tenant_contact_idx on customer_loyalty (tenant_id, contact_id);

alter table customer_loyalty enable row level security;

drop policy if exists "customer_loyalty: tenant select" on customer_loyalty;
create policy "customer_loyalty: tenant select"
  on customer_loyalty for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "customer_loyalty: tenant owner write" on customer_loyalty;
create policy "customer_loyalty: tenant owner write"
  on customer_loyalty for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

create table if not exists loyalty_transactions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  contact_id            uuid not null references contacts(id) on delete cascade,
  type                  text not null check (type in ('spend','recurring_bonus','referral_earned','redemption','manual_adjustment')),
  amount                numeric(10,2),
  points                integer,
  order_id              uuid references orders(id) on delete set null,
  referred_contact_id   uuid references contacts(id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists loyalty_transactions_tenant_contact_idx on loyalty_transactions (tenant_id, contact_id, created_at desc);

alter table loyalty_transactions enable row level security;

drop policy if exists "loyalty_transactions: tenant select" on loyalty_transactions;
create policy "loyalty_transactions: tenant select"
  on loyalty_transactions for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "loyalty_transactions: tenant owner write" on loyalty_transactions;
create policy "loyalty_transactions: tenant owner write"
  on loyalty_transactions for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

-- Referral attribution between customers of the same tenant.
alter table contacts add column if not exists referred_by_contact_id uuid references contacts(id) on delete set null;

-- ─── Layer 2: tenant-refers-tenant ─────────────────────────────────────────
alter table tenants add column if not exists referred_by_tenant_id uuid references tenants(id) on delete set null;

create table if not exists tenant_referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_tenant_id    uuid not null references tenants(id) on delete cascade,
  referred_tenant_id    uuid not null references tenants(id) on delete cascade,
  -- No 'pending' state — tenant creation itself is the completion signal,
  -- since there's no self-serve signup or billing automation to wait on.
  status                text not null default 'completed' check (status in ('completed','claimed','fulfilled')),
  credit_type           text check (credit_type in ('discount','balance')),
  credit_amount         numeric(10,2) not null default 50,
  claimed_at            timestamptz,
  fulfilled_at          timestamptz,
  created_at            timestamptz not null default now(),
  unique (referred_tenant_id)
);

create index if not exists tenant_referrals_referrer_idx on tenant_referrals (referrer_tenant_id, status);

alter table tenant_referrals enable row level security;

drop policy if exists "tenant_referrals: referrer select" on tenant_referrals;
create policy "tenant_referrals: referrer select"
  on tenant_referrals for select
  using (referrer_tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "tenant_referrals: referrer owner claim" on tenant_referrals;
create policy "tenant_referrals: referrer owner claim"
  on tenant_referrals for update
  using (public.is_super_admin() or (referrer_tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (referrer_tenant_id = public.tenant_id() and public.user_role() = 'owner'));

drop policy if exists "tenant_referrals: super admin insert" on tenant_referrals;
create policy "tenant_referrals: super admin insert"
  on tenant_referrals for insert
  with check (public.is_super_admin());
