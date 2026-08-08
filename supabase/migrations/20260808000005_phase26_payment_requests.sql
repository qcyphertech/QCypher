-- Phase 26 Part 4: tenant-admin payment requests for their own customers'
-- orders/jobs. Stateless token access (same pattern as quote_tokens) so a
-- customer can pay via SMS or email link with no portal login required.
create table if not exists payment_requests (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  order_id    uuid not null references orders(id) on delete cascade,
  contact_id  uuid not null references contacts(id) on delete cascade,
  amount      numeric(10,2) not null,
  status      text not null default 'active'
    check (status in ('active', 'paid', 'expired', 'cancelled')),
  sent_via    text check (sent_via is null or sent_via in ('sms', 'email')),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days'),
  paid_at     timestamptz,
  unique (order_id)
);

create index if not exists payment_requests_tenant_id_idx on payment_requests (tenant_id, created_at desc);
create index if not exists payment_requests_contact_id_idx on payment_requests (contact_id, status);
create index if not exists payment_requests_token_idx on payment_requests (token);

alter table payment_requests enable row level security;

drop policy if exists "payment_requests: tenant select" on payment_requests;
create policy "payment_requests: tenant select"
  on payment_requests for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "payment_requests: tenant owner write" on payment_requests;
create policy "payment_requests: tenant owner write"
  on payment_requests for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));
