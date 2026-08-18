import { createAdminClient } from '@/lib/supabase/admin'
import { callDeepSeekChat } from '@/lib/deepseek'

export type AnalyticsSnapshot = {
  id: string
  tenant_id: string
  snapshot_date: string
  revenue_mtd: number
  revenue_ytd: number
  revenue_growth_percent: number | null
  revenue_monthly_trend: { month: string; revenue: number }[]
  revenue_by_service: { name: string; revenue: number }[]
  customers_active: number
  customers_new_month: number
  customers_inactive_30d: number
  retention_rate_percent: number | null
  jobs_completed_month: number
  revenue_summary: string | null
  customer_summary: string | null
  job_summary: string | null
  refresh_type: 'auto' | 'manual'
  created_at: string
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Computes one tenant's metrics from real tables. Revenue is defined from
 * orders.payment_status = 'paid', matching the existing (app)/dashboard/page.tsx
 * convention — not a separate invoices-based definition, which would
 * silently disagree with the number tenants already see on their main
 * dashboard.
 *
 * Plain lib function (not a 'use server' action) so both the tenant-facing
 * server action and the unauthenticated weekly cron route can call it
 * directly — this project's cron routes never import from lib/actions/*
 * (see recalculate-blog-metrics/route.ts's comment on why).
 */
export async function computeAnalyticsMetrics(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    { data: paidOrdersYtd },
    { data: paidOrdersLastMonth },
    { data: lineItems },
    { data: contacts },
    { data: interactions },
    { data: prevSnapshot },
  ] = await Promise.all([
    admin.from('orders').select('id, total_amount, created_at').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfYear.toISOString()),
    admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfLastMonth.toISOString()).lt('created_at', startOfMonth.toISOString()),
    admin.from('order_line_items').select('item_name_snapshot, quantity, unit_price, orders!inner(payment_status, created_at)').eq('tenant_id', tenantId).eq('orders.payment_status', 'paid').gte('orders.created_at', startOfYear.toISOString()),
    admin.from('contacts').select('id, status, created_at').eq('tenant_id', tenantId),
    admin.from('interactions').select('contact_id, occurred_at').eq('tenant_id', tenantId).order('occurred_at', { ascending: false }).limit(5000),
    admin.from('analytics_snapshots').select('customers_active').eq('tenant_id', tenantId).order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
  ])

  // ── Revenue ──────────────────────────────────────────────────────────
  const ytdRows = (paidOrdersYtd ?? []) as { id: string; total_amount: number; created_at: string }[]
  const revenue_ytd = ytdRows.reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
  const revenue_mtd = ytdRows.filter(o => new Date(o.created_at) >= startOfMonth).reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
  const lastMonthRevenue = ((paidOrdersLastMonth ?? []) as { total_amount: number }[]).reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
  const revenue_growth_percent = lastMonthRevenue > 0 ? Math.round(((revenue_mtd - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100 : null

  const trendByMonth = new Map<string, number>()
  for (const o of ytdRows) {
    const d = new Date(o.created_at)
    if (d < twelveMonthsAgo) continue
    const key = monthKey(d)
    trendByMonth.set(key, (trendByMonth.get(key) ?? 0) + (Number(o.total_amount) || 0))
  }
  const revenue_monthly_trend: { month: string; revenue: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    revenue_monthly_trend.push({ month: d.toLocaleString('default', { month: 'short' }), revenue: trendByMonth.get(monthKey(d)) ?? 0 })
  }

  const byService = new Map<string, number>()
  for (const li of (lineItems ?? []) as { item_name_snapshot: string; quantity: number; unit_price: number }[]) {
    const amt = (Number(li.quantity) || 0) * (Number(li.unit_price) || 0)
    byService.set(li.item_name_snapshot, (byService.get(li.item_name_snapshot) ?? 0) + amt)
  }
  const revenue_by_service = [...byService.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ── Customers ────────────────────────────────────────────────────────
  const allContacts = (contacts ?? []) as { id: string; status: string; created_at: string }[]
  const lastActivity = new Map<string, string>()
  for (const row of (interactions ?? []) as { contact_id: string; occurred_at: string }[]) {
    if (!lastActivity.has(row.contact_id)) lastActivity.set(row.contact_id, row.occurred_at) // first hit per id = most recent, rows are desc-ordered
  }

  const activeContacts = allContacts.filter(c => c.status === 'active')
  const customers_active = activeContacts.length
  const customers_new_month = allContacts.filter(c => new Date(c.created_at) >= startOfMonth).length
  const customers_inactive_30d = activeContacts.filter(c => {
    const last = lastActivity.get(c.id) ?? c.created_at // no interactions yet → fall back to when they were added
    return new Date(last) < thirtyDaysAgo
  }).length

  // Retention needs a prior period to compare against — only meaningful
  // once a previous snapshot exists (this is itself a snapshot table, so
  // "last month" isn't derivable from contacts.status alone without one).
  const prevActive = (prevSnapshot as { customers_active: number } | null)?.customers_active
  const retention_rate_percent = prevActive && prevActive > 0
    ? Math.round(((customers_active - customers_new_month) / prevActive) * 10000) / 100
    : null

  // ── Jobs ─────────────────────────────────────────────────────────────
  // No completed_at column exists on orders (job_status is a bare enum
  // with no transition history), so this counts orders created this month
  // that are currently in 'completed' status — a proxy, not a true
  // "completed this month" count. Documented in the dashboard UI too.
  const { count: jobs_completed_month } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('job_status', 'completed')
    .gte('created_at', startOfMonth.toISOString())

  return {
    revenue_mtd, revenue_ytd, revenue_growth_percent, revenue_monthly_trend, revenue_by_service,
    customers_active, customers_new_month, customers_inactive_30d, retention_rate_percent,
    jobs_completed_month: jobs_completed_month ?? 0,
  }
}

const INSIGHTS_SYSTEM_PROMPT = `You are a business analyst summarizing metrics for a small local service business owner.
Write 1-2 sentences per section: professional, factual, no hype or superlatives, no invented numbers beyond what's given.
If a figure is null/unavailable, don't guess at it — just don't mention it.
Respond with ONLY raw JSON, no markdown fences, no commentary: {"revenue": "<string>", "customer": "<string>", "job": "<string>"}`

export async function generateAnalyticsInsights(m: Awaited<ReturnType<typeof computeAnalyticsMetrics>>): Promise<{ revenue: string; customer: string; job: string }> {
  const userPrompt = `Revenue: MTD $${m.revenue_mtd.toFixed(2)}, YTD $${m.revenue_ytd.toFixed(2)}${m.revenue_growth_percent !== null ? `, ${m.revenue_growth_percent}% vs last month` : ''}.
Customers: ${m.customers_active} active, ${m.customers_new_month} new this month, ${m.customers_inactive_30d} inactive 30+ days.
Jobs: ${m.jobs_completed_month} completed this month.`

  try {
    const raw = await callDeepSeekChat(
      [{ role: 'system', content: INSIGHTS_SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      { maxTokens: 300, temperature: 0.3 },
    )
    const parsed = JSON.parse(raw) as { revenue?: unknown; customer?: unknown; job?: unknown }
    if (typeof parsed.revenue !== 'string' || typeof parsed.customer !== 'string' || typeof parsed.job !== 'string') {
      throw new Error('malformed insights response')
    }
    return { revenue: parsed.revenue, customer: parsed.customer, job: parsed.job }
  } catch {
    // Best-effort — a summary failure shouldn't block showing the real numbers.
    return { revenue: '', customer: '', job: '' }
  }
}
