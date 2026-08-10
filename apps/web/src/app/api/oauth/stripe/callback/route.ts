import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptPaymentToken } from '@/lib/payments-encrypt'
import { cookies } from 'next/headers'

// Stripe redirects here after the tenant authorizes. Exchanges the code for
// a scoped access token tied to the tenant's own Stripe account, then saves
// it encrypted. Mirrors api/cal/callback's pattern.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState  = cookieStore.get('stripe_oauth_state')?.value
  cookieStore.delete('stripe_oauth_state')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=access_denied`)
  }
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=state_mismatch`)
  }

  // Exchange code for a scoped access token — server-to-server, never
  // exposed to the browser.
  const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_secret: process.env.STRIPE_SECRET_KEY!,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[stripe/callback] token exchange failed', await tokenRes.text().catch(() => ''))
    return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=token_exchange`)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, stripe_user_id } = tokens

  // Fetch the connected account's display info
  let accountEmail: string | null = null
  let accountName: string | null = null
  try {
    const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${stripe_user_id}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    })
    if (acctRes.ok) {
      const acct = await acctRes.json()
      accountEmail = acct.email ?? null
      accountName = acct.business_profile?.name ?? acct.settings?.dashboard?.display_name ?? null
    }
  } catch (e) {
    console.error('[stripe/callback] account fetch failed', e instanceof Error ? e.message : e)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${process.env.APP_URL}/auth/login`)

  const tenantId = (user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id) as string
  if (!tenantId) return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=no_tenant`)

  const now = new Date().toISOString()
  const { error: dbErr } = await supabase.from('tenant_payment_accounts').upsert({
    tenant_id:            tenantId,
    provider:             'stripe',
    provider_account_id:  stripe_user_id,
    access_token_enc:     encryptPaymentToken(access_token),
    refresh_token_enc:    refresh_token ? encryptPaymentToken(refresh_token) : null,
    is_connected:         true,
    connected_at:         now,
    account_holder_name:  accountName,
    account_email:        accountEmail,
    last_verified_at:     now,
    updated_at:           now,
  }, { onConflict: 'tenant_id' })

  if (dbErr) {
    console.error('[stripe/callback] db error', dbErr)
    return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=save_failed`)
  }

  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    user_email: user.email ?? '',
    action: 'payment_account_connected',
    resource_type: 'payment',
    resource_name: 'stripe',
  })

  return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_connected=1`)
}
