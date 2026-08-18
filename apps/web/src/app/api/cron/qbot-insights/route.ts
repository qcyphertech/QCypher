import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Proactive QBot: instead of only ever answering when asked, this daily
// cron flags conditions a tenant would want to know about without
// having to think to ask — aging unpaid invoices, and a meaningful
// week-over-week revenue drop. Surfaces via the existing notification
// bell (no new UI) rather than QBot messaging the tenant unprompted,
// since a chat widget popping open on its own would be a worse
// experience than a notification the tenant checks on their own time.
// Dedupes against the last 7 days so a persistent condition doesn't
// spam a fresh notification every single day.
const STALE_INVOICE_DAYS = 14
const REVENUE_DROP_THRESHOLD = 0.25 // 25%+ week-over-week drop
const DEDUPE_WINDOW_DAYS = 7

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: tenants } = await admin.from('tenants').select('id')
  if (!tenants?.length) return NextResponse.json({ ok: true, flagged: 0 })

  const now = new Date()
  const staleThreshold = new Date(now.getTime() - STALE_INVOICE_DAYS * 24 * 60 * 60 * 1000)
  const startOfThisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const dedupeSince = new Date(now.getTime() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  let flagged = 0

  for (const tenant of tenants) {
    const { data: recentInsights } = await admin
      .from('notifications')
      .select('body')
      .eq('tenant_id', tenant.id)
      .eq('type', 'qbot_insight')
      .gte('created_at', dedupeSince)
    const alreadyFlagged = new Set((recentInsights ?? []).map(n => n.body))

    const { data: staleOrders } = await admin
      .from('orders')
      .select('total_amount')
      .eq('tenant_id', tenant.id)
      .eq('payment_status', 'pending')
      .lt('created_at', staleThreshold.toISOString())
    if (staleOrders && staleOrders.length > 0) {
      const total = staleOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
      const body = `${staleOrders.length} invoice${staleOrders.length === 1 ? ' has' : 's have'} been unpaid for ${STALE_INVOICE_DAYS}+ days, totaling ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`
      if (!alreadyFlagged.has(body)) {
        await admin.from('notifications').insert({ tenant_id: tenant.id, type: 'qbot_insight', title: 'Aging unpaid invoices', body, link: '/orders' })
        flagged++
      }
    }

    const [thisWeek, lastWeek] = await Promise.all([
      admin.from('orders').select('total_amount').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('updated_at', startOfThisWeek.toISOString()),
      admin.from('orders').select('total_amount').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('updated_at', startOfLastWeek.toISOString()).lt('updated_at', startOfThisWeek.toISOString()),
    ])
    const thisWeekTotal = (thisWeek.data ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const lastWeekTotal = (lastWeek.data ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
    // Only meaningful with a real baseline — a brand-new or quiet tenant
    // going from a small number to zero isn't the kind of drop worth
    // surfacing, and would just be noise every week.
    if (lastWeekTotal >= 200 && thisWeekTotal <= lastWeekTotal * (1 - REVENUE_DROP_THRESHOLD)) {
      const pct = Math.round((1 - thisWeekTotal / lastWeekTotal) * 100)
      const body = `Revenue this week (${thisWeekTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}) is down ${pct}% from last week (${lastWeekTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}).`
      if (!alreadyFlagged.has(body)) {
        await admin.from('notifications').insert({ tenant_id: tenant.id, type: 'qbot_insight', title: 'Revenue down this week', body, link: '/overview' })
        flagged++
      }
    }
  }

  return NextResponse.json({ ok: true, flagged })
}
