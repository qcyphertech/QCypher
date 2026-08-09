// Standard tier pricing shared between the pricing server actions and the
// client-side pricing panel. Deliberately NOT inside lib/actions/pricing.ts
// (a 'use server' file) — a 'use server' module may only export async
// functions; a plain object export from one gets silently replaced with
// `undefined` in the client bundle (Next.js swaps server-action-file
// exports for RPC stubs), which crashed the tenant detail page's SSR pass.

export type PriceTier = 'starter' | 'growth' | 'all_in'
export type PricingReason = 'negotiated_discount' | 'volume_deal' | 'retention' | 'non_profit'

export const BASE_PRICING: Record<PriceTier, { oneTime: number; monthly: number }> = {
  starter: { oneTime: 750, monthly: 49 },
  growth: { oneTime: 1250, monthly: 99 },
  all_in: { oneTime: 2000, monthly: 199 },
}
