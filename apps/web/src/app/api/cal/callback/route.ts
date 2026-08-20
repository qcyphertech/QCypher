import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/cal-encrypt'
import { cookies } from 'next/headers'

// Cal.com redirects here after the user authorizes.
// Exchanges the code for tokens and saves them encrypted per tenant.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState  = cookieStore.get('cal_oauth_state')?.value
  cookieStore.delete('cal_oauth_state')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=access_denied`)
  }
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=state_mismatch`)
  }

  // Everything past this point can throw (bad/missing env vars, a malformed
  // Cal.com response, an encryption key misconfigured in this environment,
  // etc.) — without a catch here, an uncaught exception crashes the
  // function mid-response instead of producing a normal HTTP response,
  // which shows up in the browser as ERR_INVALID_RESPONSE rather than a
  // readable error. Redirect with a diagnosable error code instead.
  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://app.cal.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     process.env.CAL_CLIENT_ID!,
        client_secret: process.env.CAL_CLIENT_SECRET!,
        redirect_uri:  `${process.env.APP_URL}/api/cal/callback`,
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=token_exchange`)
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Fetch Cal.com user profile to get userId and username
    const profileRes = await fetch('https://api.cal.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const profile = profileRes.ok ? await profileRes.json() : {}
    const calUserId  = String(profile?.data?.id   ?? profile?.id   ?? '')
    const calUsername = profile?.data?.username ?? profile?.username ?? ''

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${process.env.APP_URL}/auth/login`)

    // tenant_id comes from the JWT claim set during onboarding
    const tenantId = (user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id) as string
    if (!tenantId) return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=no_tenant`)

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Upsert into tenant_integrations (service role not required — user is authenticated
    // and RLS policy allows writes scoped to their own tenant_id)
    const { error: dbErr } = await supabase.from('tenant_integrations').upsert({
      tenant_id:         tenantId,
      provider:          'cal_com',
      access_token_enc:  encryptToken(access_token),
      refresh_token_enc: refresh_token ? encryptToken(refresh_token) : null,
      token_expires_at:  expiresAt,
      cal_user_id:       calUserId,
      cal_username:      calUsername,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'tenant_id,provider' })

    if (dbErr) {
      console.error('[cal/callback] db error', dbErr)
      return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=save_failed`)
    }

    return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_connected=1`)
  } catch (err) {
    console.error('[cal/callback] unhandled error', err)
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?cal_error=unexpected`)
  }
}
