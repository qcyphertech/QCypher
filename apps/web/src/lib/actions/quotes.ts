'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { renderNeutralEmail } from '@/lib/email/neutral'
import { renderBrandedEmail } from '@/lib/email/brand'
import { sendEmail } from '@/lib/email/send'

const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? ''
const RESEND_FROM     = process.env.RESEND_FROM_EMAIL ?? 'hello@qcyphertech.com'
const APP_URL         = process.env.APP_URL ?? 'https://www.qcyphertech.com'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export type QuoteToken = {
  access_token: string
  token_expires_at: string
  order_id: string
}

export type SignatureRecord = {
  id: string
  signed_by_name: string
  signature_type: string
  signed_at: string
  ip_address: string | null
}

export type GenerateQuoteTokenResult =
  | { ok: true; token: string; url: string }
  | { ok: false; error: string }

// Generate (or regenerate) a quote token for an order. Tenant-scoped.
// Returns a result instead of throwing for "already signed" — Next.js
// redacts thrown Server Action error messages in production, so that
// message (shown directly in SendQuoteButton) has to travel back as data.
export async function generateQuoteToken(orderId: string): Promise<GenerateQuoteTokenResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tenantId = user.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')

  // Confirm order belongs to this tenant and is not already signed
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('id, signed_at, payment_status')
    .eq('id', orderId)
    .single()
  if (oErr || !order) return { ok: false, error: 'Order not found' }
  if (order.signed_at) return { ok: false, error: 'This quote has already been signed and cannot be re-sent' }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

  // Delete any existing token for this order, then insert fresh (no UPDATE policy needed)
  await supabase.from('quote_tokens').delete().eq('order_id', orderId)
  const { error } = await supabase.from('quote_tokens').insert(
    { tenant_id: tenantId, order_id: orderId, access_token: token, token_expires_at: expiresAt },
  )
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/orders/${orderId}`)
  return { ok: true, token, url: `${APP_URL}/q/${token}` }
}

// Fetch the active token for an order (if any), for display in OrderDetail
export async function getQuoteToken(orderId: string): Promise<QuoteToken | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quote_tokens')
    .select('access_token, token_expires_at, order_id')
    .eq('order_id', orderId)
    .maybeSingle()
  return data ?? null
}

// Get the signature record for an already-signed order
export async function getQuoteSignature(orderId: string): Promise<SignatureRecord | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quote_signatures')
    .select('id, signed_by_name, signature_type, signed_at, ip_address')
    .eq('order_id', orderId)
    .maybeSingle()
  return data ?? null
}

// Send the quote link via email using Resend
export async function sendQuoteEmail(input: {
  orderId: string
  recipientEmail: string
  recipientName: string
  businessName: string
  total: number
}): Promise<{ url: string; emailSent: boolean; emailError?: string } | { url: null; emailSent: false; emailError: string }> {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, emailSent: false, emailError: 'Not authenticated' }

  const tokenResult = await generateQuoteToken(input.orderId)
  if (!tokenResult.ok) return { url: null, emailSent: false, emailError: tokenResult.error }
  const { url } = tokenResult

  const body = `Hi ${input.recipientName},

${input.businessName} has sent you a quote to review and approve.

Quote total: $${Number(input.total).toFixed(2)}

Review and approve your quote here:
${url}

This link expires in 30 days. By clicking Approve on that page, you agree to the terms of this quote. This is a lightweight approval — not a notarized or legally-advanced e-signature.

Questions? Reply to this email.

— ${input.businessName}`

  const html = renderNeutralEmail({
    senderName: input.businessName,
    bodyHtml: `
      <p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#1a202c;">You have a quote to review</p>
      <p style="margin:0 0 16px;">Hi ${input.recipientName},</p>
      <p style="margin:0 0 20px;">${input.businessName} has sent you a quote to review and approve.</p>
      <div style="background:#f7f7f8;border-radius:12px;padding:20px 24px;margin:0 0 20px;border:1px solid rgba(15,23,42,0.06);text-align:center;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#718096;margin-bottom:6px;">Quote total</div>
        <div style="font-size:28px;font-weight:800;color:#1a202c;">$${Number(input.total).toFixed(2)}</div>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#718096;">This link expires in 30 days. By clicking Approve, you agree to the terms of this quote — a lightweight approval, not a notarized or legally-advanced e-signature.</p>
    `,
    cta: { label: 'Review and approve', href: url! },
  })

  if (!RESEND_API_KEY) {
    return { url, emailSent: false, emailError: 'Email not configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [input.recipientEmail],
      subject: `Your quote from ${input.businessName} — review and approve`,
      html,
      text: body,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[sendQuoteEmail] Resend error', res.status, JSON.stringify(err))
    return { url, emailSent: false, emailError: (err as { message?: string }).message ?? 'Email delivery failed' }
  }

  const okBody = await res.json().catch(() => ({}))
  console.log('[sendQuoteEmail] Resend accepted', JSON.stringify(okBody))
  return { url, emailSent: true }
  } catch (e: unknown) {
    return { url: null, emailSent: false, emailError: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

// ── Public (service-role) actions — called from /q/[token] route ──────────────

// Look up quote data from a token. No auth required — validates token in code.
export async function getQuoteByToken(token: string): Promise<{
  valid: boolean
  expired?: boolean
  alreadySigned?: boolean
  order?: {
    id: string
    order_number: number | null
    total_amount: number
    discount_type: 'percent' | 'flat' | null
    discount_value: number | null
    show_discount: boolean
    created_at: string
    business_name: string
    tenant_id: string
    contact_name: string | null
  }
  lines?: Array<{
    id: string
    item_name_snapshot: string
    description_snapshot: string | null
    quantity: number
    unit_price: number
    discount_type: 'percent' | 'flat' | null
    discount_value: number | null
    show_discount: boolean
    billing_unit_snapshot: string
  }>
} | null> {
  const admin = adminClient()

  const { data: qt } = await admin
    .from('quote_tokens')
    .select('order_id, tenant_id, token_expires_at')
    .eq('access_token', token)
    .maybeSingle()

  if (!qt) {
    // Check if already signed (token consumed)
    const { data: sig } = await admin
      .from('quote_signatures')
      .select('order_id')
      .eq('access_token', token)
      .maybeSingle()
    if (sig) return { valid: false, alreadySigned: true }
    return { valid: false }
  }

  if (new Date(qt.token_expires_at) < new Date()) {
    return { valid: false, expired: true }
  }

  const [{ data: order }, { data: lines }, { data: tenant }] = await Promise.all([
    admin.from('orders')
      .select('id, order_number, total_amount, discount_type, discount_value, show_discount, created_at, signed_at, contact:contacts(first_name, last_name)')
      .eq('id', qt.order_id)
      .single(),
    admin.from('order_line_items')
      .select('id, item_name_snapshot, description_snapshot, quantity, unit_price, discount_type, discount_value, show_discount, billing_unit_snapshot')
      .eq('order_id', qt.order_id)
      .order('created_at'),
    admin.from('tenants').select('name').eq('id', qt.tenant_id).single(),
  ])

  if (!order) return { valid: false }
  if (order.signed_at) return { valid: false, alreadySigned: true }

  const contact = order.contact as unknown as { first_name: string; last_name: string | null } | null

  return {
    valid: true,
    order: {
      id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      discount_type: order.discount_type as 'percent' | 'flat' | null,
      discount_value: order.discount_value,
      show_discount: order.show_discount,
      created_at: order.created_at,
      business_name: (tenant as { name?: string } | null)?.name ?? 'Your service provider',
      tenant_id: qt.tenant_id,
      contact_name: contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : null,
    },
    lines: (lines ?? []) as any,
  }
}

// Emails every owner of a tenant — used to notify staff of customer-side
// portal/quote actions (approval, change requests) that previously had no
// notification at all despite the customer-facing UI claiming otherwise.
async function notifyTenantOwners(admin: ReturnType<typeof adminClient>, tenantId: string, subject: string, bodyHtml: string) {
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emails = users
    .filter(u => u.app_metadata?.tenant_id === tenantId && u.app_metadata?.role === 'owner')
    .map(u => u.email ?? '')
    .filter(Boolean)
  if (!emails.length) return
  await sendEmail({
    to: emails,
    subject,
    html: renderBrandedEmail({ bodyHtml, cta: { label: 'View order', href: `${APP_URL}/orders` } }),
  })
}

// Record a customer's signature. Service-role only. Called from the public quote page.
export async function signQuote(input: {
  token: string
  signedByName: string
  signatureType: 'typed' | 'drawn'
  signatureData: string
  ipAddress: string
}): Promise<{ ok: boolean; error?: string }> {
  const admin = adminClient()

  // Re-validate token
  const { data: qt } = await admin
    .from('quote_tokens')
    .select('order_id, tenant_id, token_expires_at')
    .eq('access_token', input.token)
    .maybeSingle()

  if (!qt) return { ok: false, error: 'This link is no longer valid.' }
  if (new Date(qt.token_expires_at) < new Date()) return { ok: false, error: 'This link has expired. Please ask for a new one.' }

  const { data: order } = await admin.from('orders').select('signed_at, order_number, total_amount').eq('id', qt.order_id).single()
  if (!order) return { ok: false, error: 'Quote not found.' }
  if (order.signed_at) return { ok: false, error: 'This quote has already been signed.' }

  const now = new Date().toISOString()

  // Write signature record (token stored for audit trail)
  const { error: sigErr } = await admin.from('quote_signatures').insert({
    tenant_id: qt.tenant_id,
    order_id: qt.order_id,
    signed_by_name: input.signedByName.trim(),
    signature_type: input.signatureType,
    signature_data: input.signatureData,
    ip_address: input.ipAddress,
    signed_at: now,
    access_token: input.token,
    token_expires_at: qt.token_expires_at,
  })
  if (sigErr) {
    console.error('[signQuote] insert error:', JSON.stringify(sigErr))
    return { ok: false, error: `Could not record signature: ${sigErr.message}` }
  }

  // Transition order: draft → pending + set signed_at
  await admin.from('orders').update({
    payment_status: 'pending',
    signed_at: now,
  }).eq('id', qt.order_id)

  // Consume token
  await admin.from('quote_tokens').delete().eq('order_id', qt.order_id)

  const orderLabel = `Quote #${String(order.order_number ?? 0).padStart(4, '0')}`
  await notifyTenantOwners(admin, qt.tenant_id,
    `${orderLabel} approved by ${input.signedByName.trim()}`,
    `
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Quote approved</p>
      <p style="margin:16px 0 0;"><strong>${input.signedByName.trim()}</strong> approved ${orderLabel} for $${Number(order.total_amount).toFixed(2)}.</p>
    `,
  )

  await admin.from('audit_logs').insert({
    tenant_id: qt.tenant_id,
    user_id: null,
    user_email: 'system',
    action: 'quote_approved',
    resource_type: 'order',
    resource_id: qt.order_id,
    resource_name: orderLabel,
    details: { signed_by: input.signedByName.trim() },
  })

  return { ok: true }
}

// Records a customer's "request changes" on a quote — the decline/feedback
// path that was previously entirely missing (only approve-via-signature
// existed). Does NOT consume the quote token — the customer can still
// approve later, or the tenant revises the order and re-sends a fresh
// token, which naturally supersedes this one.
export async function requestQuoteChanges(input: {
  token: string
  message: string
  requestedByName?: string
}): Promise<{ ok: boolean; error?: string }> {
  const admin = adminClient()

  const { data: qt } = await admin
    .from('quote_tokens')
    .select('order_id, tenant_id, token_expires_at')
    .eq('access_token', input.token)
    .maybeSingle()

  if (!qt) return { ok: false, error: 'This link is no longer valid.' }
  if (new Date(qt.token_expires_at) < new Date()) return { ok: false, error: 'This link has expired. Please ask for a new one.' }

  const { data: order } = await admin.from('orders').select('signed_at, order_number').eq('id', qt.order_id).single()
  if (!order) return { ok: false, error: 'Quote not found.' }
  if (order.signed_at) return { ok: false, error: 'This quote has already been approved.' }

  const message = input.message.trim()
  if (!message) return { ok: false, error: 'Please describe what you’d like changed.' }

  const now = new Date().toISOString()
  await admin.from('orders').update({
    change_requested_at: now,
    change_request_message: message,
  }).eq('id', qt.order_id)

  const orderLabel = `Quote #${String(order.order_number ?? 0).padStart(4, '0')}`
  const requester = input.requestedByName?.trim() || 'The customer'
  await notifyTenantOwners(admin, qt.tenant_id,
    `${requester} requested changes on ${orderLabel}`,
    `
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Changes requested</p>
      <p style="margin:16px 0 0;"><strong>${requester}</strong> asked for changes on ${orderLabel}:</p>
      <p style="margin:12px 0 0;padding:16px 20px;background:#f8f9fc;border-radius:10px;border-left:3px solid #2a52a0;">${message.replace(/</g, '&lt;')}</p>
    `,
  )

  await admin.from('audit_logs').insert({
    tenant_id: qt.tenant_id,
    user_id: null,
    user_email: 'system',
    action: 'quote_change_requested',
    resource_type: 'order',
    resource_id: qt.order_id,
    resource_name: orderLabel,
    details: { message },
  })

  return { ok: true }
}
