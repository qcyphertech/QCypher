<p align="center">
  <img src="../apps/web/public/qcypher-logo-horizontal.png" alt="QCypher Technologies" width="220">
</p>

<h1 align="center">Package/Tier Feature Gating</h1>

<p align="center"><sub>QCypher Technologies &middot; Internal Documentation</sub></p>

<br>

Verified against code 2026-08-20. No pricing figures in this document —
see "Where pricing actually lives" below for why.

## The real tier field

`customer_pricing.base_price_tier` (`'starter' | 'growth' | 'all_in'`,
`apps/web/src/lib/pricing-constants.ts`) is the actual package a tenant
is on. It's set exclusively by a super admin via `setTenantPricing()`
(`apps/web/src/lib/actions/pricing.ts`), through the "Plan & Billing"
card on a tenant's admin detail page.

`tenants.plan` is a separate, older free-text field. It enforces
nothing anywhere in the app — it's display-only. Don't use it as a
signal for feature access; `base_price_tier` is the field that matters.

## How a tier controls what a tenant can use

There's no parallel "gating" system. Setting a tier just presses the
same buttons a super admin would press by hand on the two mechanisms
that already enforce access:

- **`platform_modules` / `tenant_module_access`** — per-tenant module
  toggles (`show_calendar`, `show_catalog`, `show_templates`,
  `show_orders`, `show_crm_bot`, `show_overview`), set via
  `setTenantModuleAccess()` (`apps/web/src/lib/actions/platform-modules.ts`).
- **`tenants.inventory_tier`** (`'lite' | 'full'`) — set via
  `setTenantInventoryTier()` (`apps/web/src/lib/actions/catalog.ts`).

`apps/web/src/lib/plan-defaults.ts` holds the tier → defaults mapping
as plain data:

| Module | Starter | Growth | All-In |
|---|---|---|---|
| Calendar | ✅ | ✅ | ✅ |
| Catalog | ✅ | ✅ | ✅ |
| Templates | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ |
| CRM Assistant (QBot) | — | ✅ | ✅ |
| Overview (analytics) | — | — | ✅ |
| Inventory tier | Lite | Lite | Full |

Contacts (customer management) has no toggle — it's core and always on.

`setTenantPricing()` calls `applyPlanDefaults()` once, at the moment a
super admin explicitly changes `base_price_tier`. It is **not** a
standing constraint: it doesn't re-run on a timer or re-assert itself.
A super admin (or the tenant's own Settings toggle, where self-serve)
can flip an individual module after the fact and it sticks — the next
thing that touches it is only another explicit tier change.

Live-verified 2026-08-20 on a test tenant: all three tiers produce
their expected module/inventory-tier defaults, and a manual override
made after setting a tier survives a reload without being reverted.

## Deliberately out of scope

- **Reviews and SMS** — left ungated for now (explicit product
  decision, not an oversight).
- **Website, Google Business Profile setup, "Sell Online" storefront,
  email/text automation rules, smart upsells, vulnerability scanning**
  — marketing-copy bullets with no corresponding in-app toggle today.
  Wiring these to a tier would mean building new enforcement
  infrastructure, which this pass didn't do.
- **No retroactive backfill.** Existing tenants keep whatever
  module/inventory-tier configuration they already have until a super
  admin explicitly changes their tier — this shipped without silently
  rewriting any tenant's current live configuration.

## Where pricing actually lives

Dollar amounts (`BASE_PRICING` in `pricing-constants.ts`, and any
override on `customer_pricing`) are **never rendered on any public
route**. The marketing homepage's packages section lists package
names and feature bullets only — no prices — and ends in a "Get a
Free Consultation" contact form, not a price quote. There is no
`/pricing` page in the app (the middleware's public-route allowlist
still lists `/pricing` as an unused leftover; nothing serves that
path, so it 404s).

Pricing is visible only to super admins, on a tenant's admin detail
page (`TenantPricingPanel.tsx`), gated the same way all other
`/admin/*` routes are. Don't add a public price display without
raising it as a deliberate decision first — the current design is
"talk to sales," not self-service pricing.
