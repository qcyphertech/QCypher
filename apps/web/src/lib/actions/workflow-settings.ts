'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type WorkflowSettings = {
  invoice_reminder_enabled: boolean
  invoice_reminder_days: number
  invoice_escalate_enabled: boolean
  invoice_escalate_days: number
  review_request_enabled: boolean
  review_request_days: number
  review_reminder_enabled: boolean
  review_reminder_days: number
  google_review_url: string | null
}

export type CustomerAutomationOverride = {
  send_review_requests: boolean
  send_invoice_reminders: boolean
}

const DEFAULT_SETTINGS: WorkflowSettings = {
  invoice_reminder_enabled: true,
  invoice_reminder_days: 3,
  invoice_escalate_enabled: true,
  invoice_escalate_days: 10,
  review_request_enabled: true,
  review_request_days: 1,
  review_reminder_enabled: true,
  review_reminder_days: 7,
  google_review_url: null,
}

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage automation settings')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin }
}

export async function getWorkflowSettings(): Promise<WorkflowSettings> {
  const { tenantId, admin } = await requireOwnerCaller()
  const { data } = await admin.from('workflow_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
  if (!data) return DEFAULT_SETTINGS
  return {
    invoice_reminder_enabled: data.invoice_reminder_enabled,
    invoice_reminder_days: data.invoice_reminder_days,
    invoice_escalate_enabled: data.invoice_escalate_enabled,
    invoice_escalate_days: data.invoice_escalate_days,
    review_request_enabled: data.review_request_enabled,
    review_request_days: data.review_request_days,
    review_reminder_enabled: data.review_reminder_enabled,
    review_reminder_days: data.review_reminder_days,
    google_review_url: data.google_review_url,
  }
}

export async function saveWorkflowSettings(settings: WorkflowSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, tenantId, admin } = await requireOwnerCaller()

  const { error } = await admin
    .from('workflow_settings')
    .upsert({ tenant_id: tenantId, ...settings }, { onConflict: 'tenant_id' })
  if (error) return { ok: false, error: error.message }

  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    user_email: user?.email ?? '',
    action: 'automation_settings_updated',
    resource_type: 'automation',
    details: null,
  })

  revalidatePath('/settings')
  return { ok: true }
}

export async function getCustomerAutomationOverride(contactId: string): Promise<CustomerAutomationOverride> {
  const { tenantId, admin } = await requireOwnerCaller()
  const { data } = await admin
    .from('customer_automation_overrides')
    .select('send_review_requests, send_invoice_reminders')
    .eq('tenant_id', tenantId)
    .eq('contact_id', contactId)
    .maybeSingle()
  return data ?? { send_review_requests: true, send_invoice_reminders: true }
}

export async function saveCustomerAutomationOverride(
  contactId: string,
  override: CustomerAutomationOverride,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin } = await requireOwnerCaller()

  const { error } = await admin
    .from('customer_automation_overrides')
    .upsert({ tenant_id: tenantId, contact_id: contactId, ...override }, { onConflict: 'tenant_id,contact_id' })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}
