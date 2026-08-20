import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/cal-encrypt'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState  = cookieStore.get('gcal_oauth_state')?.value
  cookieStore.delete('gcal_oauth_state')

  if (error || !code) {
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=access_denied`)
  }
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=state_mismatch`)
  }

  // Everything past this point can throw (bad/missing env vars, a malformed
  // Google response, an encryption key that isn't actually 64 hex chars in
  // this environment, etc.) — without a catch here, an uncaught exception
  // crashes the function mid-response instead of producing a normal HTTP
  // response, which shows up in the browser as ERR_INVALID_RESPONSE rather
  // than a readable error. Redirect with a diagnosable error code instead.
  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${process.env.APP_URL}/api/google-cal/callback`,
        grant_type:    'authorization_code',
      }),
    })

    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok || !tokenBody.access_token) {
      console.error('[google-cal/callback] token exchange failed', JSON.stringify(tokenBody))
      const reason = tokenBody.error ?? 'token_exchange'
      return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=${encodeURIComponent(reason)}`)
    }

    const { access_token, refresh_token, expires_in } = tokenBody

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${process.env.APP_URL}/auth/login`)

    const tenantId = (user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id) as string
    if (!tenantId) return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=no_tenant`)

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { error: dbErr } = await supabase.from('tenant_integrations').upsert({
      tenant_id:         tenantId,
      provider:          'google_calendar',
      access_token_enc:  encryptToken(access_token),
      refresh_token_enc: refresh_token ? encryptToken(refresh_token) : null,
      token_expires_at:  expiresAt,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'tenant_id,provider' })

    if (dbErr) {
      console.error('[google-cal/callback] db error', dbErr)
      return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=save_failed`)
    }

    // Trigger an immediate sync so events appear right away
    await syncGoogleEvents(tenantId, access_token, supabase)

    return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_connected=1`)
  } catch (err) {
    console.error('[google-cal/callback] unhandled error', err)
    // TEMPORARY: surfaces the actual error message in the redirect so we
    // can diagnose a live production failure without log access. Revert
    // to a plain "unexpected" code once diagnosed — never ship this long
    // term, error messages can leak internal detail.
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(`${process.env.APP_URL}/calendar?gcal_error=${encodeURIComponent(msg.slice(0, 200))}`)
  }
}

async function syncGoogleEvents(tenantId: string, accessToken: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', maxResults: '250' }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return

    const data = await res.json()
    const items = (data.items ?? []) as Record<string, unknown>[]

    const rows = items
      .filter(e => (e.status as string) !== 'cancelled')
      .map(e => {
        const start = (e.start as Record<string, string>)
        const end   = (e.end   as Record<string, string>)
        const allDay = !!start?.date
        return {
          tenant_id:   tenantId,
          gcal_id:     e.id as string,
          title:       (e.summary as string) ?? '(No title)',
          description: (e.description as string) ?? null,
          starts_at:   allDay ? `${start.date}T00:00:00Z` : start?.dateTime ?? null,
          ends_at:     allDay ? `${end.date}T00:00:00Z`   : end?.dateTime   ?? null,
          all_day:     allDay,
          status:      (e.status ?? 'confirmed') as string,
          fetched_at:  new Date().toISOString(),
        }
      })

    if (rows.length) {
      await supabase.from('google_calendar_events')
        .upsert(rows, { onConflict: 'tenant_id,gcal_id' })
    }
  } catch (err) {
    console.error('[google-cal] sync error', err)
  }
}
