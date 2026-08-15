-- Phase 30: Recurring job scheduling. Each occurrence of a recurring series
-- becomes a real `orders` row (tagged with recurring_job_id) so it inherits
-- the existing invoicing/payment/job-status/portal machinery for free —
-- only the recurrence *pattern* itself is a new table. Table shape, index
-- style, and RLS policy pattern mirror payment_requests
-- (20260808000005_phase26_payment_requests.sql).

create table if not exists recurring_jobs (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  contact_id                uuid not null references contacts(id) on delete cascade,
  catalog_item_id           uuid references catalog_items(id) on delete set null,
  title                     text not null,
  description               text,
  amount                    numeric(10,2) not null,
  frequency                 text not null
    check (frequency in ('weekly','biweekly','monthly','quarterly','annually','custom')),
  interval_days             integer,  -- used when frequency = 'custom'
  day_of_month              integer check (day_of_month between 1 and 31), -- monthly/quarterly/annually
  next_scheduled_date       date,     -- next occurrence still needing an order created
  status                    text not null default 'active'
    check (status in ('active','paused','cancelled')),
  paused_at                 timestamptz,
  cancelled_at              timestamptz,
  send_reminder             boolean not null default true,
  reminder_days_before      integer not null default 3,
  auto_confirm_if_no_reply  boolean not null default true,
  created_by                uuid not null references auth.users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists recurring_jobs_tenant_status_idx on recurring_jobs (tenant_id, status);
create index if not exists recurring_jobs_next_date_idx on recurring_jobs (next_scheduled_date, status);

alter table recurring_jobs enable row level security;

drop policy if exists "recurring_jobs: tenant select" on recurring_jobs;
create policy "recurring_jobs: tenant select"
  on recurring_jobs for select
  using (tenant_id = public.tenant_id() or public.is_super_admin());

drop policy if exists "recurring_jobs: tenant owner write" on recurring_jobs;
create policy "recurring_jobs: tenant owner write"
  on recurring_jobs for all
  using (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'))
  with check (public.is_super_admin() or (tenant_id = public.tenant_id() and public.user_role() = 'owner'));

-- Each scheduled occurrence of a series becomes a real orders row, so it
-- gets invoicing/payment/job-status/portal support without any new machinery.
alter table orders add column if not exists recurring_job_id uuid references recurring_jobs(id) on delete set null;
alter table orders add column if not exists scheduled_date date;
alter table orders add column if not exists confirm_token text unique default encode(gen_random_bytes(24), 'hex');
alter table orders add column if not exists confirm_token_expires_at timestamptz;
alter table orders add column if not exists reminder_sent_at timestamptz;
alter table orders add column if not exists customer_response text
  check (customer_response is null or customer_response in ('approved','reschedule_requested','skip'));
alter table orders add column if not exists customer_response_at timestamptz;
alter table orders add column if not exists reschedule_to_date date;

create index if not exists orders_recurring_job_idx on orders (recurring_job_id, scheduled_date);
create index if not exists orders_confirm_token_idx on orders (confirm_token);
