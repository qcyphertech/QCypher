export type TenantSettings = {
  show_calendar:  boolean
  show_templates: boolean
  show_catalog:   boolean
  show_orders:    boolean
  show_overview:  boolean
  show_crm_bot:   boolean
  // Phase 43 — off by default for every tenant (see the platform_modules
  // seed row); a super admin grants it per-tenant once a clinical
  // tenant actually needs it. Not meant to be self-serve toggleable, but
  // it goes through the same show_* intersection as everything else so a
  // tenant that IS granted it can still hide it from their own nav.
  show_clinical_templates: boolean
}

export const DEFAULT_SETTINGS: TenantSettings = {
  show_calendar:  true,
  show_templates: true,
  show_catalog:   true,
  show_orders:    true,
  show_overview:  true,
  show_crm_bot:   true,
  show_clinical_templates: true,
}
