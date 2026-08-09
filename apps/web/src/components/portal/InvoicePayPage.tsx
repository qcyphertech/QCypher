'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import type { PortalSession } from '@/lib/actions/portal'
import { initHelcimCheckout, validateAndRecordPayment } from '@/lib/actions/portal'

const UNIT_LABELS: Record<string, string> = {
  flat: '', hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo',
}

type Line = {
  id: string
  item_name_snapshot: string
  description_snapshot: string | null
  quantity: number
  unit_price: number
  billing_unit_snapshot: string
}

type Order = {
  id: string
  total_amount: number
  created_at: string
  payment_status: string
  paid_at: string | null
  helcim_transaction_id: string | null
  notes: string | null
}

declare global {
  interface Window {
    appendHelcimIframe?: (token: string) => void
    removeHelcimIframe?: () => void
  }
}

export function InvoicePayPage({
  order,
  lines,
  session,
  backHref,
}: {
  order: Order
  lines: Line[]
  session: PortalSession
  backHref: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'paid' | 'error'>(
    order.payment_status === 'paid' ? 'paid' : 'idle',
  )
  const [errorMsg, setErrorMsg] = useState('')
  const [secretToken, setSecretToken] = useState('')

  const alreadyPaid = order.payment_status === 'paid'

  async function handlePay() {
    setState('loading')
    setErrorMsg('')

    const result = await initHelcimCheckout({
      orderId: order.id,
      tenantId: session.tenantId,
      contactId: session.contactId,
      amountCents: Math.round(order.total_amount * 100),
      customerName: session.contactName,
      customerEmail: '',
    })

    if (!result.ok) {
      setState('error')
      setErrorMsg(result.error)
      return
    }

    setSecretToken(result.secretToken)

    // Load HelcimPay.js and open modal
    const script = document.createElement('script')
    script.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
    script.onload = () => {
      window.appendHelcimIframe?.(result.checkoutToken)
    }
    document.head.appendChild(script)

    // Listen for Helcim postMessage
    window.addEventListener('message', async function handler(e) {
      if (e.origin !== 'https://secure.helcim.app') return
      const data = e.data as { eventName?: string; eventStatus?: string; transactionId?: string }
      if (data.eventName !== 'HELCIM_PAY_JS_TRANSACTION_COMPLETION') return
      window.removeEventListener('message', handler)
      window.removeHelcimIframe?.()

      if (data.eventStatus !== 'SUCCESS' || !data.transactionId) {
        setState('error')
        setErrorMsg('Payment did not complete. Please try again.')
        return
      }

      // Server-side validation — never trust client alone
      const vResult = await validateAndRecordPayment({
        orderId: order.id,
        tenantId: session.tenantId,
        contactId: session.contactId,
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

    setState('idle') // Modal handles UX from here
  }

  if (state === 'paid' || alreadyPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Payment received!</h1>
          <p className="text-[15px] text-gray-600">
            Thank you — {session.businessName} has been notified.
          </p>
          {order.helcim_transaction_id && (
            <p className="text-[12px] text-gray-400">
              Transaction ID: {order.helcim_transaction_id}
            </p>
          )}
          <Link
            href={backHref}
            className="block w-full py-3 rounded-xl text-[15px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}
          >
            Back to portal
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Back */}
        <Link href={backHref} className="text-[13px] text-blue-600 hover:underline">
          ← Back to portal
        </Link>

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-gray-400">Invoice from</p>
          <h1 className="text-2xl font-bold text-gray-900">{session.businessName}</h1>
          <p className="text-[15px] text-gray-500">
            {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Invoice details</h2>
          </div>
          {lines.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">No items</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {lines.map(line => (
                <div key={line.id} className="flex items-start justify-between px-6 py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900">{line.item_name_snapshot}</p>
                    {line.description_snapshot && (
                      <p className="text-[13px] text-gray-500 mt-0.5">{line.description_snapshot}</p>
                    )}
                    <p className="text-[13px] text-gray-400 mt-0.5">
                      Qty {Number(line.quantity)} × ${Number(line.unit_price).toFixed(2)}{UNIT_LABELS[line.billing_unit_snapshot]}
                    </p>
                  </div>
                  <p className="text-[15px] font-semibold text-gray-900 flex-shrink-0">
                    ${(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-[15px] font-semibold text-gray-700">Total due</p>
            <p className="text-xl font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
          </div>
        </div>

        {/* Fee Saver notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
          <p className="text-[13px] text-blue-800">
            A small processing fee will be added at checkout to cover card transaction costs.
          </p>
        </div>

        {state === 'error' && (
          <p className="text-[13px] text-red-600 font-medium">{errorMsg}</p>
        )}

        <button
          onClick={handlePay}
          disabled={state === 'loading'}
          className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}
        >
          {state === 'loading' ? 'Preparing payment…' : `Pay $${Number(order.total_amount).toFixed(2)}`}
        </button>

        <p className="text-[12px] text-gray-400 text-center">
          Invoice #{order.id.slice(-6).toUpperCase()} · Secured by Helcim
        </p>
      </div>
    </div>
  )
}
