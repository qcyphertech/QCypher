-- Adds a decline/"request changes" path to the existing Phase 16/17 quote
-- approval flow, which previously only supported approving (e-signature).
-- Mirrors the signed_at column already on orders.

alter table orders add column if not exists change_requested_at timestamptz;
alter table orders add column if not exists change_request_message text;
