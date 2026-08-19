/**
 * POST /api/admin/invite
 * Creates a new tenant + sends an invite link.
 * Restricted to Tenant #0 (is_admin = true). Uses service_role for user provisioning.
 * This is one of the two legitimate server-side service_role uses (the other is scripts/).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { rateLimit, LIMITS } from '@/lib/rate-limit'
import { getIp } from '@/lib/get-ip'
import { isSuperAdminUser } from '@/lib/auth/superadmin'

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdmin(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  // Rate limit
  const rl = rateLimit(`invite:${getIp(request)}`, LIMITS.invite_accept)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Auth: caller must be authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is authorized: DB-backed super admin flag, OR the legacy
  // Tenant #0 (is_admin=true) gating, kept for backward compat.
  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)

  const { data: callerTenant } = await supabase.from('tenants').select('is_admin').single()
  if (!isSuperAdmin && !callerTenant?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, slug, email, referredByTenantId } = await request.json() as { name: string; slug: string; email: string; referredByTenantId?: string }
  if (!name?.trim() || !slug?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'name, slug, and email are required' }, { status: 400 })
  }

  if (referredByTenantId) {
    const { data: referrer } = await admin.from('tenants').select('id').eq('id', referredByTenantId).maybeSingle()
    if (!referrer) return NextResponse.json({ error: 'referredByTenantId does not match an existing tenant' }, { status: 400 })
  }

  // Pre-check for an existing account before provisioning a whole tenant
  const normalizedEmail = email.trim().toLowerCase()
  const { data: { users: existingUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (existingUsers.some(u => u.email?.toLowerCase() === normalizedEmail)) {
    return NextResponse.json(
      { error: 'That email already has an account. Ask them to sign in, or use a different email for this tenant.' },
      { status: 409 },
    )
  }

  // 1. Create tenant row
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      ...(referredByTenantId ? { referred_by_tenant_id: referredByTenantId } : {}),
    } as never)
    .select('id')
    .single()

  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message }, { status: 422 })
  }

  // 2. Send invite — Supabase Auth sets a magic link; we stamp app_metadata after
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '') ?? 'http://localhost:3011'
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
    redirectTo: `${appUrl}/auth/confirm`,
    data: { tenant_id: tenant.id },
  })

  if (inviteErr) {
    // Roll back tenant creation
    await admin.from('tenants').delete().eq('id', tenant.id)
    if (inviteErr.message.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'That email already has an account. Ask them to sign in, or use a different email for this tenant.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: inviteErr.message }, { status: 422 })
  }

  // 3. Stamp tenant_id into app_metadata so auth.tenant_id() resolves correctly
  // in RLS. needs_credential_setup forces the invitee through /auth/complete-signup
  // (Google link or password creation) before they can use the app — the invite
  // magic link alone authenticates them but never makes them prove they can log
  // back in on their own, which this closes.
  await admin.auth.admin.updateUserById(invite.user.id, {
    app_metadata: { tenant_id: tenant.id, needs_credential_setup: true },
  })

  // 4. Record the tenant referral (Layer 2 loyalty) — tracked for manual fulfillment
  if (referredByTenantId) {
    await admin.from('tenant_referrals').insert({
      referrer_tenant_id: referredByTenantId,
      referred_tenant_id: tenant.id,
    } as never)
  }

  return NextResponse.json({ tenantId: tenant.id, email: invite.user.email })
}
