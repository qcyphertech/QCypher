import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Initiates Stripe Connect OAuth. Tenant owner clicks "Connect Stripe" in
// Settings > Payment Settings → hits this route → redirected to Stripe.
// Mirrors api/cal/connect's pattern (state cookie for CSRF, redirect to
// provider's authorize URL).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.APP_URL!))

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?stripe_error=not_owner`)
  }

  const state = crypto.randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('stripe_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/',
  })

  const params = new URLSearchParams({
    client_id:     process.env.STRIPE_CLIENT_ID!,
    redirect_uri:  `${process.env.APP_URL}/api/oauth/stripe/callback`,
    response_type: 'code',
    scope:         'read_write',
    state,
  })

  return NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  )
}
