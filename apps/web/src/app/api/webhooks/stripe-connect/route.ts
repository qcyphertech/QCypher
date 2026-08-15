import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { handleStripeCheckoutCompleted } from '@/lib/actions/portal'

// Platform-level Stripe Connect webhook — configured once in the Stripe
// Dashboard (Developers → Webhooks → "Listen to events on Connected
// accounts") pointed at this URL, using STRIPE_CONNECT_WEBHOOK_SECRET.
// Because it listens across every connected account, one endpoint covers
// every tenant with no per-tenant setup. This is belt-and-suspenders for
// confirmStripePayment's return-URL re-check (portal.ts): if a customer
// pays but closes the tab before the redirect back completes, this still
// marks the order paid.
//
// No `stripe` SDK dependency in this repo, so the signature is verified
// by hand per Stripe's documented scheme: https://stripe.com/docs/webhooks/signatures
function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(kv => kv.split('=') as [string, string]),
  )
  const timestamp = parts.t
  const v1 = parts.v1
  if (!timestamp || !v1) return false

  // Reject anything older than 5 minutes to blunt replay attacks
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const gotBuf = Buffer.from(v1, 'hex')
  if (expectedBuf.length !== gotBuf.length) return false
  return timingSafeEqual(expectedBuf, gotBuf)
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!verifyStripeSignature(rawBody, signature, secret)) {
    console.error('[stripe-connect-webhook] signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type?: string; data?: { object?: unknown } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const result = await handleStripeCheckoutCompleted(event.data?.object)
    if (!result.ok) {
      // Log but still 200 — a malformed/unmatched event shouldn't make
      // Stripe retry forever, and confirmStripePayment is the primary path.
      console.error('[stripe-connect-webhook] checkout.session.completed handling failed', result.error)
    }
  }

  // Acknowledge every other event type — we only act on checkout completion
  return NextResponse.json({ ok: true })
}
