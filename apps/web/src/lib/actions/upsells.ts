'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { addLineItem } from '@/lib/actions/orders'
import { getLoyaltyCheckoutInfo } from '@/lib/actions/loyalty'
import { logAudit } from '@/lib/actions/audit'
import { revalidatePath } from 'next/cache'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export type UpsellRule = {
  id: string
  tenant_id: string
  rule_name: string
  description: string | null
  trigger_catalog_item_id: string | null
  trigger_keywords: string[] | null
  suggested_catalog_item_id: string
  bundle_discount_percent: number
  bundle_description: string | null
  bundle_emoji_icon: string | null
  show_every_x_bookings: number
  is_active: boolean
  created_at: string
}

export type UpsellSuggestion = {
  analyticsId: string
  rule: UpsellRule
  suggestedItemName: string
  basePrice: number
  bundlePrice: number
  savings: number
}

async function requireOwnerCaller() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adm = createAdminClient()
  const { data: { user: fresh } } = await adm.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage upsell rules')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin: adm }
}

// ─── Rule management ───────────────────────────────────────────────────────

export async function getUpsellRules(tenantId: string): Promise<UpsellRule[]> {
  const db = admin()
  const { data } = await db.from('tenant_upsell_rules').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
  return (data ?? []) as UpsellRule[]
}

export async function createUpsellRule(input: Omit<UpsellRule, 'id' | 'tenant_id' | 'created_at'>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()
  const { error } = await adm.from('tenant_upsell_rules').insert({ ...input, tenant_id: tenantId })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

export async function updateUpsellRule(id: string, input: Partial<Omit<UpsellRule, 'id' | 'tenant_id' | 'created_at'>>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin: adm } = await requireOwnerCaller()
  const { error } = await adm.from('tenant_upsell_rules').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

export async function toggleUpsellRule(id: string, isActive: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateUpsellRule(id, { is_active: isActive })
}

// ─── Suggestion matching ───────────────────────────────────────────────────

export async function getUpsellSuggestion(tenantId: string, orderId: string, contactId: string): Promise<UpsellSuggestion | null> {
  const db = admin()

  const [{ data: rules }, { data: lines }] = await Promise.all([
    db.from('tenant_upsell_rules').select('*').eq('tenant_id', tenantId).eq('is_active', true),
    db.from('order_line_items').select('catalog_item_id, item_name_snapshot, description_snapshot').eq('order_id', orderId),
  ])
  if (!rules?.length || !lines?.length) return null

  const existingCatalogIds = new Set(lines.map(l => l.catalog_item_id).filter(Boolean))
  const lineText = lines.map(l => `${l.item_name_snapshot} ${l.description_snapshot ?? ''}`.toLowerCase()).join(' ')
  const suggestedIdsOnOrder = new Set(lines.map(l => l.catalog_item_id).filter(Boolean))

  for (const rule of rules as UpsellRule[]) {
    if (suggestedIdsOnOrder.has(rule.suggested_catalog_item_id)) continue // already on the order

    const triggerMatches =
      (rule.trigger_catalog_item_id && existingCatalogIds.has(rule.trigger_catalog_item_id)) ||
      (rule.trigger_keywords?.length && rule.trigger_keywords.some(kw => lineText.includes(kw.toLowerCase())))
    if (!triggerMatches) continue

    if (rule.show_every_x_bookings > 1) {
      const { count } = await db
        .from('upsell_analytics')
        .select('id', { count: 'exact', head: true })
        .eq('upsell_rule_id', rule.id)
        .eq('contact_id', contactId)
      if ((count ?? 0) % rule.show_every_x_bookings !== 0) continue
    }

    const { data: item } = await db.from('catalog_items').select('name, base_price').eq('id', rule.suggested_catalog_item_id).maybeSingle()
    if (!item) continue

    let discountPercent = Number(rule.bundle_discount_percent)
    const loyalty = await getLoyaltyCheckoutInfo(tenantId, contactId, Number(item.base_price)).catch(() => null)
    if (loyalty?.tier === 'gold') discountPercent += 2

    const basePrice = Number(item.base_price)
    const bundlePrice = Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100

    const { data: impression } = await db.from('upsell_analytics').insert({
      tenant_id: tenantId,
      upsell_rule_id: rule.id,
      contact_id: contactId,
      order_id: orderId,
      shown_in: 'order_edit',
      base_service_amount: basePrice,
      upsell_amount: bundlePrice,
    }).select('id').single()

    return {
      analyticsId: impression!.id,
      rule,
      suggestedItemName: item.name,
      basePrice,
      bundlePrice,
      savings: Math.round((basePrice - bundlePrice) * 100) / 100,
    }
  }

  return null
}

// ─── Acceptance ─────────────────────────────────────────────────────────────

export async function acceptUpsellSuggestion(analyticsId: string, tenantId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const db = admin()
  const { data: impression } = await db.from('upsell_analytics').select('*').eq('id', analyticsId).eq('tenant_id', tenantId).maybeSingle()
  if (!impression) return { ok: false, error: 'Suggestion not found' }

  const { data: rule } = await db.from('tenant_upsell_rules').select('*').eq('id', impression.upsell_rule_id).maybeSingle()
  if (!rule) return { ok: false, error: 'Rule not found' }

  const { data: item } = await db.from('catalog_items').select('name, description, base_price, billing_unit').eq('id', rule.suggested_catalog_item_id).maybeSingle()
  if (!item) return { ok: false, error: 'Suggested item not found' }

  try {
    await addLineItem({
      order_id: impression.order_id!,
      catalog_item_id: rule.suggested_catalog_item_id,
      item_name_snapshot: item.name,
      description_snapshot: rule.bundle_description ?? item.description ?? undefined,
      quantity: 1,
      unit_price: Number(impression.upsell_amount),
      billing_unit_snapshot: item.billing_unit,
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not add item' }
  }

  const discountGiven = Number(impression.base_service_amount) - Number(impression.upsell_amount)
  await db.from('upsell_analytics').update({
    accepted: true,
    accepted_at: new Date().toISOString(),
    discount_given: discountGiven,
    revenue_lift: Number(impression.upsell_amount),
  }).eq('id', analyticsId)

  await logAudit({
    action: 'upsell_accepted',
    resource_type: 'order',
    resource_id: impression.order_id ?? undefined,
    resource_name: item.name,
    details: { rule_id: rule.id, bundle_price: impression.upsell_amount },
  })

  revalidatePath(`/orders/${impression.order_id}`)
  return { ok: true }
}

export async function addPortalUpsellLineItem(input: {
  tenantId: string
  contactId: string
  orderId: string
  analyticsId: string
}): Promise<{ ok: true; newTotal: number } | { ok: false; error: string }> {
  const db = admin()

  const { data: order } = await db
    .from('orders')
    .select('id, signed_at, payment_status, total_amount')
    .eq('id', input.orderId)
    .eq('tenant_id', input.tenantId)
    .eq('customer_id', input.contactId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }
  if (order.signed_at) return { ok: false, error: 'This quote is locked' }
  if (order.payment_status === 'paid') return { ok: false, error: 'This invoice has already been paid' }

  const { data: impression } = await db.from('upsell_analytics').select('*').eq('id', input.analyticsId).eq('tenant_id', input.tenantId).maybeSingle()
  if (!impression) return { ok: false, error: 'Suggestion not found' }

  const { data: rule } = await db.from('tenant_upsell_rules').select('*').eq('id', impression.upsell_rule_id).maybeSingle()
  if (!rule) return { ok: false, error: 'Rule not found' }

  const { data: item } = await db.from('catalog_items').select('name, description, billing_unit').eq('id', rule.suggested_catalog_item_id).maybeSingle()
  if (!item) return { ok: false, error: 'Suggested item not found' }

  const { error: insertErr } = await db.from('order_line_items').insert({
    tenant_id: input.tenantId,
    order_id: input.orderId,
    catalog_item_id: rule.suggested_catalog_item_id,
    item_name_snapshot: item.name,
    description_snapshot: rule.bundle_description ?? item.description ?? undefined,
    quantity: 1,
    unit_price: Number(impression.upsell_amount),
    billing_unit_snapshot: item.billing_unit,
  })
  if (insertErr) return { ok: false, error: insertErr.message }

  const discountGiven = Number(impression.base_service_amount) - Number(impression.upsell_amount)
  await db.from('upsell_analytics').update({
    accepted: true,
    accepted_at: new Date().toISOString(),
    discount_given: discountGiven,
    revenue_lift: Number(impression.upsell_amount),
  }).eq('id', input.analyticsId)

  await db.from('audit_logs').insert({
    tenant_id: input.tenantId, user_id: null, user_email: 'system',
    action: 'upsell_accepted', resource_type: 'order', resource_id: input.orderId, resource_name: item.name,
    details: { rule_id: rule.id, bundle_price: impression.upsell_amount, source: 'portal_checkout' },
  })

  const { data: updated } = await db.from('orders').select('total_amount').eq('id', input.orderId).maybeSingle()
  return { ok: true, newTotal: Number(updated?.total_amount ?? order.total_amount) }
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getUpsellAnalyticsSummary(tenantId: string, days = 30): Promise<{
  shown: number
  accepted: number
  acceptanceRate: number
  revenueLift: number
  topRuleName: string | null
}> {
  const db = admin()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await db.from('upsell_analytics').select('accepted, revenue_lift, upsell_rule_id').eq('tenant_id', tenantId).gte('created_at', since)
  const rows = data ?? []
  const shown = rows.length
  const accepted = rows.filter(r => r.accepted).length
  const revenueLift = rows.reduce((sum, r) => sum + (r.accepted ? Number(r.revenue_lift ?? 0) : 0), 0)

  const byRule = new Map<string, number>()
  for (const r of rows) if (r.accepted) byRule.set(r.upsell_rule_id, (byRule.get(r.upsell_rule_id) ?? 0) + 1)
  let topRuleId: string | null = null
  let topCount = 0
  for (const [id, count] of byRule) if (count > topCount) { topRuleId = id; topCount = count }

  let topRuleName: string | null = null
  if (topRuleId) {
    const { data: rule } = await db.from('tenant_upsell_rules').select('rule_name').eq('id', topRuleId).maybeSingle()
    topRuleName = rule?.rule_name ?? null
  }

  return { shown, accepted, acceptanceRate: shown ? Math.round((accepted / shown) * 100) : 0, revenueLift, topRuleName }
}

export async function getUpsellAnalyticsByRule(tenantId: string): Promise<{
  ruleId: string
  ruleName: string
  shown: number
  accepted: number
  acceptanceRate: number
  revenueLift: number
  lastShown: string | null
}[]> {
  const db = admin()
  const [{ data: rules }, { data: rows }] = await Promise.all([
    db.from('tenant_upsell_rules').select('id, rule_name').eq('tenant_id', tenantId),
    db.from('upsell_analytics').select('upsell_rule_id, accepted, revenue_lift, created_at').eq('tenant_id', tenantId),
  ])

  return (rules ?? []).map(rule => {
    const ruleRows = (rows ?? []).filter(r => r.upsell_rule_id === rule.id)
    const shown = ruleRows.length
    const accepted = ruleRows.filter(r => r.accepted).length
    const revenueLift = ruleRows.reduce((sum, r) => sum + (r.accepted ? Number(r.revenue_lift ?? 0) : 0), 0)
    const lastShown = ruleRows.length ? ruleRows.map(r => r.created_at).sort().at(-1)! : null
    return { ruleId: rule.id, ruleName: rule.rule_name, shown, accepted, acceptanceRate: shown ? Math.round((accepted / shown) * 100) : 0, revenueLift, lastShown }
  })
}
