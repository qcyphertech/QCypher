import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { renderBrandedEmail } from '@/lib/email/brand'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/telnyx'

/**
 * Daily automated incident detection (Phase 24).
 *
 * Runs once/day (06:30 UTC) rather than the spec's hourly cadence — Vercel's
 * Hobby plan rejects the entire deployment outright if any cron in
 * vercel.json runs more than once per day (confirmed by a failed deploy:
 * "Hobby accounts are limited to daily cron jobs"). Upgrading to Pro would
 * unlock hourly; staying free means a detection lag of up to ~24h. Flagged
 * to the user — this is a real tradeoff, not a silent limitation.
 *
 * Scope decision: the spec's Trigger 1 (RLS rejections) and Trigger 2
 * (failed login attempts / brute force) aren't detectable with what this
 * app actually logs. audit_logs (Phase 22) only records actions the app
 * layer performed successfully — a blocked RLS write never reaches our
 * logAudit() call, and Supabase Auth's own failed-login logs live in
 * GoTrue's internal log store, which isn't queryable from application
 * code without the separate Supabase Management API (not configured
 * here, and a paid-tier-only surface on some plans). Rather than ship
 * detection code that can never actually fire, this cron implements the
 * two triggers that ARE grounded in real data:
 *
 *   - Trigger 3a: bulk delete of contacts/templates/events by one user
 *     in the lookback window (spec's ">50 records in 5 min" adapted to
 *     this cron's daily cadence — see BULK_DELETE_THRESHOLD below)
 *   - Trigger 3b: a role_changed audit entry where the actor changed
 *     their OWN role. The app already blocks this in code
 *     (updateMemberRole throws on self-demotion) — this is a
 *     defense-in-depth check in case that guard is ever bypassed or a
 *     future code path reintroduces the bug.
 *
 * Triggers 1, 2, and 4 (infrastructure anomalies / 5xx rates) are
 * documented as not-yet-implemented in the incident response playbook
 * on /security rather than faked here.
 */

const BULK_DELETE_THRESHOLD = 20
const DELETE_ACTIONS = ['contact_deleted', 'template_deleted', 'event_deleted']

async function listSuperAdmins(admin: ReturnType<typeof createAdminClient>) {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  return users.filter(isSuperAdminUser)
}

async function alertSuperAdmins(
  admin: ReturnType<typeof createAdminClient>,
  incident: { incident_type: string; severity: string; description: string; tenant_name: string; id: string },
) {
  const superAdmins = await listSuperAdmins(admin)
  const emails = superAdmins.map(u => u.email ?? '').filter(Boolean)
  if (emails.length) {
    await sendEmail({
      to: emails,
      subject: `Security Alert: ${incident.incident_type.replace(/_/g, ' ')} detected`,
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">Security incident detected</p>
          <p style="margin:0 0 8px;"><strong>Type:</strong> ${incident.incident_type.replace(/_/g, ' ')}</p>
          <p style="margin:0 0 8px;"><strong>Severity:</strong> ${incident.severity}</p>
          <p style="margin:0 0 8px;"><strong>Tenant:</strong> ${incident.tenant_name}</p>
          <p style="margin:0 0 16px;"><strong>Details:</strong> ${incident.description}</p>
          <p style="margin:16px 0 0;">Review it in the Admin Console within 24 hours to assess whether affected customers need to be notified.</p>
        `,
        cta: { label: 'Review incident', href: `${process.env.APP_URL ?? 'https://www.qcyphertech.com'}/admin` },
      }),
    })
  }

  const alertPhones = (process.env.ALERT_PHONE_NUMBERS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  for (const to of alertPhones) {
    await sendSms({ to, body: 'Security incident detected. Check email for details.' })
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const created: string[] = []

  const { data: recentLogs } = await admin
    .from('audit_logs')
    .select('tenant_id, user_id, user_email, action, resource_id, created_at')
    .gte('created_at', since)

  const logs = (recentLogs ?? []) as { tenant_id: string; user_id: string; user_email: string; action: string; resource_id: string | null; created_at: string }[]

  // Cache tenant names for description text
  const tenantIds = [...new Set(logs.map(l => l.tenant_id))]
  const { data: tenants } = tenantIds.length
    ? await admin.from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] as { id: string; name: string }[] }
  const tenantName = new Map((tenants ?? []).map((t: { id: string; name: string }) => [t.id, t.name]))

  // Trigger 3a — bulk deletes
  const deleteCounts = new Map<string, { tenant_id: string; user_email: string; count: number }>()
  for (const log of logs) {
    if (!DELETE_ACTIONS.includes(log.action)) continue
    const key = `${log.tenant_id}:${log.user_id}`
    const existing = deleteCounts.get(key)
    if (existing) existing.count++
    else deleteCounts.set(key, { tenant_id: log.tenant_id, user_email: log.user_email, count: 1 })
  }
  for (const { tenant_id, user_email, count } of deleteCounts.values()) {
    if (count < BULK_DELETE_THRESHOLD) continue

    // Skip if an unresolved incident of this type already exists for this tenant
    const { data: existing } = await admin
      .from('incidents')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('incident_type', 'data_exposure')
      .neq('status', 'resolved')
      .gte('detected_at', since)
      .limit(1)
    if (existing?.length) continue

    const description = `${user_email} deleted ${count} records in the last 24 hours (threshold: ${BULK_DELETE_THRESHOLD}).`
    // Auto-drafted from what the cron actually observed — this is a starting
    // point for the super admin to confirm or correct during investigation,
    // not a verified root cause. "Why" it happened (legitimate cleanup vs.
    // a compromised account) needs human judgment the system can't supply.
    const root_cause = `[DRAFT — confirm before sending to customer] ${user_email} deleted ${count} contact/template/event records within a 24-hour window, exceeding the automated bulk-delete threshold of ${BULK_DELETE_THRESHOLD}. Detected by the incident-response cron scanning audit_logs. Whether this was an authorized bulk cleanup or unauthorized/compromised access has not yet been confirmed.`
    const remediation = `[DRAFT — confirm before sending to customer] Verify with ${user_email} (or the tenant owner) whether this deletion was intentional. If unauthorized: revoke the user's access immediately, review the deleted records for restoration from the daily backup, and rotate any credentials that may have been compromised.`
    const { data: incident } = await admin
      .from('incidents')
      .insert({
        tenant_id, incident_type: 'data_exposure', severity: 'high',
        detected_by: 'automated_cron', description, root_cause, remediation,
        timeline: { detected_at: new Date().toISOString() },
      })
      .select('id')
      .single()

    if (incident) {
      created.push(incident.id)
      await alertSuperAdmins(admin, {
        incident_type: 'data_exposure', severity: 'high', description,
        tenant_name: tenantName.get(tenant_id) ?? 'Unknown tenant', id: incident.id,
      })
    }
  }

  // Trigger 3b — self role escalation (should be blocked in code; detect if it ever happens)
  for (const log of logs) {
    if (log.action !== 'role_changed' || log.resource_id !== log.user_id) continue

    const description = `${log.user_email} appears to have changed their own role — this should be blocked by application code. Investigate immediately.`
    const root_cause = `[DRAFT — confirm before sending to customer] ${log.user_email} successfully changed their own team role, which application code (updateMemberRole in lib/actions/team.ts) is designed to block. Detected by the incident-response cron scanning audit_logs for role_changed entries where the actor and target are the same user. This indicates either a bypass of that guard or a bug in how the action was logged — the guard itself needs to be re-verified as part of investigation.`
    const remediation = `[DRAFT — confirm before sending to customer] Immediately verify the affected user's current role is correct and revert if not. Re-test the self-demotion guard in lib/actions/team.ts (updateMemberRole) to confirm it still throws as expected. Review recent deployments for anything that could have altered that code path.`
    const { data: incident } = await admin
      .from('incidents')
      .insert({
        tenant_id: log.tenant_id, incident_type: 'unauthorized_access', severity: 'critical',
        detected_by: 'automated_cron', description, root_cause, remediation,
        timeline: { detected_at: new Date().toISOString() },
      })
      .select('id')
      .single()

    if (incident) {
      created.push(incident.id)
      await alertSuperAdmins(admin, {
        incident_type: 'unauthorized_access', severity: 'critical', description,
        tenant_name: tenantName.get(log.tenant_id) ?? 'Unknown tenant', id: incident.id,
      })
    }
  }

  return NextResponse.json({ ok: true, incidentsCreated: created.length, ids: created })
}
