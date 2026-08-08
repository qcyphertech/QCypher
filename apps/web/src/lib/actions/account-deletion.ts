'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/actions/audit'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'
import { revalidatePath } from 'next/cache'

const GRACE_PERIOD_DAYS = 30

export type DeletionStatus = {
  status: string
  deletionRequestedAt: string | null
  deletionScheduledAt: string | null
}

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can export or delete account data')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, email: user.email ?? '', tenantId, admin }
}

export async function getDeletionStatus(): Promise<DeletionStatus> {
  const { tenantId, admin } = await requireOwner()
  const { data } = await admin
    .from('tenants')
    .select('status, deletion_requested_at, deletion_scheduled_at')
    .eq('id', tenantId)
    .single()

  return {
    status: (data as { status?: string } | null)?.status ?? 'active',
    deletionRequestedAt: (data as { deletion_requested_at?: string | null } | null)?.deletion_requested_at ?? null,
    deletionScheduledAt: (data as { deletion_scheduled_at?: string | null } | null)?.deletion_scheduled_at ?? null,
  }
}

export async function requestAccountDeletion() {
  const { userId, email, tenantId, admin } = await requireOwner()

  const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
  const tenantName = (tenant as { name?: string } | null)?.name ?? 'your workspace'

  const requestedAt = new Date()
  const scheduledAt = new Date(requestedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const { error } = await admin
    .from('tenants')
    .update({
      status: 'pending_deletion',
      deletion_requested_at: requestedAt.toISOString(),
      deletion_scheduled_at: scheduledAt.toISOString(),
      deletion_reason: 'customer_requested',
    })
    .eq('id', tenantId)
  if (error) throw new Error(error.message)

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const scheduledLabel = scheduledAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  await sendEmail({
    to: email,
    subject: 'Confirm your account deletion request',
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Account deletion requested</p>
        <p style="margin:16px 0 0;">You requested to delete your QCypher account <strong>${tenantName}</strong>.</p>
        <p style="margin:16px 0 0;">Your account and all its data will be <strong>permanently deleted on ${scheduledLabel}</strong> — 30 days from today.</p>
        <p style="margin:16px 0 0;">Changed your mind? You can undo this any time before then by logging back in and clicking "Cancel Deletion" in Settings → Export &amp; Delete.</p>
      `,
      cta: { label: 'Log in to cancel', href: `${appUrl}/auth/login` },
    }),
    text: `You requested to delete your QCypher account ${tenantName}. Your account will be permanently deleted on ${scheduledLabel}. Log in before then and cancel from Settings to undo this.`,
  })

  await logAudit({
    action: 'deletion_requested',
    resource_type: 'account',
    resource_id: tenantId,
    resource_name: tenantName,
    details: { requested_by: userId, deletion_scheduled_at: scheduledAt.toISOString() },
  })

  revalidatePath('/settings')
  return { deletionScheduledAt: scheduledAt.toISOString() }
}

export async function cancelAccountDeletion() {
  const { userId, email, tenantId, admin } = await requireOwner()

  const { data: tenant } = await admin.from('tenants').select('name, status').eq('id', tenantId).single()
  const t = tenant as { name?: string; status?: string } | null
  if (t?.status !== 'pending_deletion') throw new Error('No deletion request is pending for this account')

  const { error } = await admin
    .from('tenants')
    .update({ status: 'active', deletion_requested_at: null, deletion_scheduled_at: null, deletion_reason: null })
    .eq('id', tenantId)
  if (error) throw new Error(error.message)

  await sendEmail({
    to: email,
    subject: 'Your deletion request has been cancelled',
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Deletion cancelled</p>
        <p style="margin:16px 0 0;">Your request to delete <strong>${t?.name ?? 'your workspace'}</strong> has been cancelled. Your account is active again and nothing was deleted.</p>
      `,
    }),
    text: `Your request to delete ${t?.name ?? 'your workspace'} has been cancelled. Your account is active again.`,
  })

  await logAudit({
    action: 'deletion_cancelled',
    resource_type: 'account',
    resource_id: tenantId,
    resource_name: t?.name,
    details: { cancelled_by: userId },
  })

  revalidatePath('/settings')
  return {}
}
