export type TenantSettings = {
  show_pipeline:  boolean
  show_calendar:  boolean
  show_templates: boolean
  show_catalog:   boolean
  show_orders:    boolean
  show_overview:  boolean
  show_crm_bot:   boolean
}

export const DEFAULT_SETTINGS: TenantSettings = {
  show_pipeline:  true,
  show_calendar:  true,
  show_templates: true,
  show_catalog:   true,
  show_orders:    true,
  show_overview:  true,
  show_crm_bot:   true,
}
