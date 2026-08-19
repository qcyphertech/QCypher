'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { purgeTenantData } from '@/lib/tenant-purge'

export type TenantSummary = {
  id: string
  name: string
  slug: string
  plan: string | null
  created_at: string
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Re-fetch fresh app_metadata — same staleness reasoning as role checks
  // elsewhere (lib/actions/team.ts): a flag change shouldn't require the
  // caller to log out and back in before it takes effect.
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return user
}

export async function listTenants(): Promise<TenantSummary[]> {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { data } = await admin
    .from('tenants')
    .select('id, name, slug, plan, created_at')
    .order('created_at', { ascending: false })
  return (data ?? []) as TenantSummary[]
}

export type DeleteTenantResult = { ok: true } | { ok: false; error: string }

// Immediate hard delete, bypassing the self-service 30-day grace period —
// that flow (lib/actions/account-deletion.ts) is for a tenant owner
// deleting their own account; this is the platform-side equivalent for
// things like a fraudulent signup or a legal/GDPR takedown request that
// can't wait a month. Reuses the exact same purge logic as the grace-period
// cron so both paths leave the data in an identical end state.
export async function deleteTenantAccount(tenantId: string, confirmName: string): Promise<DeleteTenantResult> {
  let caller: Awaited<ReturnType<typeof requireSuperAdmin>>
  try {
    caller = await requireSuperAdmin()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const admin = createAdminClient()
  const { data: tenant } = await admin.from('tenants').select('name, status').eq('id', tenantId).single()
  const t = tenant as { name?: string; status?: string } | null
  if (!t) return { ok: false, error: 'Tenant not found' }
  if (t.status === 'deleted') return { ok: false, error: 'This account is already deleted' }
  if (confirmName.trim() !== t.name) return { ok: false, error: 'Typed name does not match the account name' }

  try {
    await purgeTenantData(admin, tenantId, t.name ?? 'Unknown', caller.email ?? caller.id)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' }
  }

  return { ok: true }
}
