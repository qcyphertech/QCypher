-- Phase 26 addition: tenant-owned payment accounts. Lets a tenant connect
-- their own Stripe account (real OAuth Connect) so customer payment links
-- settle directly to their bank instead of QCypher's Helcim account.
-- Helcim has no equivalent OAuth flow for an *existing* merchant account
-- (verified against their docs) — Helcim support is a later phase via their
-- Connected Account Registrations referral signup, not built here.

create table if not exists tenant_payment_accounts (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade unique,
  provider              text not null check (provider in ('stripe', 'helcim')),
  provider_account_id   text,               -- Stripe acct_xxx / future Helcim connectedAccountId
  api_key_enc           text,               -- AES-256-GCM — reserved for Helcim (later phase)
  access_token_enc      text,               -- AES-256-GCM — Stripe OAuth access token
  refresh_token_enc     text,               -- AES-256-GCM — Stripe OAuth refresh token
  is_connected          boolean not null default false,
  connected_at          timestamptz,
  account_holder_name   text,
  account_email         text,
  last_verified_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists tenant_payment_accounts_connected_idx
  on tenant_payment_accounts (tenant_id, is_connected);

alter table tenant_payment_accounts enable row level security;

drop policy if exists "tenant_own_payment_account" on tenant_payment_accounts;
create policy "tenant_own_payment_account" on tenant_payment_accounts
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
