import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyHelcimConnectWebhook } from '@/lib/helcim-connect'
import { encryptPaymentToken } from '@/lib/payments-encrypt'

// Helcim POSTs here when a tenant completes signup through the Connected
// Account Registrations referral flow (see api/oauth/helcim/connect).
// Payload: { apiToken, event: "approved", connectedAccountId }, where
// connectedAccountId is the `cid` we originally sent — this tenant's id.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const webhookId = req.headers.get('webhook-id') ?? ''
  const timestamp = req.headers.get('webhook-timestamp') ?? ''
  const signature = req.headers.get('webhook-signature') ?? ''

  if (!verifyHelcimConnectWebhook(webhookId, timestamp, rawBody, signature)) {
    console.error('[helcim-connected-account] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { apiToken?: string; event?: string; connectedAccountId?: string }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.event !== 'approved' || !event.apiToken || !event.connectedAccountId) {
    // Acknowledge non-approval events (e.g. declined) without erroring —
    // nothing to store, but Helcim shouldn't retry a no-op.
    return NextResponse.json({ ok: true })
  }

  const tenantId = event.connectedAccountId
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await admin.from('tenant_payment_accounts').upsert({
    tenant_id:            tenantId,
    provider:             'helcim',
    provider_account_id:  event.connectedAccountId,
    api_key_enc:          encryptPaymentToken(event.apiToken),
    is_connected:         true,
    connected_at:         now,
    last_verified_at:     now,
    updated_at:           now,
  }, { onConflict: 'tenant_id' })

  if (error) {
    console.error('[helcim-connected-account] db error', error)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }

  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: null,
    user_email: 'system',
    action: 'payment_account_connected',
    resource_type: 'payment',
    resource_name: 'helcim',
  })

  return NextResponse.json({ ok: true })
}

// Helcim (like their payment webhooks) pings with GET to validate the URL
// when it's first registered.
export async function GET() {
  return NextResponse.json({ ok: true })
}
