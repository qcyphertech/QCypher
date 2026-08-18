'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'
import { verifyHelcimTransaction } from '@/lib/helcim-verify'
import { revalidatePath } from 'next/cache'
import type { Json } from '@qcypher/db'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type InvoiceType = 'one_time' | 'monthly' | 'custom'

export type Invoice = {
  id: string
  invoice_number: string
  tenant_id: string | null
  tenant_name?: string
  amount: number
  description: string | null
  invoice_type: InvoiceType
  status: InvoiceStatus
  sent_to_email: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
}

async function requireSuperAdminCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { userId: user.id, admin }
}

async function logInvoiceAudit(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string | null,
  userId: string,
  action: 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_voided' | 'invoice_marked_paid',
  invoiceId: string,
  invoiceNumber: string,
  details?: Record<string, unknown>,
) {
  if (!tenantId) return // no tenant context to attribute the log to (internal QCypher invoice)
  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    user_email: user?.email ?? '',
    action,
    resource_type: 'invoice',
    resource_id: invoiceId,
    resource_name: invoiceNumber,
    details: (details ?? null) as Json | null,
  })
}

export async function listInvoices(): Promise<Invoice[]> {
  const { admin } = await requireSuperAdminCaller()
  const { data } = await admin
    .from('invoices')
    .select('id, invoice_number, tenant_id, amount, description, invoice_type, status, sent_to_email, sent_at, paid_at, created_at, tenants(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  return ((data ?? []) as unknown as Array<Invoice & { tenants: { name: string } | null }>).map(row => ({
    ...row,
    tenant_name: row.tenants?.name,
  }))
}

export async function createInvoice(input: {
  tenantId: string
  amount: number
  description: string
  invoiceType: InvoiceType
}) {
  const { userId, admin } = await requireSuperAdminCaller()

  const { data, error } = await admin
    .from('invoices')
    .insert({
      tenant_id: input.tenantId,
      amount: input.amount,
      description: input.description,
      invoice_type: input.invoiceType,
      created_by: userId,
      status: 'draft',
    })
    .select('id, invoice_number')
    .single()
  if (error) throw new Error(error.message)

  await logInvoiceAudit(admin, input.tenantId, userId, 'invoice_created', data.id, data.invoice_number, { amount: input.amount })
  revalidatePath('/admin')
  return data
}

export async function voidInvoice(invoiceId: string) {
  const { userId, admin } = await requireSuperAdminCaller()
  const { data: invoice } = await admin.from('invoices').select('tenant_id, invoice_number').eq('id', invoiceId).single()
  if (!invoice) throw new Error('Invoice not found')

  const { error } = await admin.from('invoices').update({ status: 'void', updated_at: new Date().toISOString() }).eq('id', invoiceId)
  if (error) throw new Error(error.message)

  await logInvoiceAudit(admin, invoice.tenant_id, userId, 'invoice_voided', invoiceId, invoice.invoice_number)
  revalidatePath('/admin')
}

export async function markInvoicePaidManually(invoiceId: string) {
  const { userId, admin } = await requireSuperAdminCaller()
  const { data: invoice } = await admin.from('invoices').select('tenant_id, invoice_number').eq('id', invoiceId).single()
  if (!invoice) throw new Error('Invoice not found')

  const { error } = await admin
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
  if (error) throw new Error(error.message)

  await logInvoiceAudit(admin, invoice.tenant_id, userId, 'invoice_marked_paid', invoiceId, invoice.invoice_number)
  revalidatePath('/admin')
}

// Generates a Helcim checkout for the invoice (same HelcimPay.js pattern
// already used for order payments in lib/actions/portal.ts) and emails the
// customer a link to the public pay page — no separate "payment link" API
// call, since Helcim's v2 checkout-session flow already produces one.
// Returns a result instead of throwing for the conditions an admin can
// actually hit ("already paid", "voided") — Next.js redacts thrown Server
// Action error messages in production, so the panel's message has to
// travel back as data.
export async function sendInvoice(invoiceId: string, recipientEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, admin } = await requireSuperAdminCaller()

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, tenant_id, amount, description, status, tenants(name)')
    .eq('id', invoiceId)
    .single()
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { ok: false, error: 'Invoice is already paid' }
  if (invoice.status === 'void') return { ok: false, error: 'Cannot send a voided invoice' }

  const tenantName = (invoice as unknown as { tenants: { name: string } | null }).tenants?.name ?? 'your account'

  const { error } = await admin
    .from('invoices')
    .update({ status: 'sent', sent_to_email: recipientEmail, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
  if (error) return { ok: false, error: error.message }

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const payUrl = `${appUrl}/invoice/${invoice.id}/pay`

  await sendEmail({
    to: recipientEmail,
    subject: `QCypher Invoice #${invoice.invoice_number}`,
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Invoice #${invoice.invoice_number}</p>
        <p style="margin:16px 0 0;">Hi ${tenantName} team,</p>
        <p style="margin:16px 0 0;">Your QCypher invoice is ready.</p>
        <p style="margin:16px 0 0;"><strong>Amount:</strong> $${Number(invoice.amount).toFixed(2)}</p>
        ${invoice.description ? `<p style="margin:4px 0 0;"><strong>Description:</strong> ${invoice.description}</p>` : ''}
        <p style="margin:16px 0 0;">Questions? Reply to this email.</p>
      `,
      cta: { label: 'Pay Now', href: payUrl },
    }),
    text: `Your QCypher invoice #${invoice.invoice_number} for $${Number(invoice.amount).toFixed(2)} is ready. Pay here: ${payUrl}`,
  })

  await logInvoiceAudit(admin, invoice.tenant_id, userId, 'invoice_sent', invoiceId, invoice.invoice_number, { sent_to_email: recipientEmail })
  revalidatePath('/admin')
  return { ok: true }
}

// ─── Helcim checkout — public pay page, no auth required ──────────────────
// Mirrors initHelcimCheckout/validateAndRecordPayment in lib/actions/portal.ts,
// scoped to `invoices` instead of `orders`.

export async function initInvoiceCheckout(invoiceId: string): Promise<
  | { ok: true; checkoutToken: string; secretToken: string; amount: number; invoiceNumber: string; description: string | null }
  | { ok: false; error: string }
> {
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, amount, description, status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { ok: false, error: 'This invoice has already been paid' }
  if (invoice.status === 'void') return { ok: false, error: 'This invoice is no longer valid' }

  const apiKey = process.env.HELCIM_API_KEY
  if (!apiKey) return { ok: false, error: 'Payment not configured' }

  // invoiceNumber is optional per Helcim's own API reference (no documented
  // format spec) — every value we tried (our human-readable "INV-2026-0001",
  // a hyphen-free alphanumeric slice, plain digits) was rejected as
  // "Invalid Invoice Number" by their live validator regardless. Omitting
  // it entirely sidesteps that guessing game; the primary payment
  // confirmation path (validateAndRecordInvoicePayment) already correlates
  // by the invoice's own UUID, not this field, so nothing depends on it.
  const res = await fetch('https://api.helcim.com/v2/helcim-pay/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-token': apiKey },
    body: JSON.stringify({
      paymentType: 'purchase',
      amount: Number(invoice.amount),
      currency: 'USD',
      feeSaver: true,
    }),
  })
  if (!res.ok) return { ok: false, error: `Helcim error: ${await res.text()}` }

  const json = await res.json()
  await admin.from('invoices').update({
    helcim_checkout_token: json.checkoutToken,
    helcim_secret_token: json.secretToken,
  }).eq('id', invoiceId)

  return {
    ok: true,
    checkoutToken: json.checkoutToken,
    secretToken: json.secretToken,
    amount: Number(invoice.amount),
    invoiceNumber: invoice.invoice_number,
    description: invoice.description,
  }
}

export async function validateAndRecordInvoicePayment(input: {
  invoiceId: string
  secretToken: string
  rawEventMessage: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: invoice } = await admin.from('invoices').select('id, tenant_id, invoice_number, amount, sent_to_email, status').eq('id', input.invoiceId).maybeSingle()
  if (!invoice) return { ok: false, error: 'Invoice not found' }
  if (invoice.status === 'paid') return { ok: true } // idempotent

  const verified = verifyHelcimTransaction(input.rawEventMessage, input.secretToken)
  if (!verified.ok) return verified

  const now = new Date().toISOString()
  await admin.from('invoices').update({
    status: 'paid',
    paid_at: now,
    helcim_transaction_id: verified.transactionId,
    updated_at: now,
  }).eq('id', input.invoiceId)

  if (invoice.tenant_id) {
    await admin.from('audit_logs').insert({
      tenant_id: invoice.tenant_id,
      user_id: null,
      user_email: 'system',
      action: 'invoice_paid',
      resource_type: 'invoice',
      resource_id: invoice.id,
      resource_name: invoice.invoice_number,
      details: { transaction_id: verified.transactionId },
    })
  }

  const receiptHtml = renderBrandedEmail({
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Payment received</p>
      <p style="margin:16px 0 0;">Thanks — your payment for invoice #${invoice.invoice_number} was successful.</p>
      <p style="margin:16px 0 0;"><strong>Amount:</strong> $${Number(invoice.amount).toFixed(2)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#5b6072;">Transaction ID: ${verified.transactionId}</p>
    `,
  })
  if (invoice.sent_to_email) {
    await sendEmail({
      to: invoice.sent_to_email,
      subject: `Payment received — Invoice #${invoice.invoice_number}`,
      html: receiptHtml,
      text: `Your payment for invoice #${invoice.invoice_number} ($${Number(invoice.amount).toFixed(2)}) was successful. Transaction ID: ${verified.transactionId}`,
    })
  }
  await sendEmail({
    to: 'hello@qcyphertech.com',
    subject: `Invoice #${invoice.invoice_number} paid — $${Number(invoice.amount).toFixed(2)}`,
    html: receiptHtml,
    text: `Invoice #${invoice.invoice_number} was paid: $${Number(invoice.amount).toFixed(2)}. Transaction ID: ${verified.transactionId}`,
  })

  return { ok: true }
}
