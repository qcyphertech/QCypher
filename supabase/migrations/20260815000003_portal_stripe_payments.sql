-- Adds Stripe as a second payment option in the customer portal (previously
-- Helcim-only). Mirrors the existing orders.helcim_transaction_id column.

alter table orders add column if not exists stripe_checkout_session_id text;
alter table orders add column if not exists stripe_payment_intent_id text;
