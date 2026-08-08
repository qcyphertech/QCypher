import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin' }

function adminSupabase() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const PAGE_SIZE = 25

// Characters that would break the .or() filter-string syntax if left raw.
function sanitizeSearch(q: string) {
  return q.replace(/[,%]/g, ' ').trim().slice(0, 100)
}

// Only accept a clean YYYY-MM-DD from the date inputs.
function sanitizeDate(d?: string) {
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; plan?: string; from?: string; to?: string; sort?: string; page?: string }
}) {
  // Auth via RLS-scoped client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Gate: DB-backed super admin flag (app_metadata.is_super_admin), OR
  // caller's own tenant has is_admin=true (the original Tenant #0 gating,
  // kept for backward compat)
  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)

  const { data: callerTenant } = await supabase.from('tenants').select('is_admin').single()
  if (!isSuperAdmin && !(callerTenant as { is_admin?: boolean } | null)?.is_admin) {
    redirect('/contacts')
  }

  const q = sanitizeSearch(searchParams.q ?? '')
  const status = searchParams.status ?? 'all'
  const plan = searchParams.plan ?? 'all'
  const from = sanitizeDate(searchParams.from)
  const to = sanitizeDate(searchParams.to)
  const sort = searchParams.sort ?? 'newest'
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Server-side search + filter + pagination — this list is expected to grow
  // into the thousands, so we never pull the whole table to the client.
  let query = admin
    .from('tenants')
    .select('id, name, slug, plan, status, is_admin, created_at', { count: 'exact' })
    .eq('is_admin', false)

  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
  if (status !== 'all') query = query.eq('status', status)
  if (plan !== 'all') query = query.eq('plan', plan)
  if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)

  query = sort === 'name'
    ? query.order('name', { ascending: true })
    : sort === 'name_desc'
    ? query.order('name', { ascending: false })
    : sort === 'oldest'
    ? query.order('created_at', { ascending: true })
    : query.order('created_at', { ascending: false })

  const { data: tenants, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  // Unfiltered total, for the "N client workspaces" header — cheap head-only count.
  const { count: totalClients } = await admin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', false)

  // Distinct plan values actually in use, for the plan filter's option list.
  // `plan` is free-text (no fixed enum), so this is fetched rather than
  // hardcoded — capped rather than scanning the whole table, since in
  // practice the number of distinct plan tiers is small and shows up early.
  const { data: planRows } = await admin
    .from('tenants')
    .select('plan')
    .eq('is_admin', false)
    .limit(2000)
  const availablePlans = [...new Set((planRows ?? []).map(r => (r as { plan: string }).plan))].sort()

  return (
    <AdminDashboard
      tenants={tenants ?? []}
      totalClients={totalClients ?? 0}
      filteredCount={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      isSuperAdmin={isSuperAdmin}
      availablePlans={availablePlans}
    />
  )
}
