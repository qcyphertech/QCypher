'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/actions/audit'
import { revalidatePath } from 'next/cache'

export type PaymentAccount = {
  provider: 'stripe' | 'helcim'
  is_connected: boolean
  connected_at: string | null
  account_holder_name: string | null
  account_email: string | null
} | null

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage the payment account')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin }
}

export async function getPaymentAccountStatus(): Promise<PaymentAccount> {
  const { tenantId, admin } = await requireOwnerCaller()
  const { data } = await admin
    .from('tenant_payment_accounts')
    .select('provider, is_connected, connected_at, account_holder_name, account_email')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as PaymentAccount) ?? null
}

export async function disconnectPaymentAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin } = await requireOwnerCaller()

  const { data: existing } = await admin
    .from('tenant_payment_accounts')
    .select('provider, access_token_enc')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!existing) return { ok: false, error: 'No payment account connected' }

  // Best-effort token revocation with the provider — a failure here
  // shouldn't block the tenant from disconnecting on our end.
  if (existing.provider === 'stripe' && existing.access_token_enc) {
    try {
      const { decryptPaymentToken } = await import('@/lib/payments-encrypt')
      const accessToken = decryptPaymentToken(existing.access_token_enc)
      await fetch('https://connect.stripe.com/oauth/deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.STRIPE_CLIENT_ID ?? '',
          stripe_user_id: accessToken,
        }),
      })
    } catch (e) {
      console.error('[disconnectPaymentAccount] Stripe deauthorize failed', e instanceof Error ? e.message : e)
    }
  }

  await admin.from('tenant_payment_accounts').delete().eq('tenant_id', tenantId)

  await logAudit({
    action: 'payment_account_disconnected',
    resource_type: 'payment',
    resource_name: existing.provider,
  })

  revalidatePath('/settings')
  return { ok: true }
}
