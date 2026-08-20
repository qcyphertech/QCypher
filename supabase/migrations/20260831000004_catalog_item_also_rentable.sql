-- Lets a 'good' catalog item also be rented out, instead of item_type's
-- three values (good/service/rental) being mutually exclusive. Additive
-- flag rather than converting item_type to an array/join table — every
-- existing call site that keys off item_type = 'rental' (order line-item
-- rental fields, inventory rental tracking) keeps working unchanged for
-- rental-only items; is_rentable just adds a second path into that same
-- rental behavior for goods.

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS is_rentable BOOLEAN NOT NULL DEFAULT false;
