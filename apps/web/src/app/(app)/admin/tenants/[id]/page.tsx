import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getServiceStats, getChecklist } from '@/lib/actions/admin'
import { getTeamMembers, getPendingInvites } from '@/lib/actions/team'
import { TenantDetail } from '@/components/admin/TenantDetail'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tenant Detail — Admin' }

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)

  const { data: callerTenant } = await supabase.from('tenants').select('is_admin').single()
  if (!isSuperAdmin && !(callerTenant as { is_admin?: boolean } | null)?.is_admin) redirect('/contacts')

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, plan, status, created_at')
    .eq('id', params.id)
    .single()

  if (!tenant) notFound()

  const [stats, checklist, members, pendingInvites] = await Promise.all([
    getServiceStats(params.id),
    getChecklist(params.id),
    getTeamMembers(params.id),
    getPendingInvites(params.id),
  ])

  return (
    <TenantDetail
      tenant={tenant as any}
      stats={stats}
      checklist={checklist}
      members={members}
      pendingInvites={pendingInvites}
      currentUserId={user.id}
    />
  )
}
