import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Daily, day-of: any recurring-job order scheduled for today that the
// customer never responded to auto-confirms (if the series has
// auto_confirm_if_no_reply on, the default). `confirmed_by` isn't a
// separate column — the audit_logs row is the record of how this
// particular approval happened.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const confirmed: string[] = []

  const { data: candidates } = await admin
    .from('orders')
    .select('id, tenant_id, scheduled_date, recurring_jobs!inner(auto_confirm_if_no_reply)')
    .not('recurring_job_id', 'is', null)
    .is('customer_response', null)
    .eq('payment_status', 'pending')
    .lte('scheduled_date', new Date().toISOString().slice(0, 10))

  if (!candidates?.length) return NextResponse.json({ ok: true, confirmed: [] })

  const now = new Date().toISOString()

  for (const order of candidates as unknown as Array<{
    id: string; tenant_id: string; scheduled_date: string
    recurring_jobs: { auto_confirm_if_no_reply: boolean }
  }>) {
    if (!order.recurring_jobs.auto_confirm_if_no_reply) continue

    const { error } = await admin.from('orders').update({
      customer_response: 'approved',
      customer_response_at: now,
    }).eq('id', order.id)
    if (error) continue

    await admin.from('audit_logs').insert({
      tenant_id: order.tenant_id,
      user_id: null,
      user_email: 'system',
      action: 'recurring_job_auto_confirmed',
      resource_type: 'order',
      resource_id: order.id,
    })

    confirmed.push(order.id)
  }

  return NextResponse.json({ ok: true, confirmed })
}
