'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { renderBrandedEmail } from '@/lib/email/brand'
import { sendEmail } from '@/lib/email/send'
import type { Json } from '@qcypher/db'

export type ApprovalRequestType = 'delete_account' | 'change_plan' | 'enable_integration' | 'disable_integration'
export type ApprovalStatus = 'pending' | 'approved' | 'denied'

export type ApprovalRequest = {
  id: string
  tenant_id: string
  tenant_name: string
  requested_by: string
  requested_by_email: string
  request_type: ApprovalRequestType
  details: Record<string, unknown> | null
  status: ApprovalStatus
  approved_by: string | null
  approval_reason: string | null
  created_at: string
  updated_at: string
}

async function getCallerContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)

  return { user, isSuperAdmin, supabase }
}

async function listSuperAdminEmails(): Promise<string[]> {
  const admin = createAdminClient()
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users.filter(isSuperAdminUser).map(u => u.email ?? '').filter(Boolean)
}

const REQUEST_LABEL: Record<ApprovalRequestType, string> = {
  delete_account: 'Account deletion',
  change_plan: 'Plan change',
  enable_integration: 'Enable integration',
  disable_integration: 'Disable integration',
}

export type CreateApprovalRequestResult = { ok: true; id: string } | { ok: false; error: string }

// Returns a result instead of throwing — Next.js redacts thrown Server
// Action error messages in production, so "Only admins can request this
// action" (which the panel actually shows) has to travel back as data.
export async function createApprovalRequest(
  request_type: ApprovalRequestType,
  details?: Record<string, unknown>,
): Promise<CreateApprovalRequestResult> {
  const { user, supabase } = await getCallerContext()
  const tenant_id = await getTenantId(user.id, user.app_metadata)

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (fresh?.app_metadata?.role !== 'owner') {
    return { ok: false, error: 'Only admins can request this action' }
  }

  const { data: tenant } = await supabase.from('tenants').select('name').single()

  const { data: req, error } = await admin
    .from('approval_requests')
    .insert({ tenant_id, requested_by: user.id, request_type, details: (details ?? null) as Json | null })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  const tenantName = (tenant as { name?: string } | null)?.name ?? 'A tenant'
  const superAdminEmails = await listSuperAdminEmails()
  await sendEmail({
    to: superAdminEmails,
    subject: `Approval requested: ${REQUEST_LABEL[request_type]} — ${tenantName}`,
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">${REQUEST_LABEL[request_type]} requested</p>
        <p style="margin:0 0 8px;"><strong>Tenant:</strong> ${tenantName}</p>
        <p style="margin:0 0 8px;"><strong>Requested by:</strong> ${user.email}</p>
        ${details ? `<p style="margin:0 0 8px;"><strong>Details:</strong> ${JSON.stringify(details)}</p>` : ''}
        <p style="margin:16px 0 0;">Review it in the Admin Console.</p>
      `,
      cta: { label: 'Open Admin Console', href: `${process.env.APP_URL ?? 'https://www.qcyphertech.com'}/admin-console` },
    }),
  })

  return { ok: true, id: req.id as string }
}

export async function listApprovalRequests(status?: ApprovalStatus): Promise<ApprovalRequest[]> {
  const { user, isSuperAdmin } = await getCallerContext()
  const admin = createAdminClient()

  let query = admin
    .from('approval_requests')
    .select('id, tenant_id, requested_by, request_type, details, status, approved_by, approval_reason, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (!isSuperAdmin) {
    const tenant_id = await getTenantId(user.id, user.app_metadata)
    query = query.eq('tenant_id', tenant_id)
  }
  if (status) query = query.eq('status', status)

  const { data } = await query
  const rows = (data ?? []) as Omit<ApprovalRequest, 'tenant_name' | 'requested_by_email'>[]
  if (!rows.length) return []

  const tenantIds = [...new Set(rows.map(r => r.tenant_id))]
  const userIds = [...new Set(rows.map(r => r.requested_by))]

  const [{ data: tenants }, { data: { users } }] = await Promise.all([
    admin.from('tenants').select('id, name').in('id', tenantIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])
  const tenantName = new Map((tenants ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
  const emailById = new Map(users.filter(u => userIds.includes(u.id)).map(u => [u.id, u.email ?? '']))

  return rows.map(r => ({
    ...r,
    tenant_name: tenantName.get(r.tenant_id) ?? 'Unknown tenant',
    requested_by_email: emailById.get(r.requested_by) ?? 'unknown',
  }))
}

// Executes the actual effect of an approved request. Only delete_account
// and change_plan are auto-executed — enable/disable_integration each need
// per-integration provisioning logic (OAuth connections, phone number
// purchase, etc.) that doesn't reduce to a generic field update, so those
// stay "approved" without an automatic side effect for now.
async function executeApproval(
  admin: ReturnType<typeof createAdminClient>,
  req: { tenant_id: string; request_type: ApprovalRequestType; details: Record<string, unknown> | null },
) {
  if (req.request_type === 'delete_account') {
    await admin.from('tenants').update({ status: 'suspended', deleted_at: new Date().toISOString() }).eq('id', req.tenant_id)

    // Lock out every member of the tenant — same mechanism as removing a
    // single team member (lib/actions/team.ts), applied tenant-wide. Data
    // stays in place (soft delete); nobody can access it through the app.
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const members = users.filter(u => u.app_metadata?.tenant_id === req.tenant_id)
    await Promise.all(members.map(m =>
      admin.auth.admin.updateUserById(m.id, { app_metadata: { ...m.app_metadata, tenant_id: null, role: null } }),
    ))
  }

  if (req.request_type === 'change_plan') {
    const newPlan = req.details?.new_plan
    if (typeof newPlan === 'string' && newPlan.trim()) {
      await admin.from('tenants').update({ plan: newPlan.trim() }).eq('id', req.tenant_id)
    }
  }
}

export async function decideApprovalRequest(id: string, status: 'approved' | 'denied', approval_reason?: string) {
  const { user, isSuperAdmin } = await getCallerContext()
  if (!isSuperAdmin) throw new Error('Only super admins can approve or deny requests')

  const admin = createAdminClient()
  const { data: req, error } = await admin
    .from('approval_requests')
    .update({ status, approved_by: user.id, approval_reason: approval_reason ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, tenant_id, requested_by, request_type, details')
    .single()

  if (error) throw new Error(error.message)

  if (status === 'approved') {
    await executeApproval(admin, req as { tenant_id: string; request_type: ApprovalRequestType; details: Record<string, unknown> | null })
  }

  const { data: { user: requester } } = await admin.auth.admin.getUserById(req.requested_by)
  if (requester?.email) {
    const decided = status === 'approved' ? 'approved' : 'denied'
    await sendEmail({
      to: requester.email,
      subject: `Your request was ${decided}`,
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">Your ${REQUEST_LABEL[req.request_type as ApprovalRequestType].toLowerCase()} request was ${decided}</p>
          ${approval_reason ? `<p style="margin:0 0 16px;">${approval_reason}</p>` : ''}
        `,
      }),
    })
  }

  return req.id as string
}
