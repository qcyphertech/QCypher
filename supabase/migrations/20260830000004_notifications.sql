-- Tenant-facing notification feed shown under the bell icon in the top
-- nav. Written server-side only (via service-role clients from the
-- specific actions that fire them — quote signed, invoice paid), so no
-- insert policy is needed; tenants only ever read their own and mark
-- them read.

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  type       text not null check (type in ('quote_signed', 'invoice_paid', 'contact_updated')),
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_tenant_unread_idx
  on notifications (tenant_id, created_at desc)
  where read_at is null;

alter table notifications enable row level security;

drop policy if exists "notifications: tenant select" on notifications;
create policy "notifications: tenant select"
  on notifications for select
  using (tenant_id = public.tenant_id());

drop policy if exists "notifications: tenant update" on notifications;
create policy "notifications: tenant update"
  on notifications for update
  using (tenant_id = public.tenant_id())
  with check (tenant_id = public.tenant_id());
