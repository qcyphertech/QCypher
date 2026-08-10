import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptPaymentToken } from '@/lib/payments-encrypt'

// Resolves which Helcim api-token to use for a checkout: the tenant's own
// connected account if they have one, otherwise QCypher's platform key as a
// fallback so payments keep working for tenants who haven't connected yet.
export async function resolveHelcimApiKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
  tenantId: string,
): Promise<string | null> {
  const { data } = await db
    .from('tenant_payment_accounts')
    .select('provider, is_connected, api_key_enc')
    .eq('tenant_id', tenantId)
    .eq('provider', 'helcim')
    .eq('is_connected', true)
    .maybeSingle()

  if (data?.api_key_enc) {
    try {
      return decryptPaymentToken(data.api_key_enc)
    } catch (e) {
      console.error('[resolveHelcimApiKey] decrypt failed', e instanceof Error ? e.message : e)
    }
  }

  return process.env.HELCIM_API_KEY ?? null
}

// Verifies a Helcim "Connected Account" webhook (fired when a merchant
// completes signup through the Connected Account Registrations referral
// flow). This is a different mechanism from the payment-webhook
// verifierToken-in-body pattern (see app/paymentcallback/route.ts) — it
// follows the Standard Webhooks convention: webhook-id / webhook-timestamp
// headers plus an HMAC-SHA256 signature over "id.timestamp.body", keyed by
// the base64-decoded Verifier Token issued when enrolling in Helcim's
// Integration Partner Program.
export function verifyHelcimConnectWebhook(
  webhookId: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string,
): boolean {
  const verifier = process.env.HELCIM_CONNECT_VERIFIER_TOKEN ?? ''
  if (!verifier || !webhookId || !timestamp || !signatureHeader) return false

  let key: Buffer
  try {
    key = Buffer.from(verifier, 'base64')
  } catch {
    return false
  }

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', key).update(signedContent).digest('base64')

  // Standard Webhooks format: space-separated "v1,<base64sig>" pairs
  // (supports key rotation) — check every candidate signature.
  const candidates = signatureHeader.split(' ').map(part => part.split(',')[1]).filter(Boolean)
  return candidates.some(sig => {
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(sig)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}
