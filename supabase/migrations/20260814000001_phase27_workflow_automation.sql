-- ============================================================
-- Phase 27: Workflow Automation — Invoice Escalation & Auto-Review Requests
-- ============================================================

-- ────────────────────────────────────────
-- 1. workflow_settings — one row per tenant
-- ────────────────────────────────────────
create table if not exists workflow_settings (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade unique,
  invoice_reminder_enabled  boolean not null default true,
  invoice_reminder_days     int not null default 3,
  invoice_escalate_enabled  boolean not null default true,
  invoice_escalate_days     int not null default 10,
  review_request_enabled    boolean not null default true,
  review_request_days       int not null default 1,
  review_reminder_enabled   boolean not null default true,
  review_reminder_days      int not null default 7,
  google_review_url         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger workflow_settings_updated_at before update on workflow_settings
  for each row execute function set_updated_at();

alter table workflow_settings enable row level security;

drop policy if exists "tenant_own_workflow_settings" on workflow_settings;
create policy "tenant_own_workflow_settings" on workflow_settings
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ────────────────────────────────────────
-- 2. customer_automation_overrides — per-contact opt-out
-- ────────────────────────────────────────
create table if not exists customer_automation_overrides (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  contact_id              uuid not null references contacts(id) on delete cascade,
  send_review_requests    boolean not null default true,
  send_invoice_reminders  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id, contact_id)
);

create trigger customer_automation_overrides_updated_at before update on customer_automation_overrides
  for each row execute function set_updated_at();

alter table customer_automation_overrides enable row level security;

drop policy if exists "tenant_own_automation_overrides" on customer_automation_overrides;
create policy "tenant_own_automation_overrides" on customer_automation_overrides
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ────────────────────────────────────────
-- 3. invoice_escalations — idempotency log, written by cron via admin client
-- ────────────────────────────────────────
create table if not exists invoice_escalations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  stage       text not null check (stage in ('reminder', 'escalated')),
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (invoice_id, stage)
);

create index if not exists invoice_escalations_tenant_idx on invoice_escalations (tenant_id, sent_at desc);

alter table invoice_escalations enable row level security;

drop policy if exists "tenant_own_invoice_escalations_select" on invoice_escalations;
create policy "tenant_own_invoice_escalations_select" on invoice_escalations
  for select using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ────────────────────────────────────────
-- 4. review_requests — idempotency log, written by cron via admin client
-- ────────────────────────────────────────
create table if not exists review_requests (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  order_id    uuid not null references orders(id) on delete cascade,
  contact_id  uuid references contacts(id) on delete set null,
  stage       text not null check (stage in ('initial', 'followup')),
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (order_id, stage)
);

create index if not exists review_requests_tenant_idx on review_requests (tenant_id, sent_at desc);

alter table review_requests enable row level security;

drop policy if exists "tenant_own_review_requests_select" on review_requests;
create policy "tenant_own_review_requests_select" on review_requests
  for select using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
