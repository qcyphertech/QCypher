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
  // Owner-set email addresses for outgoing mail — all optional, empty
  // string means unset. Sending itself still goes out through QCypher's
  // verified mail domain (Resend requires a verified domain to send
  // "From", so a tenant can't send from an arbitrary unverified address
  // without their own domain being verified there) — reply_to_email is
  // the practical equivalent: a customer's "Reply" lands in the
  // tenant's own inbox instead of QCypher's.
  reply_to_email: string
  // BCC destination when "BCC me on this email" is checked. Falls back
  // to the owner's own login email when unset.
  bcc_email: string
  // Destination for "send a test to myself". Falls back to bcc_email,
  // then the owner's own login email, when unset — but can be pointed
  // at a different inbox than BCC (e.g. a shared test mailbox).
  test_email: string
}

export const DEFAULT_SETTINGS: TenantSettings = {
  show_calendar:  true,
  show_templates: true,
  show_catalog:   true,
  show_orders:    true,
  show_overview:  true,
  show_crm_bot:   true,
  show_clinical_templates: true,
  reply_to_email: '',
  bcc_email: '',
  test_email: '',
}
