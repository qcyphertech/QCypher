'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import type { Role } from '@/lib/actions/team'

export type AuditAction =
  | 'contact_created' | 'contact_updated' | 'contact_deleted'
  | 'event_created' | 'event_updated' | 'event_deleted'
  | 'note_created'
  | 'template_created' | 'template_updated' | 'template_deleted'
  | 'login' | 'logout'
  | 'invite_sent' | 'role_changed' | 'user_removed'
  | 'data_exported' | 'deletion_requested' | 'deletion_cancelled' | 'account_deleted'
  | 'pricing_override_set' | 'pricing_override_cleared'
  | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_voided' | 'invoice_marked_paid'
  | 'payment_link_created' | 'payment_link_sent' | 'payment_link_paid'
  | 'payment_account_connected' | 'payment_account_disconnected'
  | 'invoice_reminder_sent' | 'invoice_escalated'
  | 'review_request_sent' | 'review_reminder_sent'
  | 'automation_settings_updated'
  | 'renewal_reminder_sent'
  | 'quote_approved' | 'quote_change_requested'

export type ResourceType = 'contact' | 'event' | 'note' | 'template' | 'auth' | 'team' | 'account' | 'pricing' | 'invoice' | 'payment' | 'order' | 'automation'

export type AuditLog = {
  id: string
  user_email: string
  action: AuditAction
  resource_type: ResourceType
  resource_id: string | null
  resource_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// Fire-and-forget: called after a mutation succeeds. Never throws — a
// logging failure should never break the user's actual action.
export async function logAudit(params: {
  action: AuditAction
  resource_type: ResourceType
  resource_id?: string
  resource_name?: string
  details?: Record<string, unknown>
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tenant_id = await getTenantId(user.id, user.app_metadata)

    await supabase.from('audit_logs').insert({
      tenant_id,
      user_id: user.id,
      user_email: user.email ?? '',
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id ?? null,
      resource_name: params.resource_name ?? null,
      details: params.details ?? null,
    })
  } catch {
    // best-effort — swallow
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)

  if (isSuperAdminUser(fresh)) {
    return { tenant_id: null as string | null, isSuperAdmin: true }
  }

  const tenant_id = await getTenantId(user.id, user.app_metadata)
  const role = (fresh?.app_metadata?.role ?? 'member') as Role
  if (role !== 'owner') throw new Error('Only admins can view the audit trail')

  return { tenant_id, isSuperAdmin: false }
}

async function listSuperAdminEmails(): Promise<string[]> {
  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users.filter(isSuperAdminUser).map(u => u.email ?? '').filter(Boolean)
}

export async function getAuditLogs(filters: {
  page?: number
  pageSize?: number
  userId?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
  search?: string
  // Super admin only — view a specific tenant's log, or omit for all tenants
  tenantId?: string
} = {}): Promise<{ logs: AuditLog[]; total: number }> {
  const { tenant_id, isSuperAdmin } = await requireAdmin()
  const admin = createAdminClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('audit_logs')
    .select('id, user_email, action, resource_type, resource_id, resource_name, details, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (isSuperAdmin) {
    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
    // else: no tenant filter — super admin sees across all tenants
  } else {
    query = query.eq('tenant_id', tenant_id!)
    // Tenant admins never see super admin activity in their own audit trail
    const superAdminEmails = await listSuperAdminEmails()
    for (const email of superAdminEmails) query = query.neq('user_email', email)
  }

  if (filters.userId) query = query.eq('user_id', filters.userId)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.resourceType) query = query.eq('resource_type', filters.resourceType)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to)
  if (filters.search) query = query.or(`user_email.ilike.%${filters.search}%,resource_name.ilike.%${filters.search}%`)

  const { data, count } = await query.range(from, to)
  return { logs: (data ?? []) as AuditLog[], total: count ?? 0 }
}

export async function getRecentAuditLogs(limit = 5): Promise<AuditLog[]> {
  try {
    const { tenant_id, isSuperAdmin } = await requireAdmin()
    if (isSuperAdmin || !tenant_id) return []
    const admin = createAdminClient()
    // Tenant admins never see super admin activity in their own audit trail
    // (matches getAuditLogs) — a super admin acting inside a tenant (e.g.
    // via impersonation) shouldn't surface on that tenant's own dashboard.
    const superAdminEmails = await listSuperAdminEmails()
    let query = admin
      .from('audit_logs')
      .select('id, user_email, action, resource_type, resource_id, resource_name, details, created_at')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .limit(limit)
    for (const email of superAdminEmails) query = query.neq('user_email', email)
    const { data } = await query
    return (data ?? []) as AuditLog[]
  } catch {
    return []
  }
}
