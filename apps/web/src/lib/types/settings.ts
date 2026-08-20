export type TenantSettings = {
  show_calendar:  boolean
  show_templates: boolean
  show_catalog:   boolean
  show_orders:    boolean
  show_overview:  boolean
  show_crm_bot:   boolean
  // Phase 42 — optional Inventory Full-tier features. Tenant-controlled
  // (unlike the tier itself, which is super-admin-only — see
  // tenants.inventory_tier / getInventoryTier()); only rendered when the
  // tenant is actually on the Full tier.
  inventory_enable_images:          boolean
  inventory_enable_uom:             boolean
  inventory_enable_reorder_points:  boolean
  inventory_enable_expiry_dates:    boolean
  inventory_enable_rental_condition: boolean
}

export const DEFAULT_SETTINGS: TenantSettings = {
  show_calendar:  true,
  show_templates: true,
  show_catalog:   true,
  show_orders:    true,
  show_overview:  true,
  show_crm_bot:   true,
  inventory_enable_images:           false,
  inventory_enable_uom:              true,
  inventory_enable_reorder_points:   false,
  inventory_enable_expiry_dates:     false,
  inventory_enable_rental_condition: false,
}
