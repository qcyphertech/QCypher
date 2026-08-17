'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { renderBrandedEmail } from '@/lib/email/brand'
import { sendEmail } from '@/lib/email/send'
import type { Json } from '@qcypher/db'

type IncidentTimeline = Record<string, string | undefined>

export type IncidentType = 'unauthorized_access' | 'breach_attempt' | 'data_exposure' | 'system_anomaly'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'detected' | 'investigating' | 'confirmed' | 'resolved'

export type Incident = {
  id: string
  tenant_id: string | null
  tenant_name: string | null
  incident_type: IncidentType
  severity: IncidentSeverity
  detected_at: string
  detected_by: 'automated_cron' | 'manual_report'
  description: string | null
  status: IncidentStatus
  timeline: Record<string, string>
  root_cause: string | null
  remediation: string | null
  customers_notified: boolean
  notification_sent_at: string | null
  root_cause_summary: string | null
  summary_sent_at: string | null
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

async function hydrateTenantNames(admin: ReturnType<typeof createAdminClient>, rows: Omit<Incident, 'tenant_name'>[]): Promise<Incident[]> {
  const tenantIds = [...new Set(rows.map(r => r.tenant_id).filter(Boolean))] as string[]
  const { data: tenants } = tenantIds.length
    ? await admin.from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] as { id: string; name: string }[] }
  const nameById = new Map((tenants ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))
  return rows.map(r => ({ ...r, tenant_name: r.tenant_id ? (nameById.get(r.tenant_id) ?? 'Unknown tenant') : 'System-wide' }))
}

export async function listIncidents(status?: IncidentStatus): Promise<Incident[]> {
  const { admin } = await requireSuperAdmin()
  let query = admin.from('incidents').select('*').order('detected_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data } = await query
  return hydrateTenantNames(admin, (data ?? []) as Omit<Incident, 'tenant_name'>[])
}

export async function updateIncidentStatus(id: string, status: IncidentStatus, fields?: { root_cause?: string; remediation?: string }) {
  const { admin } = await requireSuperAdmin()

  const { data: current } = await admin.from('incidents').select('timeline').eq('id', id).single()
  const timeline = { ...((current as { timeline?: Record<string, string> } | null)?.timeline ?? {}) }
  if (status === 'investigating') timeline.investigating_at = new Date().toISOString()
  if (status === 'confirmed') timeline.confirmed_at = new Date().toISOString()
  if (status === 'resolved') timeline.resolved_at = new Date().toISOString()

  const { error } = await admin
    .from('incidents')
    .update({
      status,
      timeline,
      ...(fields?.root_cause ? { root_cause: fields.root_cause } : {}),
      ...(fields?.remediation ? { remediation: fields.remediation } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function reportIncidentManually(input: {
  incident_type: IncidentType
  severity: IncidentSeverity
  tenant_id?: string
  description: string
}) {
  const { admin } = await requireSuperAdmin()
  const { data, error } = await admin
    .from('incidents')
    .insert({
      tenant_id: input.tenant_id ?? null,
      incident_type: input.incident_type,
      severity: input.severity,
      detected_by: 'manual_report',
      description: input.description,
      timeline: { detected_at: new Date().toISOString() },
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

// Fetch every admin (owner) email for the incident's tenant — these are
// the "affected customers" per the playbook (tenant admins, not the
// tenant's own end-customers, since QCypher doesn't have direct contact
// info for a tenant's customers).
async function getTenantAdminEmails(admin: ReturnType<typeof createAdminClient>, tenant_id: string): Promise<string[]> {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users
    .filter(u => u.app_metadata?.tenant_id === tenant_id && u.app_metadata?.role === 'owner')
    .map(u => u.email ?? '')
    .filter(Boolean)
}

export async function sendInitialCustomerNotification(incidentId: string, opts: {
  incidentTypeLabel: string
  affectedData: string
  actionsTaken: string
}) {
  const { admin } = await requireSuperAdmin()
  const { data: incident, error } = await admin.from('incidents').select('*').eq('id', incidentId).single()
  if (error || !incident) throw new Error(error?.message ?? 'Incident not found')
  if (!incident.tenant_id) throw new Error('This incident has no tenant to notify — it is system-wide')

  const emails = await getTenantAdminEmails(admin, incident.tenant_id)
  if (!emails.length) throw new Error('No admin emails found for this tenant')

  const detectedDate = new Date(incident.detected_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

  await sendEmail({
    to: emails,
    subject: 'Security Incident Notification — Action Required',
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">Security Incident Notification</p>
        <p style="margin:0 0 16px;">We are writing to inform you of a potential security incident affecting your QCypher account.</p>
        <p style="margin:0 0 8px;"><strong>What happened:</strong> On ${detectedDate} UTC, we detected ${opts.incidentTypeLabel}.</p>
        <p style="margin:0 0 8px;"><strong>Affected data:</strong> ${opts.affectedData}</p>
        <p style="margin:0 0 16px;"><strong>What we're doing:</strong> ${opts.actionsTaken} We're investigating the full scope and will send a detailed update within 48 hours with root cause and remediation.</p>
        <p style="margin:0 0 8px;"><strong>What you should do:</strong></p>
        <p style="margin:0 0 4px;">1. Change your QCypher password immediately</p>
        <p style="margin:0 0 4px;">2. Monitor your customer communications for anything unusual</p>
        <p style="margin:0 0 16px;">3. Reply to this email with any questions</p>
        <p style="margin:16px 0 0;">We take your security seriously. Thank you for your trust.<br/>— Felix &amp; Thomas, QCypher Technologies</p>
      `,
    }),
  })

  const timeline = { ...(incident.timeline as IncidentTimeline ?? {}), notified_at: new Date().toISOString() }
  await admin.from('incidents').update({
    customers_notified: true,
    notification_sent_at: new Date().toISOString(),
    timeline: timeline as Json,
    updated_at: new Date().toISOString(),
  }).eq('id', incidentId)
}

export async function sendRootCauseSummary(incidentId: string) {
  const { admin } = await requireSuperAdmin()
  const { data: incident, error } = await admin.from('incidents').select('*').eq('id', incidentId).single()
  if (error || !incident) throw new Error(error?.message ?? 'Incident not found')
  if (!incident.tenant_id) throw new Error('This incident has no tenant to notify — it is system-wide')
  if (!incident.root_cause) throw new Error('Fill in the root cause before sending the summary')
  if (incident.root_cause.startsWith('[DRAFT')) {
    throw new Error('Root cause is still an auto-drafted placeholder — review and edit it before sending to a customer')
  }

  const emails = await getTenantAdminEmails(admin, incident.tenant_id)
  if (!emails.length) throw new Error('No admin emails found for this tenant')

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) : '—'
  const timeline = (incident.timeline as IncidentTimeline) ?? {}

  await sendEmail({
    to: emails,
    subject: 'Security Incident Update — Resolved',
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">Security Incident Update — Resolved</p>
        <p style="margin:0 0 16px;">We're following up on the security incident we reported.</p>
        <p style="margin:0 0 8px;"><strong>Root cause:</strong> ${incident.root_cause}</p>
        ${incident.remediation ? `<p style="margin:0 0 16px;"><strong>What we fixed:</strong> ${incident.remediation}</p>` : ''}
        <p style="margin:0 0 4px;"><strong>Timeline:</strong></p>
        <p style="margin:0 0 4px;">Detected: ${fmt(incident.detected_at)} UTC</p>
        <p style="margin:0 0 4px;">Customers notified: ${fmt(timeline.notified_at)} UTC</p>
        <p style="margin:0 0 16px;">Status: Resolved and monitoring</p>
        <p style="margin:16px 0 0;">We're committed to protecting your data. If you have any questions, please reply to this email.<br/>— Felix &amp; Thomas, QCypher Technologies</p>
      `,
    }),
  })

  await admin.from('incidents').update({
    root_cause_summary: incident.root_cause,
    summary_sent_at: new Date().toISOString(),
    timeline: { ...timeline, summary_sent_at: new Date().toISOString() } as Json,
    updated_at: new Date().toISOString(),
  }).eq('id', incidentId)
}
