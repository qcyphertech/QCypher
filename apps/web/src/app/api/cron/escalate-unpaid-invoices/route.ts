import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'

// Daily: nudges tenant owners about their own unpaid QCypher invoices
// (the `invoices` table — QCypher billing tenants, not tenant-facing
// customer invoices). Two stages per tenant setting: a reminder at
// `invoice_reminder_days` since sent, then an escalation email at
// `invoice_escalate_days`. Idempotent via the unique (invoice_id, stage)
// constraint on invoice_escalations — a duplicate insert just fails and
// is skipped rather than resending.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const sent: string[] = []

  const { data: unpaidInvoices } = await admin
    .from('invoices')
    .select('id, tenant_id, invoice_number, amount, sent_at, status')
    .in('status', ['sent', 'overdue'])
    .not('sent_at', 'is', null)

  if (!unpaidInvoices?.length) return NextResponse.json({ ok: true, sent: [] })

  const tenantIds = Array.from(new Set(unpaidInvoices.map(i => i.tenant_id).filter(Boolean))) as string[]

  const { data: settingsRows } = await admin
    .from('workflow_settings')
    .select('*')
    .in('tenant_id', tenantIds)
  const settingsByTenant = new Map((settingsRows ?? []).map(s => [s.tenant_id, s]))

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const ownersByTenant = new Map<string, string[]>()
  for (const u of users) {
    const tid = u.app_metadata?.tenant_id as string | undefined
    const role = u.app_metadata?.role as string | undefined
    if (!tid || role !== 'owner' || !u.email) continue
    ownersByTenant.set(tid, [...(ownersByTenant.get(tid) ?? []), u.email])
  }

  const now = Date.now()

  for (const inv of unpaidInvoices) {
    if (!inv.tenant_id) continue
    const settings = settingsByTenant.get(inv.tenant_id) ?? {
      invoice_reminder_enabled: true, invoice_reminder_days: 3,
      invoice_escalate_enabled: true, invoice_escalate_days: 10,
    }
    const daysSinceSent = Math.floor((now - new Date(inv.sent_at as string).getTime()) / (24 * 60 * 60 * 1000))
    const owners = ownersByTenant.get(inv.tenant_id) ?? []
    if (!owners.length) continue

    const stage = daysSinceSent >= settings.invoice_escalate_days && settings.invoice_escalate_enabled
      ? 'escalated'
      : daysSinceSent >= settings.invoice_reminder_days && settings.invoice_reminder_enabled
        ? 'reminder'
        : null
    if (!stage) continue

    const { error: insertError } = await admin
      .from('invoice_escalations')
      .insert({ tenant_id: inv.tenant_id, invoice_id: inv.id, stage })
    if (insertError) continue // already sent this stage — idempotency guard

    const isEscalation = stage === 'escalated'
    await sendEmail({
      to: owners,
      subject: isEscalation
        ? `⚠️ Invoice ${inv.invoice_number} is now ${daysSinceSent} days overdue`
        : `Reminder: Invoice ${inv.invoice_number} is unpaid`,
      html: renderBrandedEmail({
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;">${isEscalation ? 'Invoice overdue' : 'Payment reminder'}</p>
          <p style="margin:16px 0 0;">Invoice ${inv.invoice_number} for $${Number(inv.amount).toFixed(2)} has been unpaid for ${daysSinceSent} days.</p>
          ${isEscalation ? `<p style="margin:16px 0 0;">If you need help resolving this, contact QCypher support at <a href="mailto:support@qcyphertech.com">support@qcyphertech.com</a>.</p>` : ''}
        `,
        cta: { label: 'View invoice', href: `${appUrl}/settings` },
      }),
    })

    await admin.from('audit_logs').insert({
      tenant_id: inv.tenant_id,
      user_id: null,
      user_email: 'system',
      action: isEscalation ? 'invoice_escalated' : 'invoice_reminder_sent',
      resource_type: 'invoice',
      resource_id: inv.id,
      resource_name: inv.invoice_number,
      details: { days_since_sent: daysSinceSent },
    })

    sent.push(inv.id)
  }

  return NextResponse.json({ ok: true, sent })
}
