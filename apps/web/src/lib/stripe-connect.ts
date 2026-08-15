import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptPaymentToken } from '@/lib/payments-encrypt'

// Resolves the tenant's connected Stripe account ID. Callers authenticate
// Stripe API calls with the PLATFORM's own STRIPE_SECRET_KEY plus a
// Stripe-Account header set to this accountId — not the stored OAuth
// access token directly. Standard Connect accounts are full, independent
// Stripe accounts, and objects created via their own OAuth token as a
// bearer credential aren't reliably forwarded to the platform's Connect
// webhooks; the platform-key + Stripe-Account pattern is what makes those
// objects (and their events) belong to the platform's Connect integration,
// which is what the /api/webhooks/stripe-connect endpoint depends on.
// The decrypted access token is still returned (some future flow may need
// it), but initStripeCheckout/confirmStripePayment in portal.ts no longer
// use it. Unlike Helcim there's no platform fallback key — a tenant must
// connect their own Stripe account before this payment option appears.
export async function resolveStripeAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
  tenantId: string,
): Promise<{ accessToken: string; accountId: string } | null> {
  const { data } = await db
    .from('tenant_payment_accounts')
    .select('provider, is_connected, access_token_enc, provider_account_id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'stripe')
    .eq('is_connected', true)
    .maybeSingle()

  if (!data?.access_token_enc || !data.provider_account_id) return null

  try {
    return { accessToken: decryptPaymentToken(data.access_token_enc), accountId: data.provider_account_id }
  } catch (e) {
    console.error('[resolveStripeAccount] decrypt failed', e instanceof Error ? e.message : e)
    return null
  }
}
