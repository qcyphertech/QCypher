-- The 5 new inventory_enable_* TenantSettings keys go through the same
-- settings-vs-platform_modules intersection every other show_* key does
-- (see (app)/layout.tsx: `value && availableModules.has(key)`), so without
-- a matching platform_modules row each one gets silently force-disabled
-- regardless of what the tenant actually set.
insert into platform_modules (key, label, description, icon_key, color, sort_order) values
  ('inventory_enable_images',           'Inventory: Images',           'Attach a photo to catalog items',            'Package', '#f59e0b', 20),
  ('inventory_enable_uom',              'Inventory: Unit of measure',  'Track units like each, box, or case',        'Package', '#f59e0b', 21),
  ('inventory_enable_reorder_points',   'Inventory: Reorder points',   'Flag items that need restocking',            'Package', '#f59e0b', 22),
  ('inventory_enable_expiry_dates',     'Inventory: Expiry dates',     'Track expiration on perishable items',       'Package', '#f59e0b', 23),
  ('inventory_enable_rental_condition', 'Inventory: Rental tracking',  'Track rentals and condition on return',      'Package', '#f59e0b', 24)
on conflict (key) do nothing;
