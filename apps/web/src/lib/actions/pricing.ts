'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'
import { revalidatePath } from 'next/cache'
import type { Json } from '@qcypher/db'
import { BASE_PRICING, type PriceTier, type PricingReason } from '@/lib/pricing-constants'
import { planModuleDefaults, planInventoryTier } from '@/lib/plan-defaults'
import { setTenantModuleAccess } from '@/lib/actions/platform-modules'
import { setTenantInventoryTier } from '@/lib/actions/catalog'

export type { PriceTier, PricingReason }

export type CustomerPricing = {
  id: string
  tenant_id: string
  base_price_tier: PriceTier
  override_monthly_amount: number | null
  override_one_time_amount: number | null
  effective_from: string
  effective_to: string | null
  reason: PricingReason | null
  notes: string | null
  next_billing_date: string | null
  updated_at: string
}

async function requireSuperAdminCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { userId: user.id, admin }
}

async function logPricingAudit(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  userId: string,
  action: 'pricing_override_set' | 'pricing_override_cleared',
  details: Record<string, unknown>,
) {
  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    user_email: user?.email ?? '',
    action,
    resource_type: 'pricing',
    resource_id: tenantId,
    details: details as Json,
  })
}

export async function getTenantPricing(tenantId: string): Promise<CustomerPricing | null> {
  await requireSuperAdminCaller()
  const admin = createAdminClient()
  const { data } = await admin.from('customer_pricing').select('*').eq('tenant_id', tenantId).maybeSingle()
  return data as CustomerPricing | null
}

// Applies this tier's default module access + inventory tier — reuses the
// same functions the Modules/Inventory-tier admin panels call directly, so
// this is just "press those same buttons on the tenant's behalf," not a
// parallel enforcement path. Runs once, at the moment a super admin sets
// the tier; doesn't re-run or re-assert itself afterward, so a manual
// override made afterward (e.g. flipping one module back off) sticks.
async function applyPlanDefaults(tenantId: string, tier: PriceTier) {
  const moduleDefaults = planModuleDefaults(tier)
  for (const [key, enabled] of Object.entries(moduleDefaults)) {
    await setTenantModuleAccess(tenantId, key, enabled)
  }
  await setTenantInventoryTier(tenantId, planInventoryTier(tier))
}

export async function setTenantPricing(tenantId: string, input: {
  base_price_tier: PriceTier
  override_monthly_amount: number | null
  override_one_time_amount: number | null
  reason: PricingReason | null
  notes: string | null
  next_billing_date?: string | null
  effective_from?: string
  effective_to?: string | null
}) {
  const { userId, admin } = await requireSuperAdminCaller()

  const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
  const tenantName = (tenant as { name?: string } | null)?.name ?? 'this account'

  const { error } = await admin
    .from('customer_pricing')
    .upsert({
      tenant_id: tenantId,
      base_price_tier: input.base_price_tier,
      override_monthly_amount: input.override_monthly_amount,
      override_one_time_amount: input.override_one_time_amount,
      reason: input.reason,
      notes: input.notes,
      next_billing_date: input.next_billing_date ?? null,
      effective_from: input.effective_from ?? new Date().toISOString(),
      effective_to: input.effective_to ?? null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })
  if (error) throw new Error(error.message)

  await applyPlanDefaults(tenantId, input.base_price_tier)

  const effectiveMonthly = input.override_monthly_amount ?? BASE_PRICING[input.base_price_tier].monthly

  await logPricingAudit(admin, tenantId, userId, 'pricing_override_set', {
    base_price_tier: input.base_price_tier,
    override_monthly_amount: input.override_monthly_amount,
    override_one_time_amount: input.override_one_time_amount,
    reason: input.reason,
  })

  // Notify the tenant's owner(s) — billing changes should never be silent.
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const owners = users.filter(u => u.app_metadata?.tenant_id === tenantId && u.app_metadata?.role === 'owner')
  for (const owner of owners) {
    if (!owner.email) continue
    await sendEmail({
      to: owner.email,
      subject: 'Your billing details have been updated',
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Billing update</p>
          <p style="margin:16px 0 0;">Your billing details for <strong>${tenantName}</strong> have been updated.</p>
          <p style="margin:16px 0 0;">New monthly amount: <strong>$${effectiveMonthly.toFixed(2)}/mo</strong></p>
          <p style="margin:16px 0 0;">Questions? Reply to this email or contact us at legal@qcyphertech.com.</p>
        `,
      }),
      text: `Your billing details for ${tenantName} have been updated. New monthly amount: $${effectiveMonthly.toFixed(2)}/mo.`,
    })
  }

  revalidatePath(`/admin/tenants/${tenantId}`)
}

export async function clearTenantPricing(tenantId: string) {
  const { userId, admin } = await requireSuperAdminCaller()
  const { error } = await admin.from('customer_pricing').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(error.message)

  await logPricingAudit(admin, tenantId, userId, 'pricing_override_cleared', {})
  revalidatePath(`/admin/tenants/${tenantId}`)
}
