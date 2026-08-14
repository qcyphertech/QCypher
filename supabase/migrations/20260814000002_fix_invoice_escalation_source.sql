-- Phase 27 fix: invoice escalation was built against `invoices` (QCypher's
-- own billing to tenants, super-admin only) instead of `payment_requests`
-- (a tenant's sent invoice/pay-link to their own customer — what the
-- feature was actually meant to track: "nudge tenant admins when a
-- customer's sent invoice goes unpaid"). Repoints the idempotency table
-- at the correct source. No rows exist yet (feature isn't live), so a
-- plain rename + constraint swap is safe.

alter table invoice_escalations drop constraint if exists invoice_escalations_invoice_id_fkey;
alter table invoice_escalations rename column invoice_id to payment_request_id;
alter table invoice_escalations
  add constraint invoice_escalations_payment_request_id_fkey
  foreign key (payment_request_id) references payment_requests(id) on delete cascade;
