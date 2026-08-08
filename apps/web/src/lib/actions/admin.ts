'use server'

/**
 * Phase 14 admin server actions.
 * All writes use the service-role client — this is intentional, these are
 * admin-only operations called from the /admin panel which is already gated
 * by is_admin=true on the caller's tenant.
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isSuperAdminUser } from '@/lib/auth/superadmin'

const SERVICE_NAMES = ['reviews', 'scheduler', 'missed_call', 'backup'] as const
export type ServiceName = typeof SERVICE_NAMES[number]

export type ServiceStat = {
  name: ServiceName
  label: string
  value: string        // human-readable metric
  status: 'active' | 'needs_attention'
  detail: string | null
}

export type ChecklistRow = {
  id: string
  service_name: ServiceName
  completed: boolean
  completed_at: string | null
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Verify caller is authorized — used as a gate in every action. Accepts
 * either the DB-backed super admin flag (app_metadata.is_super_admin,
 * used by tenantless super admin accounts) or the legacy Tenant #0
 * (is_admin=true) gating, kept for backward compat.
 */
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = adminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (isSuperAdminUser(fresh)) return user

  const { data: t } = await supabase.from('tenants').select('is_admin').single()
  if (!(t as { is_admin?: boolean } | null)?.is_admin) throw new Error('Forbidden')
  return user
}

// ── 14A: Services panel data ──────────────────────────────────────────────────

export async function getServiceStats(tenantId: string): Promise<ServiceStat[]> {
  await assertAdmin()
  const admin = adminClient()

  // Billing cycle = current calendar month
  const now = new Date()
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [reviewResult, missedResult, calResult] = await Promise.all([
    // Review-request SMS: send_log joined to templates where is_marketing=true
    admin
      .from('send_log')
      .select('id, templates!send_log_template_id_fkey(is_marketing)')
      .eq('tenant_id', tenantId)
      .eq('channel', 'sms')
      .eq('status', 'sent')
      .gte('sent_at', cycleStart),

    // Missed-call auto-texts: calls table, sms_sent=true
    admin
      .from('calls')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sms_sent', true)
      .gte('occurred_at', cycleStart),

    // Cal.com: row exists with non-null access_token_enc
    admin
      .from('tenant_integrations')
      .select('access_token_enc, updated_at')
      .eq('tenant_id', tenantId)
      .eq('provider', 'cal_com')
      .maybeSingle(),
  ])

  // Filter review sends to only is_marketing=true rows
  const reviewRows = (reviewResult.data ?? []).filter(
    (r: any) => r.templates?.is_marketing === true
  )
  const reviewCount = reviewRows.length

  const missedCount = (missedResult.data ?? []).length

  const calRow = calResult.data
  const calConnected = !!(calRow?.access_token_enc)

  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return [
    {
      name: 'reviews',
      label: 'Review Requests',
      value: `${reviewCount} sent`,
      status: reviewCount > 0 ? 'active' : 'needs_attention',
      detail: `This billing cycle (${monthLabel})`,
    },
    {
      name: 'scheduler',
      label: 'Online Scheduler',
      value: calConnected ? 'Connected' : 'Not connected',
      status: calConnected ? 'active' : 'needs_attention',
      detail: calConnected && calRow?.updated_at
        ? `Last synced ${new Date(calRow.updated_at).toLocaleDateString()}`
        : null,
    },
    {
      name: 'missed_call',
      label: 'Missed-Call Text-Back',
      value: `${missedCount} auto-texts`,
      status: missedCount > 0 ? 'active' : 'needs_attention',
      detail: `This billing cycle (${monthLabel})`,
    },
    {
      name: 'backup',
      label: 'Security & Backup',
      value: 'Managed by Supabase',
      status: 'active',
      detail: 'Daily automated backups via Supabase platform',
    },
  ]
}

// ── 14B: Ops checklist ────────────────────────────────────────────────────────

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function getChecklist(tenantId: string): Promise<ChecklistRow[]> {
  await assertAdmin()
  const admin = adminClient()
  const month = currentMonth()

  // Upsert default rows for this month so the checklist always has all 4 services
  await admin.from('service_checklist').upsert(
    SERVICE_NAMES.map(s => ({ tenant_id: tenantId, month, service_name: s, completed: false })),
    { onConflict: 'tenant_id,month,service_name', ignoreDuplicates: true },
  )

  const { data } = await admin
    .from('service_checklist')
    .select('id, service_name, completed, completed_at')
    .eq('tenant_id', tenantId)
    .eq('month', month)
    .order('service_name')

  return (data ?? []) as ChecklistRow[]
}

export async function toggleChecklist(
  rowId: string,
  tenantId: string,
  completed: boolean,
): Promise<void> {
  const user = await assertAdmin()
  const admin = adminClient()

  await admin.from('service_checklist').update({
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: completed ? user.id : null,
  }).eq('id', rowId)

  revalidatePath(`/admin/tenants/${tenantId}`)
}

// ── 14C: Monthly report data assembly ────────────────────────────────────────

export type ReportData = {
  tenantName: string
  month: string           // 'July 2026'
  reviewsSent: number
  missedCallTexts: number
  calConnected: boolean
  calUsername: string | null
  cycleStart: string      // ISO
  cycleEnd: string        // ISO
}

export async function assembleReportData(tenantId: string): Promise<ReportData> {
  await assertAdmin()
  const admin = adminClient()

  const now = new Date()
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const cycleEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const month      = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const [tenantResult, reviewResult, missedResult, calResult] = await Promise.all([
    admin.from('tenants').select('name').eq('id', tenantId).single(),
    admin.from('send_log')
      .select('id, templates!send_log_template_id_fkey(is_marketing)')
      .eq('tenant_id', tenantId)
      .eq('channel', 'sms')
      .eq('status', 'sent')
      .gte('sent_at', cycleStart)
      .lte('sent_at', cycleEnd),
    admin.from('calls')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sms_sent', true)
      .gte('occurred_at', cycleStart)
      .lte('occurred_at', cycleEnd),
    admin.from('tenant_integrations')
      .select('access_token_enc, cal_username')
      .eq('tenant_id', tenantId)
      .eq('provider', 'cal_com')
      .maybeSingle(),
  ])

  const reviewCount = (reviewResult.data ?? []).filter(
    (r: any) => r.templates?.is_marketing === true
  ).length

  return {
    tenantName:       (tenantResult.data as { name: string } | null)?.name ?? 'Your Business',
    month,
    reviewsSent:      reviewCount,
    missedCallTexts:  (missedResult.data ?? []).length,
    calConnected:     !!(calResult.data?.access_token_enc),
    calUsername:      calResult.data?.cal_username ?? null,
    cycleStart,
    cycleEnd,
  }
}
