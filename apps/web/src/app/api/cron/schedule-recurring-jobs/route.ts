import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeNextOccurrence, type RecurrenceFrequency } from '@/lib/recurrence'

// Daily: for each active recurring_jobs row whose next occurrence is coming
// up soon, create the orders row for it (so it exists in time for the
// reminder cron to email/text about it) and advance next_scheduled_date.
// Creates `reminder_days_before + 1` days ahead of the occurrence itself —
// enough lead time for send-recurring-job-reminders to always have a real
// order/token to work with when it fires.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const created: string[] = []

  const { data: jobs } = await admin
    .from('recurring_jobs')
    .select('id, tenant_id, contact_id, catalog_item_id, title, description, amount, frequency, interval_days, day_of_month, next_scheduled_date, reminder_days_before')
    .eq('status', 'active')

  if (!jobs?.length) return NextResponse.json({ ok: true, created: [] })

  const todayPlus = new Date()

  for (const job of jobs as Array<{
    id: string; tenant_id: string; contact_id: string; catalog_item_id: string | null
    title: string; description: string | null; amount: number
    frequency: RecurrenceFrequency; interval_days: number | null; day_of_month: number | null
    next_scheduled_date: string | null; reminder_days_before: number
  }>) {
    if (!job.next_scheduled_date) continue

    const cutoff = new Date(todayPlus)
    cutoff.setUTCDate(cutoff.getUTCDate() + job.reminder_days_before + 1)
    if (new Date(job.next_scheduled_date) > cutoff) continue

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        tenant_id: job.tenant_id,
        customer_id: job.contact_id,
        recurring_job_id: job.id,
        scheduled_date: job.next_scheduled_date,
        payment_status: 'pending',
        notes: job.description,
      })
      .select('id')
      .single()
    if (orderErr || !order) continue

    await admin.from('order_line_items').insert({
      tenant_id: job.tenant_id,
      order_id: order.id,
      catalog_item_id: job.catalog_item_id,
      item_name_snapshot: job.title,
      description_snapshot: job.description,
      quantity: 1,
      unit_price: job.amount,
      billing_unit_snapshot: 'flat',
    })

    const nextDate = computeNextOccurrence(job.next_scheduled_date, job.frequency, job.day_of_month, job.interval_days)
    await admin.from('recurring_jobs').update({ next_scheduled_date: nextDate, updated_at: new Date().toISOString() }).eq('id', job.id)

    created.push(order.id)
  }

  return NextResponse.json({ ok: true, created })
}
