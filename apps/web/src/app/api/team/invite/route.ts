import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { rateLimit, LIMITS } from '@/lib/rate-limit'
import { getIp } from '@/lib/get-ip'

export async function POST(request: NextRequest) {
  const rl = rateLimit(`team-invite:${getIp(request)}`, LIMITS.invite_accept)
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use admin to read current app_metadata — avoids stale-JWT issue for OAuth users
  const admin = createAdminClient()
  const { data: { user: freshUser } } = await admin.auth.admin.getUserById(user.id)
  const callerRole = freshUser?.app_metadata?.role
  if (callerRole !== 'owner') {
    return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
  }

  const tenant_id = freshUser?.app_metadata?.tenant_id as string | undefined
  if (!tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { email, role = 'member' } = await request.json() as { email: string; role?: string }
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!['owner', 'member', 'read_only'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

  // Pre-check for an existing account — more reliable than string-matching
  // inviteUserByEmail's error message, and avoids creating an orphaned
  // invite_tokens row for an invite we already know will fail.
  const { data: { users: existingUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (existingUsers.some(u => u.email?.toLowerCase() === normalizedEmail)) {
    return NextResponse.json(
      { error: 'That email already has an account. Ask them to sign in instead.' },
      { status: 409 },
    )
  }

  // Record the pending invite
  const { data: token, error: tokenErr } = await admin
    .from('invite_tokens')
    .insert({ tenant_id, email: normalizedEmail })
    .select('token')
    .single()

  if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 422 })

  // Send Supabase magic link — stamps tenant_id + role into app_metadata on accept
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
    redirectTo: `${appUrl}/auth/confirm`,
    data: { tenant_id, role },
  })

  if (inviteErr) {
    // Clean up the token if invite failed
    await admin.from('invite_tokens').delete().eq('token', token.token)

    // Fallback in case the account was created between the pre-check and here
    if (inviteErr.message.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'That email already has an account. Ask them to sign in instead.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: inviteErr.message }, { status: 422 })
  }

  // Stamp app_metadata on the newly created invite user
  const { data: { users } } = await admin.auth.admin.listUsers()
  const invited = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
  if (invited) {
    await admin.auth.admin.updateUserById(invited.id, {
      app_metadata: { tenant_id, role, provider: 'email', providers: ['email'], needs_credential_setup: true },
    })
  }

  await admin.from('audit_logs').insert({
    tenant_id,
    user_id: user.id,
    user_email: user.email ?? '',
    action: 'invite_sent',
    resource_type: 'team',
    resource_name: email.trim(),
    details: { role },
  })

  return NextResponse.json({ success: true, token: token.token })
}
