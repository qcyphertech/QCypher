'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { initHelcimCheckout, validateAndRecordPayment } from '@/lib/actions/portal'
import { markPaymentRequestPaid } from '@/lib/actions/payment-requests'
import { PoweredByFooter, BRAND_GRADIENT_BAR } from '@/components/shared/PoweredByFooter'
import { lineItemPricing, orderPricing, hasDiscount, type Discountable } from '@/lib/order-discounts'

const UNIT_LABELS: Record<string, string> = {
  flat: '', hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo',
}

type Line = {
  id: string
  item_name_snapshot: string
  description_snapshot: string | null
  quantity: number
  unit_price: number
  discount_type: 'percent' | 'flat' | null
  discount_value: number | null
  show_discount: boolean
  billing_unit_snapshot: string
}

declare global {
  interface Window {
    appendHelcimPayIframe?: (token: string) => void
    removeHelcimPayIframe?: () => void
  }
}

type Req = {
  token: string
  orderId: string
  tenantId: string
  contactId: string
  amount: number
  status: string
  businessName: string
  customerName: string
  customerEmail: string
  orderNumber: number | null
  orderCreatedAt: string | null
  orderDiscountType: 'percent' | 'flat' | null
  orderDiscountValue: number | null
  orderShowDiscount: boolean
}

export function PayRequestCard({ request, lines }: { request: Req; lines: Line[] }) {
  const [state, setState] = useState<'idle' | 'loading' | 'paid' | 'error' | 'invalid'>(
    request.status === 'paid' ? 'paid' : request.status !== 'active' ? 'invalid' : 'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePay() {
    setState('loading')
    setErrorMsg('')

    const result = await initHelcimCheckout({
      orderId: request.orderId,
      tenantId: request.tenantId,
      contactId: request.contactId,
      amountCents: Math.round(request.amount * 100),
      customerName: request.customerName,
      customerEmail: request.customerEmail,
    })

    if (!result.ok) {
      setState('error')
      setErrorMsg(result.error)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
    script.onload = () => {
      window.appendHelcimPayIframe?.(result.checkoutToken)
    }
    document.head.appendChild(script)

    window.addEventListener('message', async function handler(e) {
      if (e.origin !== 'https://secure.helcim.app') return
      // Per Helcim's docs, eventName is `helcim-pay-js-${checkoutToken}` (not a
      // fixed constant), and eventStatus is SUCCESS | ABORTED | HIDE. On
      // SUCCESS, eventMessage is a JSON string wrapping the transaction data
      // at eventMessage.data.data.transactionId — not a flat field.
      const data = e.data as { eventName?: string; eventStatus?: string; eventMessage?: string }
      if (data.eventName !== `helcim-pay-js-${result.checkoutToken}`) return
      if (data.eventStatus === 'HIDE') {
        window.removeEventListener('message', handler)
        window.removeHelcimPayIframe?.()
        return
      }
      window.removeEventListener('message', handler)
      window.removeHelcimPayIframe?.()

      if (data.eventStatus !== 'SUCCESS' || !data.eventMessage) {
        setState('error')
        setErrorMsg('Payment did not complete. Please try again.')
        return
      }

      // Server verifies the hash itself — never trust the client here.
      const vResult = await validateAndRecordPayment({
        orderId: request.orderId,
        tenantId: request.tenantId,
        contactId: request.contactId,
        secretToken: result.secretToken,
        rawEventMessage: data.eventMessage,
      })

      if (vResult.ok) {
        await markPaymentRequestPaid(request.token)
        setState('paid')
      } else {
        setState('error')
        setErrorMsg(vResult.error)
      }
    })

    setState('idle') // Helcim modal takes over UX from here
  }

  const card: React.CSSProperties = {
    maxWidth: '440px', width: '100%',
    borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(26,48,112,0.08)',
    boxShadow: '0 8px 32px rgba(26,48,112,0.10)', overflow: 'hidden',
  }
  const shell: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8f9fc' }

  if (state === 'paid') {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={BRAND_GRADIENT_BAR} />
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10b981' }} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#171a2b', marginBottom: '6px' }}>Payment received!</h1>
            <p style={{ fontSize: '15px', color: '#5b6072' }}>Thank you — {request.businessName} has been notified.</p>
          </div>
          <PoweredByFooter />
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div style={shell}>
        <div style={card}>
          <div style={BRAND_GRADIENT_BAR} />
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <XCircle style={{ width: '40px', height: '40px', color: '#dc2626', margin: '0 auto 12px' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#171a2b' }}>Payment link no longer valid</h1>
            <p style={{ fontSize: '14px', color: '#5b6072', marginTop: '6px' }}>Contact {request.businessName} for a new link.</p>
          </div>
          <PoweredByFooter />
        </div>
      </div>
    )
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={BRAND_GRADIENT_BAR} />
        <div style={{ padding: '28px 32px 20px', textAlign: 'center', borderBottom: '1px solid rgba(26,48,112,0.08)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5b6072' }}>{request.businessName}</p>
          <p style={{ fontSize: '34px', fontWeight: 900, color: '#171a2b', marginTop: '6px' }}>${request.amount.toFixed(2)}</p>
          {request.orderNumber != null && (
            <p style={{ fontSize: '13px', color: '#9aa0ae', marginTop: '4px' }}>
              Invoice #{String(request.orderNumber).padStart(4, '0')}
              {request.orderCreatedAt && ` · ${new Date(request.orderCreatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          )}
        </div>

        {/* A payment request's amount is captured once, at link-creation
            time, and nothing re-syncs it if the order's line items are
            edited afterward (e.g. a line item added/removed after the
            link was already sent). If that ever drifts, showing the
            CURRENT line items/subtotal next to a STALE "Total due" would
            visibly contradict itself — safer to fall back to the bare
            amount (the pre-existing behavior) than show line items that
            may not actually match what's being charged. */}
        {lines.length > 0 && Math.abs(orderPricing(lines, {
          discount_type: request.orderDiscountType, discount_value: request.orderDiscountValue,
        }).finalTotal - request.amount) < 0.01 && (
          <InvoiceDetails
            lines={lines}
            order={{ discount_type: request.orderDiscountType, discount_value: request.orderDiscountValue, show_discount: request.orderShowDiscount }}
            total={request.amount}
          />
        )}

        <div style={{ padding: '28px 32px' }}>
          {errorMsg && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '14px', textAlign: 'center' }}>{errorMsg}</p>}
          <button
            onClick={handlePay}
            disabled={state === 'loading'}
            style={{
              width: '100%', fontSize: '16px', fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
              padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              opacity: state === 'loading' ? 0.6 : 1,
            }}
          >
            {state === 'loading' ? 'Loading…' : 'Pay Now'}
          </button>
          <p style={{ fontSize: '12px', color: '#9aa0ae', textAlign: 'center', marginTop: '14px' }}>Secured by Helcim</p>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  )
}

// Reminder of what's actually being paid for, mirroring the same
// "Invoice details" breakdown the portal's own payment page shows
// (components/portal/InvoicePayPage.tsx) — same discount-visibility
// coherence rule: only show a Subtotal/Discount/Total breakdown when
// every discount affecting the total is actually visible to the
// customer, otherwise a partial breakdown wouldn't reconcile on screen.
function InvoiceDetails({ lines, order, total }: { lines: Line[]; order: Discountable & { show_discount: boolean }; total: number }) {
  const pricing = orderPricing(lines, order)
  const orderDiscountVisible = !hasDiscount(order) || order.show_discount
  const allLineDiscountsVisible = lines.every(l => !hasDiscount(l) || l.show_discount)
  const showBreakdown = orderDiscountVisible && allLineDiscountsVisible
    && (pricing.lineDiscountTotal > 0 || pricing.orderDiscountAmount > 0)

  return (
    <div style={{ borderBottom: '1px solid rgba(26,48,112,0.08)' }}>
      <div style={{ padding: '18px 32px 4px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9aa0ae' }}>Invoice details</p>
      </div>
      <div>
        {lines.map(line => {
          const lp = lineItemPricing(line)
          const showLineDiscount = hasDiscount(line) && line.show_discount
          return (
            <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 32px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#171a2b' }}>{line.item_name_snapshot}</p>
                <p style={{ fontSize: '12px', color: '#9aa0ae', marginTop: '2px' }}>
                  Qty {Number(line.quantity)} × ${Number(line.unit_price).toFixed(2)}{UNIT_LABELS[line.billing_unit_snapshot]}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {showLineDiscount && (
                  <p style={{ fontSize: '12px', color: '#9aa0ae', textDecoration: 'line-through' }}>${lp.original.toFixed(2)}</p>
                )}
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#171a2b' }}>${lp.discounted.toFixed(2)}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '12px 32px 18px', background: '#f8f9fc' }}>
        {showBreakdown && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5b6072', padding: '2px 0' }}>
              <span>Subtotal</span><span>${pricing.subtotalOriginal.toFixed(2)}</span>
            </div>
            {pricing.lineDiscountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', padding: '2px 0' }}>
                <span>Discount</span><span>−${pricing.lineDiscountTotal.toFixed(2)}</span>
              </div>
            )}
            {pricing.orderDiscountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', padding: '2px 0' }}>
                <span>Order discount</span><span>−${pricing.orderDiscountAmount.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#171a2b', paddingTop: '6px' }}>
          <span>Total due</span><span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
