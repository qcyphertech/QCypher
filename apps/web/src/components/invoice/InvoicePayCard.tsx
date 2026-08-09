'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { initInvoiceCheckout, validateAndRecordInvoicePayment } from '@/lib/actions/invoices'

declare global {
  interface Window {
    appendHelcimPayIframe?: (token: string) => void
    removeHelcimPayIframe?: () => void
  }
}

type Invoice = {
  id: string
  invoice_number: string
  amount: number
  description: string | null
  status: string
  tenant_name: string | null
}

export function InvoicePayCard({ invoice }: { invoice: Invoice }) {
  const [state, setState] = useState<'idle' | 'loading' | 'paid' | 'error' | 'invalid'>(
    invoice.status === 'paid' ? 'paid' : invoice.status === 'void' ? 'invalid' : 'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePay() {
    setState('loading')
    setErrorMsg('')

    const result = await initInvoiceCheckout(invoice.id)
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
      const data = e.data as { eventName?: string; eventStatus?: string; transactionId?: string }
      if (data.eventName !== 'HELCIM_PAY_JS_TRANSACTION_COMPLETION') return
      window.removeEventListener('message', handler)
      window.removeHelcimPayIframe?.()

      if (data.eventStatus !== 'SUCCESS' || !data.transactionId) {
        setState('error')
        setErrorMsg('Payment did not complete. Please try again.')
        return
      }

      const vResult = await validateAndRecordInvoicePayment({
        invoiceId: invoice.id,
        secretToken: result.secretToken,
        transactionId: data.transactionId,
      })

      if (vResult.ok) {
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
    boxShadow: '0 8px 32px rgba(26,48,112,0.10)', overflow: 'hidden',
  }

  if (state === 'paid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8f9fc' }}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 style={{ width: '32px', height: '32px', color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#171a2b', marginBottom: '6px' }}>Payment received!</h1>
          <p style={{ fontSize: '15px', color: '#5b6072' }}>Thank you — your invoice #{invoice.invoice_number} is now paid.</p>
        </div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8f9fc' }}>
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <XCircle style={{ width: '40px', height: '40px', color: '#dc2626', margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#171a2b' }}>Invoice no longer valid</h1>
          <p style={{ fontSize: '14px', color: '#5b6072', marginTop: '6px' }}>This invoice has been voided. Contact QCypher if you believe this is an error.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8f9fc' }}>
      <div style={card}>
        <div style={{ padding: '28px 32px 20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(42,82,160,0.06), rgba(74,157,181,0.06))', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '32px', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5b6072' }}>Invoice #{invoice.invoice_number}</p>
          <p style={{ fontSize: '34px', fontWeight: 900, color: '#171a2b', marginTop: '6px' }}>${Number(invoice.amount).toFixed(2)}</p>
          {invoice.description && <p style={{ fontSize: '14px', color: '#5b6072', marginTop: '4px' }}>{invoice.description}</p>}
        </div>

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
      </div>
    </div>
  )
}
