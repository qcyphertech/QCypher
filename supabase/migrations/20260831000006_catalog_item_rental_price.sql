-- Rentable goods need their own rate, separate from the sale/base price —
-- e.g. a chair might sell for $42 flat but rent for $8/day. Reuses the
-- existing billing_unit enum (flat/hourly/daily/weekly/monthly) rather than
-- a new type; 'flat' is a legal value here too for a one-off rental fee.

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS rental_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rental_billing_unit billing_unit NOT NULL DEFAULT 'daily';
