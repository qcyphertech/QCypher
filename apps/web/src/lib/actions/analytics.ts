'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { computeAnalyticsMetrics, generateAnalyticsInsights, type AnalyticsSnapshot } from '@/lib/analytics'
import { revalidatePath } from 'next/cache'

export type { AnalyticsSnapshot }

// Next.js redacts any message thrown from a Server Action in production,
// replacing it with a generic "...omitted in production builds..." string
// plus a digest — by design, it can't tell a deliberate user-facing error
// (e.g. "try again in 24h") from an unexpected one that might leak DB/API
// internals. So refresh actions below return a discriminated result
// instead of throwing for expected conditions (the 24h cooldown); only
// genuinely unexpected failures still throw, and are fine to appear
// redacted since they're not meant to guide the user anyway.
export type RefreshResult =
  | { ok: true; snapshot: AnalyticsSnapshot }
  | { ok: false; error: string }

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

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { user, admin }
}

async function fetchLatestSnapshot(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
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
 * Shared refresh logic — rate-limited to once per rolling 24h per tenant,
 * regardless of whether the tenant owner or a super admin triggers it (the
 * cap exists to control DeepSeek cost per tenant, not to gate by actor). A
 * real DB check, not lib/rate-limit.ts's in-memory limiter (that one resets
 * on every cold start and can't enforce a 24h window) — mirrors
 * generateMyBlogDraft's cooldown check in lib/actions/blog.ts.
 */
async function refreshTenantAnalytics(admin: ReturnType<typeof createAdminClient>, tenantId: string, triggeredBy: string | null): Promise<RefreshResult> {
  const { data: recentManual } = await admin
    .from('analytics_snapshots')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('refresh_type', 'manual')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
  if ((recentManual?.length ?? 0) > 0) {
    return { ok: false, error: 'Analytics can be refreshed once every 24 hours — try again later' }
  }

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
      triggered_by: triggeredBy,
    }, { onConflict: 'tenant_id,snapshot_date' })
    .select('*')
    .single()

  // An actual DB failure here is unexpected (not something the user can
  // act on), so it's fine for this one to throw and surface redacted.
  if (error || !data) throw new Error(error?.message ?? 'Failed to save analytics snapshot')
  return { ok: true, snapshot: data as unknown as AnalyticsSnapshot }
}

export async function getLatestAnalyticsSnapshot(): Promise<AnalyticsSnapshot | null> {
  const { admin, tenantId } = await requireOwner()
  return fetchLatestSnapshot(admin, tenantId)
}

export async function refreshMyAnalytics(): Promise<RefreshResult> {
  const { user, admin, tenantId } = await requireOwner()
  const result = await refreshTenantAnalytics(admin, tenantId, user.id)
  if (result.ok) revalidatePath('/dashboard/analytics')
  return result
}

// ── Super-admin cross-tenant view (Admin > Analytics) ────────────────────

export async function getAnalyticsSnapshotForTenant(tenantId: string): Promise<AnalyticsSnapshot | null> {
  const { admin } = await requireSuperAdmin()
  return fetchLatestSnapshot(admin, tenantId)
}

export async function refreshAnalyticsForTenant(tenantId: string): Promise<RefreshResult> {
  const { user, admin } = await requireSuperAdmin()
  const result = await refreshTenantAnalytics(admin, tenantId, user.id)
  if (result.ok) revalidatePath('/admin')
  return result
}
