'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'

export type TenantReferral = {
  id: string
  referrer_tenant_id: string
  referred_tenant_id: string
  status: 'completed' | 'claimed' | 'fulfilled'
  credit_type: 'discount' | 'balance' | null
  credit_amount: number
  claimed_at: string | null
  fulfilled_at: string | null
  created_at: string
  referred_tenant_name?: string
  referrer_tenant_name?: string
}

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const adm = createAdminClient()
  const { data: { user: fresh } } = await adm.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage referrals')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin: adm }
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { user, admin }
}

// ─── Tenant-side: view own referrals + claim ──────────────────────────────

export async function getMyTenantReferrals(): Promise<TenantReferral[]> {
  const { tenantId, admin } = await requireOwnerCaller()
  if (!tenantId) return []

  const { data } = await admin
    .from('tenant_referrals')
    .select('*, referred:tenants!tenant_referrals_referred_tenant_id_fkey(name)')
    .eq('referrer_tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return ((data ?? []) as any[]).map(r => ({
    ...r,
    referred_tenant_name: r.referred?.name ?? null,
  })) as TenantReferral[]
}

export async function claimTenantReferral(
  referralId: string, creditType: 'discount' | 'balance',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin } = await requireOwnerCaller()

  const { data: referral } = await admin.from('tenant_referrals').select('id, referrer_tenant_id, status').eq('id', referralId).maybeSingle()
  if (!referral || referral.referrer_tenant_id !== tenantId) return { ok: false, error: 'Referral not found' }
  if (referral.status !== 'completed') return { ok: false, error: 'This referral has already been claimed' }

  const { error } = await admin
    .from('tenant_referrals')
    .update({ status: 'claimed', credit_type: creditType, claimed_at: new Date().toISOString() })
    .eq('id', referralId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

// ─── Admin console: worklist across all tenants ───────────────────────────

export async function listAllTenantReferrals(): Promise<TenantReferral[]> {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('tenant_referrals')
    .select(`
      *,
      referrer:tenants!tenant_referrals_referrer_tenant_id_fkey(name),
      referred:tenants!tenant_referrals_referred_tenant_id_fkey(name)
    `)
    .order('created_at', { ascending: false })

  return ((data ?? []) as any[]).map(r => ({
    ...r,
    referrer_tenant_name: r.referrer?.name ?? null,
    referred_tenant_name: r.referred?.name ?? null,
  })) as TenantReferral[]
}

export async function markTenantReferralFulfilled(referralId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('tenant_referrals')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
    .eq('id', referralId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
