'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { computeAnalyticsMetrics, generateAnalyticsInsights, type AnalyticsSnapshot } from '@/lib/analytics'
import { revalidatePath } from 'next/cache'

export type { AnalyticsSnapshot }

// Mirrors requireAdmin()'s role check in lib/actions/audit.ts — analytics
// exposes real revenue figures, so this is owner-only, not every non-read_only
// member (unlike e.g. blog.ts's requireTenantWriter).
async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = fresh?.app_metadata?.role ?? 'member'
  if (role !== 'owner') throw new Error('Only the workspace owner can view analytics')

  const tenantId = await getTenantId(user.id, fresh?.app_metadata)
  return { user, admin, tenantId }
}

export async function getLatestAnalyticsSnapshot(): Promise<AnalyticsSnapshot | null> {
  const { admin, tenantId } = await requireOwner()
  const { data } = await admin
    .from('analytics_snapshots')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as unknown as AnalyticsSnapshot | null
}

/**
 * On-demand refresh, rate-limited to once per rolling 24h — a real DB
 * check, not lib/rate-limit.ts's in-memory limiter (that one resets on
 * every cold start and can't enforce a 24h window). Mirrors
 * generateMyBlogDraft's cooldown check in lib/actions/blog.ts.
 */
export async function refreshMyAnalytics(): Promise<AnalyticsSnapshot> {
  const { user, admin, tenantId } = await requireOwner()

  const { data: recentManual } = await admin
    .from('analytics_snapshots')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('refresh_type', 'manual')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
  if ((recentManual?.length ?? 0) > 0) throw new Error('Analytics can be refreshed once every 24 hours — try again later')

  const metrics = await computeAnalyticsMetrics(admin, tenantId)
  const insights = await generateAnalyticsInsights(metrics)

  const { data, error } = await admin
    .from('analytics_snapshots')
    .upsert({
      tenant_id: tenantId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      ...metrics,
      revenue_summary: insights.revenue || null,
      customer_summary: insights.customer || null,
      job_summary: insights.job || null,
      refresh_type: 'manual',
      triggered_by: user.id,
    }, { onConflict: 'tenant_id,snapshot_date' })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save analytics snapshot')
  revalidatePath('/dashboard/analytics')
  return data as unknown as AnalyticsSnapshot
}
