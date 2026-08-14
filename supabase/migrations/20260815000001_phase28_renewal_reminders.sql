-- Phase 28 addition: real automated 7-day auto-renewal reminder.
-- customer_pricing gets a next_billing_date anchor a super admin sets
-- once per tenant (via the Pricing panel); the cron below sends the
-- reminder 7 days out and rolls the anchor forward a month once it
-- passes, so it keeps cycling without needing a real payment-charging
-- engine (QCypher still bills tenants via manually-created invoices —
-- this only automates the disclosure email, not the actual charge).

alter table customer_pricing add column if not exists next_billing_date date;

create table if not exists renewal_reminders_sent (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  billing_date    date not null,
  sent_at         timestamptz not null default now(),
  unique (tenant_id, billing_date)
);

create index if not exists renewal_reminders_sent_tenant_idx on renewal_reminders_sent (tenant_id, sent_at desc);

alter table renewal_reminders_sent enable row level security;

drop policy if exists "tenant_own_renewal_reminders_select" on renewal_reminders_sent;
create policy "tenant_own_renewal_reminders_select" on renewal_reminders_sent
  for select using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
