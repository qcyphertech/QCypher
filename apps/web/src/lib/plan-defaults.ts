import type { PriceTier } from '@/lib/pricing-constants'
import type { InventoryTier } from '@/lib/actions/catalog'

// Package -> feature mapping, derived from the actual marketing copy.
// Only covers modules that already have a real toggle mechanism
// (platform_modules/tenant_module_access, tenants.inventory_tier) — bullets
// with no corresponding code feature today (Custom Website, Google
// Integration, "Sell Online" storefront, Email & Text Automation rules,
// Smart Upsells, Vulnerability Scanning) and Reviews/SMS (deliberately left
// ungated) are out of scope. Plain data so the table is easy to eyeball
// and update if the packages change.
const MODULE_DEFAULTS: Record<PriceTier, Record<string, boolean>> = {
  starter: {
    show_calendar: true,
    show_catalog: true,
    show_templates: true,
    show_orders: true,
    show_crm_bot: false,
    show_overview: false,
  },
  growth: {
    show_calendar: true,
    show_catalog: true,
    show_templates: true,
    show_orders: true,
    show_crm_bot: true,
    show_overview: false,
  },
  all_in: {
    show_calendar: true,
    show_catalog: true,
    show_templates: true,
    show_orders: true,
    show_crm_bot: true,
    show_overview: true,
  },
}

const INVENTORY_TIER_DEFAULTS: Record<PriceTier, InventoryTier> = {
  starter: 'lite',
  growth: 'lite',
  all_in: 'full',
}

export function planModuleDefaults(tier: PriceTier): Record<string, boolean> {
  return MODULE_DEFAULTS[tier]
}

export function planInventoryTier(tier: PriceTier): InventoryTier {
  return INVENTORY_TIER_DEFAULTS[tier]
}
