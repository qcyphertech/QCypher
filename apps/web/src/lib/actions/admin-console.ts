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

// Final step, only available on an already-deleted account (via the button
// above or the 30-day grace-period cron): deletes the auth users tied to
// this tenant and the tenant row itself. deleteTenantAccount/the cron
// deliberately never touch auth.users — this is what actually frees the
// email up to sign up again, which the data purge alone doesn't do (an
// orphaned 'deleted' tenant with a live auth user still owns that email).
//
// approval_requests, impersonation_logs, and incidents are the only three
// tables that reference tenants(id) without ON DELETE CASCADE (checked
// against every migration — everything else either cascades or has no FK
// at all, e.g. audit_logs), so those three get purged explicitly first or
// the final tenant row delete fails on a leftover foreign key. (First pass
// at this list missed impersonation_logs — same file as approval_requests,
// a second `references tenants(id)` a few lines down for a different
// table, not a duplicate of the first.)
export async function permanentlyRemoveTenant(tenantId: string, confirmName: string): Promise<DeleteTenantResult> {
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
  if (t.status !== 'deleted') return { ok: false, error: 'Delete the account first — this only removes an already-deleted account' }
  if (confirmName.trim() !== t.name) return { ok: false, error: 'Typed name does not match the account name' }

  try {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const tenantUsers = users.filter(u => u.app_metadata?.tenant_id === tenantId)
    for (const u of tenantUsers) {
      await admin.auth.admin.deleteUser(u.id)
    }

    await admin.from('approval_requests').delete().eq('tenant_id', tenantId)
    await admin.from('impersonation_logs').delete().eq('tenant_id', tenantId)
    await admin.from('incidents').delete().eq('tenant_id', tenantId)

    const { error: deleteErr } = await admin.from('tenants').delete().eq('id', tenantId)
    if (deleteErr) return { ok: false, error: deleteErr.message }

    await admin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: caller.id,
      user_email: caller.email ?? '',
      action: 'account_deleted',
      resource_type: 'account',
      resource_id: tenantId,
      resource_name: t.name,
      details: { executed_by: caller.email ?? caller.id, permanent: true, users_removed: tenantUsers.length },
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Removal failed' }
  }

  return { ok: true }
}
