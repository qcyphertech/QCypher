import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderNeutralEmail } from '@/lib/email/neutral'
import { sendSms } from '@/lib/telnyx'
import { formatTimeLabel } from '@/lib/recurrence'

// Daily: for each pending recurring-job order whose scheduled_date is
// exactly `reminder_days_before` away, send the customer an approve/
// reschedule/skip link — email if they have one on file, SMS only when
// they don't — and mark reminder_sent_at so it only ever goes out once.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const sent: string[] = []

  const { data: candidates } = await admin
    .from('orders')
    .select(`
      id, tenant_id, scheduled_date, scheduled_time, confirm_token, total_amount,
      recurring_jobs!inner(title, description, send_reminder, reminder_days_before),
      contacts(first_name, email, phone),
      tenants(name)
    `)
    .not('recurring_job_id', 'is', null)
    .is('customer_response', null)
    .is('reminder_sent_at', null)
    .eq('payment_status', 'pending')

  if (!candidates?.length) return NextResponse.json({ ok: true, sent: [] })

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (const order of candidates as unknown as Array<{
    id: string; tenant_id: string; scheduled_date: string; scheduled_time: string | null; confirm_token: string; total_amount: number
    recurring_jobs: { title: string; description: string | null; send_reminder: boolean; reminder_days_before: number }
    contacts: { first_name: string; email: string | null; phone: string | null } | null
    tenants: { name: string } | null
  }>) {
    if (!order.recurring_jobs.send_reminder) continue

    const scheduled = new Date(order.scheduled_date)
    scheduled.setUTCHours(0, 0, 0, 0)
    const daysUntil = Math.round((scheduled.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    if (daysUntil !== order.recurring_jobs.reminder_days_before) continue

    const businessName = order.tenants?.name ?? 'your service provider'
    const contact = order.contacts
    const link = `${appUrl}/recurring/${order.confirm_token}`
    const dateLabel = scheduled.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      + (order.scheduled_time ? ` at ${formatTimeLabel(order.scheduled_time)}` : '')
    const expiresAt = new Date(scheduled)
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1)

    await admin.from('orders').update({
      reminder_sent_at: new Date().toISOString(),
      confirm_token_expires_at: expiresAt.toISOString(),
    }).eq('id', order.id)

    if (contact?.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${businessName} <${process.env.RESEND_FROM_EMAIL ?? 'hello@qcyphertech.com'}>`,
          to: [contact.email],
          subject: `${order.recurring_jobs.title} — please confirm (${dateLabel})`,
          html: renderNeutralEmail({
            senderName: businessName,
            bodyHtml: `
              <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a202c;">Your appointment is coming up</p>
              <p style="margin:16px 0 0;">Hi ${contact.first_name ?? 'there'},</p>
              <p style="margin:16px 0 0;">${order.recurring_jobs.title} is scheduled for <strong>${dateLabel}</strong>${order.recurring_jobs.description ? ` — ${order.recurring_jobs.description}` : ''}.</p>
              <div style="background:#f7f7f8;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid rgba(15,23,42,0.06);text-align:center;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#718096;margin-bottom:6px;">Price</div>
                <div style="font-size:28px;font-weight:800;color:#1a202c;">$${Number(order.total_amount).toFixed(2)}</div>
              </div>
              <p style="margin:0;font-size:13px;color:#718096;">Please confirm, reschedule, or skip using the button below.</p>
            `,
            cta: { label: 'Review appointment', href: link },
          }),
          text: `Your ${order.recurring_jobs.title} appointment is scheduled for ${dateLabel} ($${Number(order.total_amount).toFixed(2)}). Confirm, reschedule, or skip: ${link}`,
        }),
      })
    } else if (contact?.phone) {
      await sendSms({
        to: contact.phone,
        body: `Hi ${contact.first_name ?? 'there'}, your ${order.recurring_jobs.title} is scheduled for ${dateLabel} ($${Number(order.total_amount).toFixed(2)}). Confirm here: ${link}`,
      })
    }

    sent.push(order.id)
  }

  return NextResponse.json({ ok: true, sent })
}
