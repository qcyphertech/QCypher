import { createClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/cal-encrypt'

// Access tokens are short-lived (~1hr). Refresh a bit early so a slow
// request doesn't race the expiry.
const REFRESH_BUFFER_MS = 2 * 60 * 1000

export async function getValidGoogleAccessToken(tenantId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('tenant_integrations')
    .select('access_token_enc, refresh_token_enc, token_expires_at')
    .eq('tenant_id', tenantId)
    .eq('provider', 'google_calendar')
    .maybeSingle()

  if (!row?.access_token_enc) return null

  const stillValid = row.token_expires_at
    ? new Date(row.token_expires_at).getTime() - REFRESH_BUFFER_MS > Date.now()
    : false

  if (stillValid) return decryptToken(row.access_token_enc)
  if (!row.refresh_token_enc) return null

  const refreshToken = decryptToken(row.refresh_token_enc)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })
  const body = await res.json()
  if (!res.ok || !body.access_token) {
    console.error('[google-calendar-token] refresh failed', JSON.stringify(body))
    return null
  }

  const expiresAt = body.expires_in
    ? new Date(Date.now() + body.expires_in * 1000).toISOString()
    : null

  await supabase.from('tenant_integrations').update({
    access_token_enc: encryptToken(body.access_token),
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('tenant_id', tenantId).eq('provider', 'google_calendar')

  return body.access_token as string
}
