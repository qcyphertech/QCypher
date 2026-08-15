import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptPaymentToken } from '@/lib/payments-encrypt'

// Resolves the tenant's connected Stripe account — the OAuth access token
// Standard Connect issues acts as a direct, scoped API key for that
// account, so calling the Stripe API with it as the Bearer token creates
// resources (Checkout Sessions, etc.) directly in the tenant's own
// account. No platform key or Connect header needed. Unlike Helcim there's
// no platform fallback key — a tenant must connect their own Stripe
// account before this payment option appears.
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
