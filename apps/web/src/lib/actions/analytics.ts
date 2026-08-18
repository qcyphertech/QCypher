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

// Now merged into /overview, which any tenant member can already see
// (income/expenses there have never been owner-gated) — matching that same
// access level rather than splitting the merged page's data by role.
async function requireTenantMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
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
 * Shared refresh logic — no rate limit (removed per explicit request; the
 * weekly auto-refresh still runs regardless, this is purely the on-demand
 * path). Each call is a real DeepSeek call, so this trades a small,
 * uncapped per-click cost for letting tenants refresh whenever they want.
 */
async function refreshTenantAnalytics(admin: ReturnType<typeof createAdminClient>, tenantId: string, triggeredBy: string | null): Promise<RefreshResult> {
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
  const { admin, tenantId } = await requireTenantMember()
  return fetchLatestSnapshot(admin, tenantId)
}

export async function refreshMyAnalytics(): Promise<RefreshResult> {
  const { user, admin, tenantId } = await requireTenantMember()
  const result = await refreshTenantAnalytics(admin, tenantId, user.id)
  if (result.ok) revalidatePath('/overview')
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
