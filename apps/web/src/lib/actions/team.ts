'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'

// 'owner' = Admin, 'member' = User, 'read_only' = Read-only (Phase 21 RBAC)
export type Role = 'owner' | 'member' | 'read_only'

export type TeamMember = {
  id: string
  email: string
  role: Role
  joined_at: string
  last_seen: string | null
}

export type PendingInvite = {
  id: string
  email: string
  role: Role
  expires_at: string
  created_at: string
}

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Re-fetch fresh app_metadata via Admin API — the caller's own JWT can be
  // stale (same staleness issue getTenantId works around), and role is a
  // security-sensitive check so we don't trust a cached token for it.
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as Role
  const isSuperAdmin = isSuperAdminUser(fresh)

  // A super admin may have no tenant of their own — that's fine, they
  // manage other tenants' teams explicitly by passing a tenantId.
  let tenant_id: string | null = null
  try { tenant_id = await getTenantId(user.id, user.app_metadata) } catch { /* tenantless super admin */ }

  return { userId: user.id, tenant_id, role, isSuperAdmin }
}

async function getCallerTenantId() {
  const tenant_id = (await getCaller()).tenant_id
  if (!tenant_id) throw new Error('No tenant configured for this account')
  return tenant_id
}

// Authorizes managing team members of `targetTenantId` — either the caller
// is a super admin (any tenant), or they're the owner of that exact tenant.
async function requireManage(targetTenantId: string) {
  const caller = await getCaller()
  if (caller.isSuperAdmin) return caller
  if (caller.tenant_id !== targetTenantId) throw new Error('Forbidden')
  if (caller.role !== 'owner') throw new Error('Only admins can manage team members')
  return caller
}

async function logTeamAudit(
  caller: { userId: string; tenant_id: string },
  action: 'role_changed' | 'user_removed',
  resource_id: string,
  details?: Record<string, unknown>,
) {
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.admin.getUserById(caller.userId)
  await admin.from('audit_logs').insert({
    tenant_id: caller.tenant_id,
    user_id: caller.userId,
    user_email: user?.email ?? '',
    action,
    resource_type: 'team',
    resource_id,
    details: details ?? null,
  })
}

export async function getTeamMembers(tenantId?: string): Promise<TeamMember[]> {
  if (tenantId) await requireManage(tenantId)
  const tenant_id = tenantId ?? await getCallerTenantId()
  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  return users
    .filter(u => u.app_metadata?.tenant_id === tenant_id)
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: (u.app_metadata?.role ?? 'member') as Role,
      joined_at: u.created_at,
      last_seen: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => {
      // owners first, then by join date
      if (a.role === 'owner' && b.role !== 'owner') return -1
      if (b.role === 'owner' && a.role !== 'owner') return 1
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    })
}

export async function getPendingInvites(tenantId?: string): Promise<PendingInvite[]> {
  if (tenantId) await requireManage(tenantId)
  const tenant_id = tenantId ?? await getCallerTenantId()
  const admin = createAdminClient()

  const { data } = await admin
    .from('invite_tokens')
    .select('id, email, expires_at, created_at')
    .eq('tenant_id', tenant_id)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (!data?.length) return []

  // Role isn't stored on invite_tokens — it lives on the stub auth user
  // Supabase creates at invite time (see api/team/invite/route.ts), so look
  // it up by email to display it alongside the pending invite.
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const roleByEmail = new Map(users.map(u => [u.email?.toLowerCase(), (u.app_metadata?.role ?? 'member') as Role]))

  const invites = data as { id: string; email: string; expires_at: string; created_at: string }[]
  return invites.map(invite => ({
    ...invite,
    role: roleByEmail.get(invite.email.toLowerCase()) ?? 'member',
  }))
}

export async function revokeInvite(id: string, tenantId?: string) {
  const targetTenantId = tenantId ?? await getCallerTenantId()
  await requireManage(targetTenantId)
  const admin = createAdminClient()
  await admin
    .from('invite_tokens')
    .delete()
    .eq('id', id)
    .eq('tenant_id', targetTenantId)
}

const VALID_ROLES: Role[] = ['owner', 'member', 'read_only']

export async function updateMemberRole(memberId: string, role: Role, tenantId?: string) {
  if (!VALID_ROLES.includes(role)) throw new Error('Invalid role')

  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.admin.getUserById(memberId)
  const targetTenantId = tenantId ?? user?.app_metadata?.tenant_id
  if (!user || !targetTenantId || user.app_metadata?.tenant_id !== targetTenantId) throw new Error('Forbidden')

  const caller = await requireManage(targetTenantId)
  if (memberId === caller.userId && role !== 'owner') {
    throw new Error("You can't demote yourself — ask another admin to change your role")
  }

  await admin.auth.admin.updateUserById(memberId, {
    app_metadata: { ...user.app_metadata, role },
  })
  await logTeamAudit({ userId: caller.userId, tenant_id: targetTenantId }, 'role_changed', memberId, { new_role: role, email: user.email })
}

export async function removeMember(memberId: string, tenantId?: string) {
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.admin.getUserById(memberId)
  const targetTenantId = tenantId ?? user?.app_metadata?.tenant_id
  if (!user || !targetTenantId || user.app_metadata?.tenant_id !== targetTenantId) throw new Error('Forbidden')

  const caller = await requireManage(targetTenantId)
  // A super admin may remove an admin/owner too — a regular tenant owner may not.
  if (user?.app_metadata?.role === 'owner' && !caller.isSuperAdmin) {
    throw new Error('Cannot remove an admin')
  }

  // Remove from tenant by clearing tenant_id — account still exists but can't access this workspace
  await admin.auth.admin.updateUserById(memberId, {
    app_metadata: { ...user.app_metadata, tenant_id: null, role: null },
  })
  await logTeamAudit({ userId: caller.userId, tenant_id: targetTenantId }, 'user_removed', memberId, { email: user.email })
}
