'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { initHelcimCheckout, validateAndRecordPayment } from '@/lib/actions/portal'
import { markPaymentRequestPaid } from '@/lib/actions/payment-requests'

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
}

export function PayRequestCard({ request }: { request: Req }) {
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
    borderRadius: '20px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 8px 32px rgba(15,23,42,0.10)', overflow: 'hidden',
  }

  if (state === 'paid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f7f7f8' }}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1a202c', marginBottom: '6px' }}>Payment received!</h1>
          <p style={{ fontSize: '15px', color: '#718096' }}>Thank you — {request.businessName} has been notified.</p>
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f7f7f8' }}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <XCircle style={{ width: '40px', height: '40px', color: '#dc2626', margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1a202c' }}>Payment link no longer valid</h1>
          <p style={{ fontSize: '14px', color: '#718096', marginTop: '6px' }}>Contact {request.businessName} for a new link.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f7f7f8' }}>
      <div style={card}>
        <div style={{ padding: '28px 32px 20px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#718096' }}>{request.businessName}</p>
          <p style={{ fontSize: '34px', fontWeight: 900, color: '#1a202c', marginTop: '6px' }}>${request.amount.toFixed(2)}</p>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {errorMsg && <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '14px', textAlign: 'center' }}>{errorMsg}</p>}
          <button
            onClick={handlePay}
            disabled={state === 'loading'}
            style={{
              width: '100%', fontSize: '16px', fontWeight: 700, color: '#fff',
              background: '#2d3748',
              padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              opacity: state === 'loading' ? 0.6 : 1,
            }}
          >
            {state === 'loading' ? 'Loading…' : 'Pay Now'}
          </button>
          <p style={{ fontSize: '12px', color: '#9aa0ae', textAlign: 'center', marginTop: '14px' }}>Secured by Helcim</p>
        </div>
      </div>
    </div>
  )
}
