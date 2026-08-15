'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type LoyaltySettings = {
  tenant_id: string
  bronze_min_amount: number
  bronze_discount_percent: number
  silver_min_amount: number
  silver_discount_percent: number
  gold_min_amount: number
  gold_discount_percent: number
  referral_credit_amount: number
  referral_requires_completion: boolean
  tier_program_enabled: boolean
  referral_program_enabled: boolean
}

export type CustomerLoyalty = {
  current_tier: 'bronze' | 'silver' | 'gold'
  lifetime_spend: number
  bonus_points: number
  credit_balance: number
  tier_promoted_at: string | null
}

const DEFAULT_SETTINGS: Omit<LoyaltySettings, 'tenant_id'> = {
  bronze_min_amount: 500, bronze_discount_percent: 5,
  silver_min_amount: 1500, silver_discount_percent: 10,
  gold_min_amount: 3000, gold_discount_percent: 15,
  referral_credit_amount: 25, referral_requires_completion: true,
  tier_program_enabled: true, referral_program_enabled: true,
}

function admin() {
  return createAdminClient()
}

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adm = createAdminClient()
  const { data: { user: fresh } } = await adm.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage loyalty settings')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin: adm }
}

function tierFor(lifetimeSpend: number, settings: Pick<LoyaltySettings, 'gold_min_amount' | 'silver_min_amount'>): 'bronze' | 'silver' | 'gold' {
  if (lifetimeSpend >= settings.gold_min_amount) return 'gold'
  if (lifetimeSpend >= settings.silver_min_amount) return 'silver'
  return 'bronze'
}

function discountFor(tier: 'bronze' | 'silver' | 'gold', settings: LoyaltySettings): number {
  if (tier === 'gold') return settings.gold_discount_percent
  if (tier === 'silver') return settings.silver_discount_percent
  return settings.bronze_discount_percent
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function getLoyaltySettings(tenantId: string): Promise<LoyaltySettings> {
  const db = admin()
  const { data } = await db.from('loyalty_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
  if (data) return data as LoyaltySettings
  return { tenant_id: tenantId, ...DEFAULT_SETTINGS }
}

export async function updateLoyaltySettings(input: Omit<LoyaltySettings, 'tenant_id'>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()

  const { error } = await adm.from('loyalty_settings').upsert({
    tenant_id: tenantId,
    ...input,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id' })

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

// ─── Customer-facing loyalty state ────────────────────────────────────────

export async function getCustomerLoyalty(tenantId: string, contactId: string): Promise<CustomerLoyalty> {
  const db = admin()
  const { data } = await db
    .from('customer_loyalty')
    .select('current_tier, lifetime_spend, bonus_points, credit_balance, tier_promoted_at')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .maybeSingle()
  if (data) return data as CustomerLoyalty
  return { current_tier: 'bronze', lifetime_spend: 0, bonus_points: 0, credit_balance: 0, tier_promoted_at: null }
}

export async function getLoyaltyCheckoutInfo(tenantId: string, contactId: string, orderAmount: number): Promise<{
  enabled: boolean
  tier: 'bronze' | 'silver' | 'gold'
  discountPercent: number
  creditBalance: number
  discountedAmount: number
}> {
  const settings = await getLoyaltySettings(tenantId)
  const loyalty = await getCustomerLoyalty(tenantId, contactId)

  if (!settings.tier_program_enabled) {
    return { enabled: false, tier: loyalty.current_tier, discountPercent: 0, creditBalance: loyalty.credit_balance, discountedAmount: orderAmount }
  }

  const discountPercent = discountFor(loyalty.current_tier, settings)
  const afterDiscount = orderAmount * (1 - discountPercent / 100)
  const afterCredit = Math.max(0, afterDiscount - loyalty.credit_balance)

  return {
    enabled: true,
    tier: loyalty.current_tier,
    discountPercent,
    creditBalance: loyalty.credit_balance,
    discountedAmount: Math.round(afterCredit * 100) / 100,
  }
}

export async function redeemLoyaltyAtCheckout(
  tenantId: string, contactId: string, orderAmount: number, applyBenefits: boolean,
): Promise<{ finalAmountCents: number; creditToUse: number; discountPercent: number }> {
  if (!applyBenefits) return { finalAmountCents: Math.round(orderAmount * 100), creditToUse: 0, discountPercent: 0 }

  const info = await getLoyaltyCheckoutInfo(tenantId, contactId, orderAmount)
  if (!info.enabled) return { finalAmountCents: Math.round(orderAmount * 100), creditToUse: 0, discountPercent: 0 }

  const afterDiscount = orderAmount * (1 - info.discountPercent / 100)
  const creditToUse = Math.min(info.creditBalance, afterDiscount)

  return {
    finalAmountCents: Math.round(info.discountedAmount * 100),
    creditToUse,
    discountPercent: info.discountPercent,
  }
}

// ─── Award loyalty on a paid order (internal — called from payment-completion code, not a client action) ──

export async function awardLoyaltyForPaidOrder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
  input: { tenantId: string; contactId: string; orderId: string; amount: number; isRecurringOccurrence: boolean; creditRedeemed?: number },
): Promise<void> {
  const settings = await getLoyaltySettings(input.tenantId)
  if (!settings.tier_program_enabled) return

  const { data: existing } = await db
    .from('customer_loyalty')
    .select('id, lifetime_spend, bonus_points, credit_balance, current_tier')
    .eq('tenant_id', input.tenantId)
    .eq('contact_id', input.contactId)
    .maybeSingle()

  const priorLifetimeSpend = Number(existing?.lifetime_spend ?? 0)
  const newLifetimeSpend = priorLifetimeSpend + input.amount
  const newBonusPoints = Number(existing?.bonus_points ?? 0) + (input.isRecurringOccurrence ? 10 : 0)
  const newTier = tierFor(newLifetimeSpend, settings)
  const tierChanged = existing ? existing.current_tier !== newTier : newTier !== 'bronze'
  const creditAfterRedemption = Math.max(0, Number(existing?.credit_balance ?? 0) - (input.creditRedeemed ?? 0))

  const patch = {
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    lifetime_spend: newLifetimeSpend,
    bonus_points: newBonusPoints,
    current_tier: newTier,
    credit_balance: creditAfterRedemption,
    updated_at: new Date().toISOString(),
    ...(tierChanged ? { tier_promoted_at: new Date().toISOString() } : {}),
  }

  if (existing) {
    await db.from('customer_loyalty').update(patch).eq('id', existing.id)
  } else {
    await db.from('customer_loyalty').insert(patch)
  }

  await db.from('loyalty_transactions').insert({
    tenant_id: input.tenantId, contact_id: input.contactId, type: 'spend',
    amount: input.amount, points: Math.round(input.amount), order_id: input.orderId,
  })
  if (input.isRecurringOccurrence) {
    await db.from('loyalty_transactions').insert({
      tenant_id: input.tenantId, contact_id: input.contactId, type: 'recurring_bonus',
      points: 10, order_id: input.orderId,
    })
  }
  if (input.creditRedeemed && input.creditRedeemed > 0) {
    await db.from('loyalty_transactions').insert({
      tenant_id: input.tenantId, contact_id: input.contactId, type: 'redemption',
      amount: -input.creditRedeemed, order_id: input.orderId,
    })
  }

  // First-referral credit: if this contact was referred by someone, and this
  // is their first paid order, credit the referrer.
  if (!settings.referral_program_enabled) return

  const { data: contact } = await db.from('contacts').select('referred_by_contact_id').eq('id', input.contactId).maybeSingle()
  if (!contact?.referred_by_contact_id) return

  const { count: priorPaidOrders } = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', input.contactId)
    .eq('payment_status', 'paid')
  // This order was already marked paid before this function runs, so a
  // count of exactly 1 means it's the only (i.e. first) one.
  if ((priorPaidOrders ?? 0) !== 1) return

  const referrerId = contact.referred_by_contact_id
  const { data: referrerLoyalty } = await db
    .from('customer_loyalty')
    .select('id, credit_balance')
    .eq('tenant_id', input.tenantId)
    .eq('contact_id', referrerId)
    .maybeSingle()

  const newReferrerBalance = Number(referrerLoyalty?.credit_balance ?? 0) + settings.referral_credit_amount
  if (referrerLoyalty) {
    await db.from('customer_loyalty').update({ credit_balance: newReferrerBalance, updated_at: new Date().toISOString() }).eq('id', referrerLoyalty.id)
  } else {
    await db.from('customer_loyalty').insert({ tenant_id: input.tenantId, contact_id: referrerId, credit_balance: newReferrerBalance })
  }

  await db.from('loyalty_transactions').insert({
    tenant_id: input.tenantId, contact_id: referrerId, type: 'referral_earned',
    amount: settings.referral_credit_amount, referred_contact_id: input.contactId, order_id: input.orderId,
  })

  await db.from('audit_logs').insert({
    tenant_id: input.tenantId, user_id: null, user_email: 'system',
    action: 'loyalty_referral_credited', resource_type: 'contact', resource_id: referrerId,
    details: { referred_contact_id: input.contactId, amount: settings.referral_credit_amount },
  })
}
