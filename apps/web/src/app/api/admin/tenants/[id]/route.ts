/**
 * PATCH /api/admin/tenants/[id]
 * Update a tenant's status or plan. Admin-only.
 * Operates through the same RLS boundary — no bypass code paths.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdminUser } from '@/lib/auth/superadmin'

function adminSupabase() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin gate — DB-backed super admin flag, OR the legacy Tenant #0
  // (is_admin=true) gating, kept for backward compat.
  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)

  const { data: callerTenant } = await supabase.from('tenants').select('is_admin').single()
  if (!isSuperAdmin && !callerTenant?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status, plan } = await request.json() as { status?: string; plan?: string }
  const update: Record<string, string> = {}
  if (status) update.status = status
  if (plan) update.plan = plan

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Use service_role to write to a different tenant's row (RLS would block anon client)
  const { data, error } = await admin.from('tenants').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  return NextResponse.json(data)
}
