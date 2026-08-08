-- Phase 25: self-service data export + 30-day-grace-period account deletion.
alter table tenants add column if not exists deletion_requested_at timestamptz;
alter table tenants add column if not exists deletion_scheduled_at timestamptz;
alter table tenants add column if not exists deletion_reason text;

alter table tenants drop constraint if exists tenants_status_check;
alter table tenants add constraint tenants_status_check
  check (status in ('active', 'suspended', 'trial', 'pending_deletion', 'deleted'));
