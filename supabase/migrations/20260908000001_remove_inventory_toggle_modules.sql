-- The 5 individual Full-tier inventory feature toggles (images, unit of
-- measure, reorder points, expiry dates, rental tracking) are no longer
-- individually gated anywhere in the app — CatalogItemModal/CatalogList
-- now check `tier === 'full'` directly, so these are always on together
-- as soon as a tenant is on the Full inventory tier. The corresponding
-- TenantSettings.inventory_enable_* fields and the tenant-facing
-- Settings → Inventory (Full) toggle panel were already removed from the
-- app; this removes their platform_modules rows (and any per-tenant
-- override rows), which were the only remaining thing still rendering
-- them as separate toggles — in the super-admin per-tenant Modules panel.
delete from tenant_module_access where module_key in (
  'inventory_enable_images',
  'inventory_enable_uom',
  'inventory_enable_reorder_points',
  'inventory_enable_expiry_dates',
  'inventory_enable_rental_condition'
);

delete from platform_modules where key in (
  'inventory_enable_images',
  'inventory_enable_uom',
  'inventory_enable_reorder_points',
  'inventory_enable_expiry_dates',
  'inventory_enable_rental_condition'
);
