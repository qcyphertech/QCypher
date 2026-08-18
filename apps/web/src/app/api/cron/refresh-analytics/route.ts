import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAnalyticsMetrics, generateAnalyticsInsights } from '@/lib/analytics'

// Weekly analytics_snapshots refresh for every tenant. No pg_cron — this
// project deliberately uses Vercel Cron + CRON_SECRET for every scheduled
// job (see purge-audit-logs for the same pattern), scheduled in vercel.json.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: tenants } = await admin.from('tenants').select('id').is('deleted_at', null)
  let tenantsUpdated = 0

  for (const t of tenants ?? []) {
    try {
      const metrics = await computeAnalyticsMetrics(admin, t.id)
      const insights = await generateAnalyticsInsights(metrics)
      const { error } = await admin.from('analytics_snapshots').upsert({
        tenant_id: t.id,
        snapshot_date: new Date().toISOString().slice(0, 10),
        ...metrics,
        revenue_summary: insights.revenue || null,
        customer_summary: insights.customer || null,
        job_summary: insights.job || null,
        refresh_type: 'auto',
        triggered_by: null,
      }, { onConflict: 'tenant_id,snapshot_date' })
      if (!error) tenantsUpdated++
    } catch {
      // one tenant failing (e.g. a DeepSeek hiccup) shouldn't block the rest
    }
  }

  return NextResponse.json({ ok: true, tenantsUpdated })
}
