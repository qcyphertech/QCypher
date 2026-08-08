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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; sort?: string; page?: string }
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

  query = sort === 'name'
    ? query.order('name', { ascending: true })
    : query.order('created_at', { ascending: false })

  const { data: tenants, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  // Unfiltered total, for the "N client workspaces" header — cheap head-only count.
  const { count: totalClients } = await admin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', false)

  return (
    <AdminDashboard
      tenants={tenants ?? []}
      totalClients={totalClients ?? 0}
      filteredCount={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      isSuperAdmin={isSuperAdmin}
    />
  )
}
