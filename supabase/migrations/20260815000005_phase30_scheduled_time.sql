-- Phase 30 follow-up: appointment time-of-day. Fixed per series by default
-- (set once on recurring_jobs, copied onto each occurrence's order at
-- creation), but the customer can change it per-occurrence when
-- rescheduling — there's no real availability/slot system in this app
-- (Cal.com/Google Calendar are both inbound-only, per the earlier Phase 30
-- scope decision), so this is a plain time picker, not conflict-checked
-- against the tenant's actual calendar.
alter table recurring_jobs add column if not exists scheduled_time time;
alter table orders add column if not exists scheduled_time time;
