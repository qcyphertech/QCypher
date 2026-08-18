-- Recurring expenses: a template table mirroring recurring_jobs'
-- occurrence-generation pattern — the recurrence *pattern* lives here,
-- each actual occurrence becomes a real `expenses` row (tagged with
-- recurring_expense_id) so it inherits the existing expenses list/totals
-- for free. RLS mirrors expenses itself (get_tenant_id(), no owner-only
-- restriction — any tenant member who can log an expense can make it
-- recurring).

create table if not exists recurring_expenses (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  category            text not null,
  amount              numeric(10,2) not null,
  note                text,
  frequency           text not null
    check (frequency in ('weekly','biweekly','monthly','quarterly','annually','custom')),
  interval_days       integer,  -- used when frequency = 'custom'
  day_of_month        integer check (day_of_month between 1 and 31), -- monthly/quarterly/annually
  next_occurrence_date date not null,
  status              text not null default 'active' check (status in ('active','paused')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists recurring_expenses_next_date_idx on recurring_expenses (next_occurrence_date, status);

alter table recurring_expenses enable row level security;

drop policy if exists "recurring_expenses: tenant select" on recurring_expenses;
create policy "recurring_expenses: tenant select"
  on recurring_expenses for select
  using ((tenant_id)::text = get_tenant_id());

drop policy if exists "recurring_expenses: tenant insert" on recurring_expenses;
create policy "recurring_expenses: tenant insert"
  on recurring_expenses for insert
  with check ((tenant_id)::text = get_tenant_id());

drop policy if exists "recurring_expenses: tenant update" on recurring_expenses;
create policy "recurring_expenses: tenant update"
  on recurring_expenses for update
  using ((tenant_id)::text = get_tenant_id());

-- Marks which expense rows were auto-generated from (or are the seed
-- occurrence of) a recurring template, so the UI can show a "Recurring"
-- indicator without a separate lookup.
alter table expenses add column if not exists recurring_expense_id uuid references recurring_expenses(id) on delete set null;
create index if not exists expenses_recurring_expense_idx on expenses (recurring_expense_id);
