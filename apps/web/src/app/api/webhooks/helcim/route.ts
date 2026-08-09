import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Phase 26 invoice payment webhook. Defense-in-depth alongside the
 * primary client-side confirmation path (validateAndRecordInvoicePayment
 * in lib/actions/invoices.ts, called from the pay page on HelcimPay.js
 * completion) — same two-layer pattern as the existing
 * api/portal/helcim/webhook route for order payments.
 */

// Helcim pings the URL with GET to validate it when saving webhook settings.
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const secret = process.env.HELCIM_WEBHOOK_SECRET ?? ''
  if (!secret) {
    console.error('[helcim-webhook] HELCIM_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: { eventType?: string; transactionId?: string; status?: string; invoiceNumber?: string; verifierToken?: string }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.verifierToken !== secret) {
    return NextResponse.json({ error: 'Invalid verifier token' }, { status: 401 })
  }

  if (event.eventType !== 'TRANSACTION_APPROVED' || !event.transactionId || !event.invoiceNumber) {
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  // invoiceNumber sent to Helcim is an alphanumeric-only correlation id
  // derived from the invoice's own UUID (Helcim rejects our human-readable
  // "INV-2026-0001" format) — see initInvoiceCheckout in
  // lib/actions/invoices.ts. Match back the same way the existing
  // api/portal/helcim/webhook route matches orders by id suffix.
  const { data: invoices } = await admin
    .from('invoices')
    .select('id, tenant_id, status')
    .ilike('id', `%${event.invoiceNumber.toLowerCase()}`)
    .limit(1)

  const invoice = invoices?.[0]
  if (!invoice || invoice.status === 'paid') {
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toISOString()
  await admin.from('invoices').update({
    status: 'paid',
    paid_at: now,
    helcim_transaction_id: event.transactionId,
    updated_at: now,
  }).eq('id', invoice.id)

  if (invoice.tenant_id) {
    await admin.from('audit_logs').insert({
      tenant_id: invoice.tenant_id,
      user_id: null,
      user_email: 'system',
      action: 'invoice_paid',
      resource_type: 'invoice',
      resource_id: invoice.id,
      resource_name: event.invoiceNumber,
      details: { transaction_id: event.transactionId, via: 'webhook' },
    })
  }

  return NextResponse.json({ ok: true })
}
