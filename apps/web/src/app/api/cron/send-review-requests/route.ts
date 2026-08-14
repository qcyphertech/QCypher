import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderNeutralEmail } from '@/lib/email/neutral'
import { sendSms } from '@/lib/telnyx'

// Daily: asks customers to leave a review N days after their order's
// job_status flips to 'completed' (orders.updated_at is the best signal
// we have for that transition — no dedicated completed_at column).
// Initial ask is SMS + email; a single follow-up (SMS only, cost
// optimization) fires later per tenant's review_reminder_days.
// Idempotent via the unique (order_id, stage) constraint on
// review_requests, and respects both the tenant-level toggle and any
// per-customer opt-out in customer_automation_overrides.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const sent: string[] = []

  const { data: completedOrders } = await admin
    .from('orders')
    .select('id, tenant_id, customer_id, updated_at, job_status, contacts(first_name, email, phone)')
    .eq('job_status', 'completed')

  if (!completedOrders?.length) return NextResponse.json({ ok: true, sent: [] })

  const tenantIds = Array.from(new Set(completedOrders.map(o => o.tenant_id).filter(Boolean))) as string[]

  const { data: settingsRows } = await admin
    .from('workflow_settings')
    .select('*')
    .in('tenant_id', tenantIds)
  const settingsByTenant = new Map((settingsRows ?? []).map(s => [s.tenant_id, s]))

  const { data: tenantRows } = await admin.from('tenants').select('id, name').in('id', tenantIds)
  const tenantNameById = new Map((tenantRows ?? []).map(t => [t.id, t.name]))

  const contactIds = Array.from(new Set(completedOrders.map(o => o.customer_id).filter(Boolean))) as string[]
  const { data: overrideRows } = await admin
    .from('customer_automation_overrides')
    .select('contact_id, send_review_requests')
    .in('contact_id', contactIds)
  const overrideByContact = new Map((overrideRows ?? []).map(o => [o.contact_id, o.send_review_requests]))

  const now = Date.now()

  for (const order of completedOrders as unknown as Array<{
    id: string; tenant_id: string; customer_id: string | null; updated_at: string; job_status: string
    contacts: { first_name: string; email: string | null; phone: string | null } | null
  }>) {
    if (!order.customer_id) continue

    const settings = settingsByTenant.get(order.tenant_id) ?? {
      review_request_enabled: true, review_request_days: 1,
      review_reminder_enabled: true, review_reminder_days: 7,
      google_review_url: null,
    }
    if (overrideByContact.get(order.customer_id) === false) continue

    const reviewUrl = settings.google_review_url as string | null
    if (!reviewUrl) continue

    const daysSinceCompleted = Math.floor((now - new Date(order.updated_at).getTime()) / (24 * 60 * 60 * 1000))
    const stage = daysSinceCompleted >= settings.review_reminder_days && settings.review_reminder_enabled
      ? 'followup'
      : daysSinceCompleted >= settings.review_request_days && settings.review_request_enabled
        ? 'initial'
        : null
    if (!stage) continue

    const { error: insertError } = await admin
      .from('review_requests')
      .insert({ tenant_id: order.tenant_id, order_id: order.id, contact_id: order.customer_id, stage })
    if (insertError) continue // already sent this stage — idempotency guard

    const businessName = tenantNameById.get(order.tenant_id) ?? 'us'
    const firstName = order.contacts?.first_name ?? ''
    const smsBody = stage === 'initial'
      ? `Hi ${firstName}, thanks for choosing ${businessName}! Mind leaving us a quick review? ${reviewUrl}`
      : `Hi ${firstName}, would you take a moment to review ${businessName}? It really helps: ${reviewUrl}`

    if (order.contacts?.phone) {
      await sendSms({ to: order.contacts.phone, body: smsBody })
    }
    if (stage === 'initial' && order.contacts?.email) {
      await sendEmail({
        to: order.contacts.email,
        subject: `How did we do, ${firstName}?`,
        html: renderNeutralEmail({
          senderName: businessName,
          bodyHtml: `
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Thanks for choosing ${businessName}!</p>
            <p style="margin:16px 0 0;">Hi ${firstName}, we'd love to hear how it went. A quick review helps us a lot.</p>
          `,
          cta: { label: 'Leave a review', href: reviewUrl },
        }),
      })
    }

    await admin.from('audit_logs').insert({
      tenant_id: order.tenant_id,
      user_id: null,
      user_email: 'system',
      action: stage === 'initial' ? 'review_request_sent' : 'review_reminder_sent',
      resource_type: 'order',
      resource_id: order.id,
      details: { days_since_completed: daysSinceCompleted },
    })

    sent.push(order.id)
  }

  return NextResponse.json({ ok: true, sent })
}
