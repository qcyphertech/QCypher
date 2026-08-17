'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderNeutralEmail } from '@/lib/email/neutral'
import { sendSms } from '@/lib/telnyx'
import { revalidatePath } from 'next/cache'
import type { Json } from '@qcypher/db'

export type PaymentRequest = {
  id: string
  token: string
  order_id: string
  amount: number
  status: 'active' | 'paid' | 'expired' | 'cancelled'
  sent_via: string | null
  created_at: string
  expires_at: string
  paid_at: string | null
}

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can generate payment links')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, email: user.email ?? '', tenantId, admin }
}

async function logPaymentAudit(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  userId: string,
  action: 'payment_link_created' | 'payment_link_sent',
  orderId: string,
  details?: Record<string, unknown>,
) {
  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    user_email: user?.email ?? '',
    action,
    resource_type: 'payment',
    resource_id: orderId,
    details: (details ?? null) as Json | null,
  })
}

// Creates the payment_requests row if one doesn't already exist for this
// order (unique on order_id — reused across resends), returns the pay URL.
async function getOrCreatePaymentRequest(admin: ReturnType<typeof createAdminClient>, input: {
  tenantId: string; orderId: string; contactId: string; amount: number; userId: string
}): Promise<PaymentRequest> {
  const { data: existing } = await admin.from('payment_requests').select('*').eq('order_id', input.orderId).maybeSingle()
  if (existing && existing.status === 'active') return existing as PaymentRequest

  const { data, error } = await admin
    .from('payment_requests')
    .upsert({
      tenant_id: input.tenantId,
      order_id: input.orderId,
      contact_id: input.contactId,
      amount: input.amount,
      status: 'active',
      created_by: input.userId,
    }, { onConflict: 'order_id' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  await logPaymentAudit(admin, input.tenantId, input.userId, 'payment_link_created', input.orderId, { amount: input.amount })
  return data as PaymentRequest
}

async function loadOrderForRequest(admin: ReturnType<typeof createAdminClient>, tenantId: string, orderId: string) {
  const { data: order } = await admin
    .from('orders')
    .select('id, tenant_id, customer_id, total_amount, payment_status, contacts(first_name, last_name, email, phone)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single()
  if (!order) throw new Error('Order not found')
  if (order.payment_status === 'paid') throw new Error('This order is already paid')
  if (!order.customer_id) throw new Error('Order has no linked contact')
  return order as unknown as {
    id: string; tenant_id: string; customer_id: string; total_amount: number; payment_status: string
    contacts: { first_name: string; last_name: string | null; email: string | null; phone: string | null } | null
  }
}

export async function createPaymentLink(orderId: string): Promise<{ url: string }> {
  const { userId, tenantId, admin } = await requireOwnerCaller()
  const order = await loadOrderForRequest(admin, tenantId, orderId)

  const req = await getOrCreatePaymentRequest(admin, {
    tenantId, orderId: order.id, contactId: order.customer_id, amount: Number(order.total_amount), userId,
  })

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  return { url: `${appUrl}/pay/${req.token}` }
}

export async function sendPaymentLinkSms(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, tenantId, admin } = await requireOwnerCaller()
  const order = await loadOrderForRequest(admin, tenantId, orderId)
  const phone = order.contacts?.phone
  if (!phone) return { ok: false, error: 'This contact has no phone number' }

  const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
  const businessName = (tenant as { name?: string } | null)?.name ?? 'us'

  const req = await getOrCreatePaymentRequest(admin, {
    tenantId, orderId: order.id, contactId: order.customer_id, amount: Number(order.total_amount), userId,
  })
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const url = `${appUrl}/pay/${req.token}`

  const result = await sendSms({
    to: phone,
    body: `Hi ${order.contacts?.first_name ?? ''}, here's your invoice from ${businessName} for $${Number(order.total_amount).toFixed(2)}. Pay now: ${url}`,
  })
  if ('error' in result) return { ok: false, error: result.error }

  await admin.from('payment_requests').update({ sent_via: 'sms' }).eq('id', req.id)
  await logPaymentAudit(admin, tenantId, userId, 'payment_link_sent', order.id, { via: 'sms' })
  revalidatePath(`/contacts/${order.customer_id}`)
  return { ok: true }
}

export async function sendPaymentLinkEmail(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, tenantId, admin } = await requireOwnerCaller()
  const order = await loadOrderForRequest(admin, tenantId, orderId)
  const email = order.contacts?.email
  if (!email) return { ok: false, error: 'This contact has no email address' }

  const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
  const businessName = (tenant as { name?: string } | null)?.name ?? 'Your invoice'

  const req = await getOrCreatePaymentRequest(admin, {
    tenantId, orderId: order.id, contactId: order.customer_id, amount: Number(order.total_amount), userId,
  })
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const url = `${appUrl}/pay/${req.token}`

  const result = await sendEmail({
    to: email,
    subject: `Invoice from ${businessName}`,
    html: renderNeutralEmail({
      senderName: businessName,
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Your invoice is ready</p>
        <p style="margin:16px 0 0;">Hi ${order.contacts?.first_name ?? ''},</p>
        <p style="margin:16px 0 0;">Amount due: <strong>$${Number(order.total_amount).toFixed(2)}</strong></p>
        <p style="margin:16px 0 0;">Questions? Reply to this email.</p>
      `,
      cta: { label: 'Pay Now', href: url },
    }),
    text: `Your invoice from ${businessName} for $${Number(order.total_amount).toFixed(2)} is ready. Pay here: ${url}`,
  })
  if (!result.ok) return { ok: false, error: result.error }

  await admin.from('payment_requests').update({ sent_via: 'email' }).eq('id', req.id)
  await logPaymentAudit(admin, tenantId, userId, 'payment_link_sent', order.id, { via: 'email' })
  revalidatePath(`/contacts/${order.customer_id}`)
  return { ok: true }
}

export async function cancelPaymentLink(orderId: string) {
  const { tenantId, admin } = await requireOwnerCaller()
  await admin.from('payment_requests').update({ status: 'cancelled' }).eq('order_id', orderId).eq('tenant_id', tenantId)
  revalidatePath('/contacts')
}

// ─── Public pay page — no auth, the token is the auth ──────────────────────

export async function getPaymentRequestByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('payment_requests')
    .select('id, token, order_id, tenant_id, contact_id, amount, status, expires_at, orders(id, total_amount, payment_status, notes), contacts(first_name, last_name, email), tenants(name)')
    .eq('token', token)
    .maybeSingle()
  return data
}

export async function markPaymentRequestPaid(token: string) {
  const admin = createAdminClient()
  await admin.from('payment_requests').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('token', token)

  const { data: req } = await admin.from('payment_requests').select('tenant_id, order_id').eq('token', token).maybeSingle()
  if (req) {
    await admin.from('audit_logs').insert({
      tenant_id: req.tenant_id,
      user_id: null,
      user_email: 'system',
      action: 'payment_link_paid',
      resource_type: 'payment',
      resource_id: req.order_id,
      details: null,
    })
  }
}
