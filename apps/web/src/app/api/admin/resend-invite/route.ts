/**
 * POST /api/admin/resend-invite
 * A new-client invite dead-ends the client if they don't click it before
 * Supabase's own email-link expiry — and until now the only fix was
 * deleting their tenant and starting over, since /api/admin/invite always
 * creates a fresh tenant. This re-sends the invite to the SAME unconfirmed
 * account, which regenerates the link and resets its expiry, without
 * touching the tenant that's already been created.
 * Restricted the same way as /api/admin/invite.
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
  const rl = rateLimit(`resend-invite:${getIp(request)}`, LIMITS.invite_accept)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminSupabase()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const isSuperAdmin = isSuperAdminUser(fresh)
  const { data: callerTenant } = await supabase.from('tenants').select('is_admin').single()
  if (!isSuperAdmin && !callerTenant?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await request.json() as { email: string }
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  const normalizedEmail = email.trim().toLowerCase()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find(u => u.email?.toLowerCase() === normalizedEmail)

  if (!existing) {
    return NextResponse.json({ error: 'No pending invite found for that email.' }, { status: 404 })
  }

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const tenantId = existing.app_metadata?.tenant_id as string | undefined

  // "Confirmed" only means they clicked the invite link and got a session
  // from it once — Supabase's invite flow never actually prompts them to
  // set a password. If they've since lost that session (or never signed in
  // again), inviteUserByEmail on an already-confirmed user is a no-op, so
  // the only way to actually get them back in is a password-setup link.
  let kind: 'invite' | 'password_setup'
  if (existing.email_confirmed_at) {
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(existing.email!, {
      redirectTo: `${appUrl}/auth/confirm`,
    })
    if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 422 })
    kind = 'password_setup'
  } else {
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(existing.email!, {
      redirectTo: `${appUrl}/auth/confirm`,
      data: existing.app_metadata,
    })
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 422 })
    kind = 'invite'
  }

  if (tenantId) {
    await admin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: user.id,
      user_email: user.email ?? '',
      action: 'invite_sent',
      resource_type: 'team',
      resource_name: existing.email,
      details: { resend: true, kind },
    })
  }

  return NextResponse.json({ success: true, kind })
}
