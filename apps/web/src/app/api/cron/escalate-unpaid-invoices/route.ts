import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'

// Daily: nudges a tenant owner when one of THEIR customers hasn't paid a
// sent invoice (a `payment_requests` row, status 'active' — the pay-link
// record created when the tenant sends a customer a payment request).
// Two stages per tenant setting: a reminder at `invoice_reminder_days`
// since sent, then an escalation at `invoice_escalate_days` — escalation
// also notifies QCypher super admins (no separate ticket system, per the
// Phase 27 scope decision — this is the "escalate to support" signal).
// Idempotent via the unique (payment_request_id, stage) constraint on
// invoice_escalations. Respects the per-customer send_invoice_reminders
// opt-out in customer_automation_overrides.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const sent: string[] = []

  const { data: unpaidRequests } = await admin
    .from('payment_requests')
    .select('id, tenant_id, contact_id, order_id, amount, created_at, status, contacts(first_name, last_name)')
    .eq('status', 'active')

  if (!unpaidRequests?.length) return NextResponse.json({ ok: true, sent: [] })

  const tenantIds = Array.from(new Set(unpaidRequests.map(r => r.tenant_id).filter(Boolean))) as string[]
  const contactIds = Array.from(new Set(unpaidRequests.map(r => r.contact_id).filter(Boolean))) as string[]

  const [{ data: settingsRows }, { data: overrideRows }, { data: tenantRows }] = await Promise.all([
    admin.from('workflow_settings').select('*').in('tenant_id', tenantIds),
    admin.from('customer_automation_overrides').select('contact_id, send_invoice_reminders').in('contact_id', contactIds),
    admin.from('tenants').select('id, name').in('id', tenantIds),
  ])
  const settingsByTenant = new Map((settingsRows ?? []).map(s => [s.tenant_id, s]))
  const overrideByContact = new Map((overrideRows ?? []).map(o => [o.contact_id, o.send_invoice_reminders]))
  const tenantNameById = new Map((tenantRows ?? []).map(t => [t.id, t.name]))

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const ownersByTenant = new Map<string, string[]>()
  const superAdminEmails = users.filter(isSuperAdminUser).map(u => u.email ?? '').filter(Boolean)
  for (const u of users) {
    const tid = u.app_metadata?.tenant_id as string | undefined
    const role = u.app_metadata?.role as string | undefined
    if (!tid || role !== 'owner' || !u.email) continue
    ownersByTenant.set(tid, [...(ownersByTenant.get(tid) ?? []), u.email])
  }

  const now = Date.now()

  for (const req of unpaidRequests as unknown as Array<{
    id: string; tenant_id: string; contact_id: string; order_id: string; amount: number; created_at: string
    contacts: { first_name: string; last_name: string | null } | null
  }>) {
    if (!req.tenant_id) continue
    if (overrideByContact.get(req.contact_id) === false) continue

    const settings = settingsByTenant.get(req.tenant_id) ?? {
      invoice_reminder_enabled: true, invoice_reminder_days: 3,
      invoice_escalate_enabled: true, invoice_escalate_days: 10,
    }
    const daysSinceSent = Math.floor((now - new Date(req.created_at).getTime()) / (24 * 60 * 60 * 1000))
    const owners = ownersByTenant.get(req.tenant_id) ?? []
    if (!owners.length) continue

    const stage = daysSinceSent >= settings.invoice_escalate_days && settings.invoice_escalate_enabled
      ? 'escalated'
      : daysSinceSent >= settings.invoice_reminder_days && settings.invoice_reminder_enabled
        ? 'reminder'
        : null
    if (!stage) continue

    const { error: insertError } = await admin
      .from('invoice_escalations')
      .insert({ tenant_id: req.tenant_id, payment_request_id: req.id, stage })
    if (insertError) continue // already sent this stage — idempotency guard

    const isEscalation = stage === 'escalated'
    const businessName = tenantNameById.get(req.tenant_id) ?? 'your business'
    const customerName = req.contacts ? `${req.contacts.first_name} ${req.contacts.last_name ?? ''}`.trim() : 'A customer'

    await sendEmail({
      to: owners,
      subject: isEscalation
        ? `⚠️ ${customerName}'s invoice is now ${daysSinceSent} days overdue`
        : `Reminder: ${customerName} hasn't paid yet`,
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;">${isEscalation ? 'Invoice overdue' : 'Payment reminder'}</p>
          <p style="margin:16px 0 0;">${customerName}'s invoice for $${Number(req.amount).toFixed(2)} has been unpaid for ${daysSinceSent} days.</p>
          ${isEscalation ? `<p style="margin:16px 0 0;">Need help collecting? QCypher support has been notified and can assist — or reach out anytime at <a href="mailto:support@qcyphertech.com">support@qcyphertech.com</a>.</p>` : ''}
        `,
        cta: { label: 'View order', href: `${appUrl}/orders/${req.order_id}` },
      }),
    })

    if (isEscalation && superAdminEmails.length) {
      await sendEmail({
        to: superAdminEmails,
        subject: `🚩 Escalation: ${businessName} has an invoice ${daysSinceSent} days overdue`,
        html: renderBrandedEmail({
          bodyHtml: `
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Tenant invoice escalation</p>
            <p style="margin:16px 0 0;">Tenant: <strong>${businessName}</strong></p>
            <p style="margin:8px 0 0;">Customer: <strong>${customerName}</strong></p>
            <p style="margin:8px 0 0;">Amount: <strong>$${Number(req.amount).toFixed(2)}</strong> — unpaid ${daysSinceSent} days</p>
          `,
          cta: { label: 'View in Admin Console', href: `${appUrl}/admin` },
        }),
      })
    }

    await admin.from('audit_logs').insert({
      tenant_id: req.tenant_id,
      user_id: null,
      user_email: 'system',
      action: isEscalation ? 'invoice_escalated' : 'invoice_reminder_sent',
      resource_type: 'payment',
      resource_id: req.id,
      resource_name: customerName,
      details: { days_since_sent: daysSinceSent, amount: req.amount },
    })

    sent.push(req.id)
  }

  return NextResponse.json({ ok: true, sent })
}
