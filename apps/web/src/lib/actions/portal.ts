'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentConfirmationEmails } from '@/lib/email/payment-notify'
import { verifyHelcimTransaction } from '@/lib/helcim-verify'
import { resolveHelcimApiKey } from '@/lib/helcim-connect'
import { resolveStripeAccount } from '@/lib/stripe-connect'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ─── Magic-link generation ────────────────────────────────────────────────────

export async function sendPortalMagicLink(input: {
  contactId: string
  tenantId: string
  tenantSlug: string
  businessName: string
}) {
  const db = admin()
  const { data: contact } = await db
    .from('contacts')
    .select('email, first_name')
    .eq('id', input.contactId)
    .eq('tenant_id', input.tenantId)
    .single()

  if (!contact?.email) return { ok: false, error: 'Contact has no email address' }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h

  const { error } = await db.from('portal_magic_links').insert({
    tenant_id: input.tenantId,
    contact_id: input.contactId,
    token,
    expires_at: expiresAt,
  })
  if (error) return { ok: false, error: error.message }

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const link = `${appUrl}/portal/${input.tenantSlug}/auth?token=${token}`

  const body = [
    `Hi ${contact.first_name ?? 'there'},`,
    '',
    `${input.businessName} has invited you to their client portal where you can view your quotes, approve work, and pay invoices online.`,
    '',
    `Sign in here (link valid for 24 hours):`,
    link,
    '',
    `If you did not expect this email, you can safely ignore it.`,
    '',
    `— ${input.businessName}`,
  ].join('\n')

  const mailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${input.businessName} <${process.env.RESEND_FROM_EMAIL ?? 'hello@qcyphertech.com'}>`,
      to: [contact.email],
      subject: `${input.businessName} — view your quotes & invoices`,
      text: body,
    }),
  })
  if (!mailRes.ok) {
    const err = await mailRes.json().catch(() => ({}))
    return { ok: false, error: (err as { message?: string }).message ?? 'Failed to send email' }
  }
  return { ok: true }
}

// ─── Magic-link validation + session creation ─────────────────────────────────

export async function validateMagicLink(token: string): Promise<
  | { ok: true; sessionToken: string; tenantId: string; contactId: string; expiresAt: string }
  | { ok: false; error: string }
> {
  const db = admin()

  const { data: link } = await db
    .from('portal_magic_links')
    .select('id, tenant_id, contact_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!link) return { ok: false, error: 'not_found' }
  if (link.used_at) return { ok: false, error: 'already_used' }
  if (new Date(link.expires_at) < new Date()) return { ok: false, error: 'expired' }

  // Mark single-use
  await db.from('portal_magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id)

  // Create portal session (48h)
  const sessionToken = randomBytes(32).toString('hex')
  const sessionExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { error: sessErr } = await db.from('portal_sessions').insert({
    tenant_id: link.tenant_id,
    contact_id: link.contact_id,
    access_token: sessionToken,
    expires_at: sessionExpiry,
  })
  if (sessErr) return { ok: false, error: sessErr.message }

  return {
    ok: true,
    sessionToken,
    tenantId: link.tenant_id,
    contactId: link.contact_id,
    expiresAt: sessionExpiry,
  }
}

// ─── Portal session validation (called by every portal server component) ──────

export type PortalSession = {
  tenantId: string
  contactId: string
  tenantSlug: string
  businessName: string
  contactName: string
}

export async function validatePortalSession(
  sessionToken: string,
  tenantSlug: string,
): Promise<PortalSession | null> {
  const db = admin()

  // Look up tenant by slug
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) return null

  // Validate session
  const { data: session } = await db
    .from('portal_sessions')
    .select('tenant_id, contact_id, expires_at')
    .eq('access_token', sessionToken)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null

  // Fetch contact name
  const { data: contact } = await db
    .from('contacts')
    .select('first_name, last_name')
    .eq('id', session.contact_id)
    .eq('tenant_id', tenant.id)
    .single()

  return {
    tenantId: tenant.id,
    contactId: session.contact_id,
    tenantSlug: tenant.slug,
    businessName: tenant.name,
    contactName: contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(' ')
      : 'Customer',
  }
}

// ─── Portal data queries (strictly scoped to tenant_id + contact_id) ──────────

export async function getPortalOrders(tenantId: string, contactId: string) {
  const db = admin()
  const { data } = await db
    .from('orders')
    .select('id, payment_status, total_amount, created_at, signed_at, paid_at, notes')
    .eq('tenant_id', tenantId)
    .eq('customer_id', contactId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPortalOrderLines(
  orderId: string,
  tenantId: string,
  contactId: string,
) {
  const db = admin()
  // First verify the order belongs to this contact
  const { data: order } = await db
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('customer_id', contactId)
    .maybeSingle()
  if (!order) return null

  const { data: lines } = await db
    .from('order_line_items')
    .select('id, item_name_snapshot, description_snapshot, quantity, unit_price, billing_unit_snapshot')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .order('created_at')
  return lines ?? []
}

export async function getPortalQuoteSignature(
  orderId: string,
  tenantId: string,
  contactId: string,
) {
  const db = admin()
  const { data: order } = await db
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('customer_id', contactId)
    .maybeSingle()
  if (!order) return null

  const { data } = await db
    .from('quote_signatures')
    .select('signed_by_name, signed_at')
    .eq('order_id', orderId)
    .maybeSingle()
  return data
}

export async function getPortalJobHistory(tenantId: string, contactId: string) {
  const db = admin()
  const { data } = await db
    .from('orders')
    .select('id, payment_status, total_amount, created_at, signed_at, paid_at, notes')
    .eq('tenant_id', tenantId)
    .eq('customer_id', contactId)
    .in('payment_status', ['paid', 'pending'])
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}

// ─── Helcim: initialize checkout session ─────────────────────────────────────

export async function initHelcimCheckout(input: {
  orderId: string
  tenantId: string
  contactId: string
  amountCents: number // in cents
  customerName: string
  customerEmail: string
}): Promise<
  | { ok: true; checkoutToken: string; secretToken: string }
  | { ok: false; error: string }
> {
  const db = admin()
  // Verify order ownership
  const { data: order } = await db
    .from('orders')
    .select('id, total_amount')
    .eq('id', input.orderId)
    .eq('tenant_id', input.tenantId)
    .eq('customer_id', input.contactId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }

  const apiKey = await resolveHelcimApiKey(db, input.tenantId)
  if (!apiKey) return { ok: false, error: 'Payment not configured' }

  const res = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-token': apiKey,
    },
    body: JSON.stringify({
      paymentType: 'purchase',
      amount: Number((input.amountCents / 100).toFixed(2)),
      currency: 'USD',
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      // Fee Saver: pass surcharge to customer
      feeSaver: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Helcim error: ${text}` }
  }

  const json = await res.json()
  return {
    ok: true,
    checkoutToken: json.checkoutToken,
    secretToken: json.secretToken,
  }
}

// ─── Helcim: server-side validation + mark paid ───────────────────────────────

export async function validateAndRecordPayment(input: {
  orderId: string
  tenantId: string
  contactId: string
  secretToken: string
  rawEventMessage: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin()

  // Verify ownership
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, total_amount, payment_status, contacts(first_name, last_name, email)')
    .eq('id', input.orderId)
    .eq('tenant_id', input.tenantId)
    .eq('customer_id', input.contactId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }
  if (order.payment_status === 'paid') return { ok: true } // idempotent

  const verified = verifyHelcimTransaction(input.rawEventMessage, input.secretToken)
  if (!verified.ok) return verified

  const now = new Date().toISOString()
  await db.from('orders').update({
    payment_status: 'paid',
    paid_at: now,
    helcim_transaction_id: verified.transactionId,
  }).eq('id', input.orderId)

  const contact = order.contacts as unknown as { first_name: string; last_name: string | null; email: string | null } | null
  await sendPaymentConfirmationEmails({
    admin: db,
    tenantId: input.tenantId,
    orderNumber: order.order_number,
    amount: Number(order.total_amount),
    transactionId: verified.transactionId,
    customerEmail: contact?.email ?? null,
    customerName: contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : null,
  })

  return { ok: true }
}

// ─── Which payment provider (if any) this tenant has connected ───────────────
// The portal previously assumed Helcim unconditionally. A tenant may have
// connected Stripe instead, or nothing at all.
export async function getTenantPaymentProvider(tenantId: string): Promise<'stripe' | 'helcim' | null> {
  const db = admin()
  const { data } = await db
    .from('tenant_payment_accounts')
    .select('provider')
    .eq('tenant_id', tenantId)
    .eq('is_connected', true)
    .maybeSingle()
  if (data?.provider === 'stripe' || data?.provider === 'helcim') return data.provider
  // No Stripe account connected — fall back to Helcim only if QCypher's
  // platform key is configured (resolveHelcimApiKey's own fallback).
  return process.env.HELCIM_API_KEY ? 'helcim' : null
}

// ─── Stripe: create a Checkout Session on the tenant's connected account ─────

export async function initStripeCheckout(input: {
  orderId: string
  tenantId: string
  contactId: string
  amountCents: number
  customerEmail: string
  returnPath: string // e.g. /portal/acme/invoice/<id> — session id gets appended
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const db = admin()

  const { data: order } = await db
    .from('orders')
    .select('id, order_number')
    .eq('id', input.orderId)
    .eq('tenant_id', input.tenantId)
    .eq('customer_id', input.contactId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }

  const account = await resolveStripeAccount(db, input.tenantId)
  if (!account) return { ok: false, error: 'Stripe is not connected for this business' }

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const successUrl = `${appUrl}${input.returnPath}?stripe_session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${appUrl}${input.returnPath}`

  const body = new URLSearchParams({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': `Invoice #${String(order.order_number ?? 0).padStart(4, '0')}`,
    'line_items[0][price_data][unit_amount]': String(input.amountCents),
    'line_items[0][quantity]': '1',
    'metadata[order_id]': input.orderId,
    'metadata[tenant_id]': input.tenantId,
  })
  if (input.customerEmail) body.set('customer_email', input.customerEmail)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[initStripeCheckout] Stripe error', JSON.stringify(err))
    return { ok: false, error: (err as { error?: { message?: string } }).error?.message ?? 'Could not start checkout' }
  }

  const session = await res.json()
  return { ok: true, url: session.url }
}

// ─── Stripe: re-verify a Checkout Session server-side and mark paid ──────────
// No webhook — the customer returns to this exact URL after Stripe
// redirects them, and we re-fetch the session directly from Stripe's API
// (never trust the redirect alone) before marking the order paid. This
// mirrors validateAndRecordPayment's Helcim re-verification pattern. The
// tradeoff: if a customer pays but closes the tab before the redirect
// completes, the order won't auto-mark paid — a real webhook would close
// that gap, but needs a Stripe Dashboard webhook + secret configured per
// deploy, which this intentionally avoids for now.
export async function confirmStripePayment(input: {
  orderId: string
  tenantId: string
  contactId: string
  sessionId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin()

  const { data: order } = await db
    .from('orders')
    .select('id, order_number, total_amount, payment_status, contacts(first_name, last_name, email)')
    .eq('id', input.orderId)
    .eq('tenant_id', input.tenantId)
    .eq('customer_id', input.contactId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }
  if (order.payment_status === 'paid') return { ok: true } // idempotent

  const account = await resolveStripeAccount(db, input.tenantId)
  if (!account) return { ok: false, error: 'Stripe is not connected for this business' }

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${input.sessionId}`, {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  })
  if (!res.ok) return { ok: false, error: 'Could not verify payment with Stripe' }

  const session = await res.json()
  if (session.payment_status !== 'paid') return { ok: false, error: 'Payment was not completed' }
  // Session belongs to this order (defense in depth, alongside the tenant-scoped API key used to fetch it)
  if (session.metadata?.order_id !== input.orderId) return { ok: false, error: 'Payment does not match this invoice' }

  const now = new Date().toISOString()
  await db.from('orders').update({
    payment_status: 'paid',
    paid_at: now,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  }).eq('id', input.orderId)

  const contact = order.contacts as unknown as { first_name: string; last_name: string | null; email: string | null } | null
  await sendPaymentConfirmationEmails({
    admin: db,
    tenantId: input.tenantId,
    orderNumber: order.order_number,
    amount: Number(order.total_amount),
    transactionId: session.id,
    customerEmail: contact?.email ?? null,
    customerName: contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : null,
  })

  return { ok: true }
}
