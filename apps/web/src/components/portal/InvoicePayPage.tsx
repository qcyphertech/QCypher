'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import type { PortalSession } from '@/lib/actions/portal'
import { initHelcimCheckout, validateAndRecordPayment, initStripeCheckout, confirmStripePayment } from '@/lib/actions/portal'
import { getLoyaltyCheckoutInfo, redeemLoyaltyAtCheckout } from '@/lib/actions/loyalty'
import { getUpsellSuggestion, addPortalUpsellLineItem, type UpsellSuggestion } from '@/lib/actions/upsells'
import { PoweredByFooter, BRAND_GRADIENT_BAR } from '@/components/shared/PoweredByFooter'

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
  order_number: number | null
  total_amount: number
  created_at: string
  payment_status: string
  paid_at: string | null
  helcim_transaction_id: string | null
  notes: string | null
  job_status: 'en_route' | 'in_progress' | 'completed' | null
}

const JOB_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'en_route', label: 'En route' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
] as const

function JobStatusTimeline({ jobStatus }: { jobStatus: Order['job_status'] }) {
  const currentIndex = JOB_STEPS.findIndex(s => s.key === (jobStatus ?? 'scheduled'))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
      <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Job status</h2>
      <div className="flex items-start">
        {JOB_STEPS.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div
                  className="absolute top-3 right-1/2 w-full h-0.5"
                  style={{ background: i <= currentIndex ? '#059669' : '#e5e7eb' }}
                />
              )}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center z-10 text-[11px] font-bold"
                style={{
                  background: done || active ? '#059669' : '#e5e7eb',
                  color: done || active ? '#fff' : '#9ca3af',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <p
                className="text-[11px] font-medium text-center mt-2 px-1"
                style={{ color: active ? '#059669' : done ? '#374151' : '#9ca3af' }}
              >
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    appendHelcimPayIframe?: (token: string) => void
    removeHelcimPayIframe?: () => void
  }
}

export function InvoicePayPage({
  order,
  lines,
  session,
  backHref,
  returnPath,
  paymentProvider,
}: {
  order: Order
  lines: Line[]
  session: PortalSession
  backHref: string
  returnPath: string
  paymentProvider: 'stripe' | 'helcim' | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stripeSessionId = searchParams.get('stripe_session_id')

  const [state, setState] = useState<'idle' | 'loading' | 'paid' | 'error'>(
    order.payment_status === 'paid' ? 'paid' : (stripeSessionId ? 'loading' : 'idle'),
  )
  const [errorMsg, setErrorMsg] = useState('')

  const alreadyPaid = order.payment_status === 'paid'

  const [loyalty, setLoyalty] = useState<{ enabled: boolean; tier: string; discountPercent: number; creditBalance: number; discountedAmount: number } | null>(null)
  const [applyLoyalty, setApplyLoyalty] = useState(true)

  useEffect(() => {
    if (alreadyPaid) return
    getLoyaltyCheckoutInfo(session.tenantId, session.contactId, Number(order.total_amount)).then(setLoyalty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [upsell, setUpsell] = useState<UpsellSuggestion | null>(null)
  const [upsellDismissed, setUpsellDismissed] = useState(false)
  const [upsellPending, setUpsellPending] = useState(false)

  useEffect(() => {
    if (alreadyPaid) return
    getUpsellSuggestion(session.tenantId, order.id, session.contactId).then(setUpsell)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAcceptUpsell() {
    if (!upsell) return
    setUpsellPending(true)
    const result = await addPortalUpsellLineItem({
      tenantId: session.tenantId,
      contactId: session.contactId,
      orderId: order.id,
      analyticsId: upsell.analyticsId,
    })
    if (result.ok) {
      router.refresh()
    } else {
      setUpsellPending(false)
    }
  }

  const hasLoyaltyBenefit = !!loyalty?.enabled && (loyalty.discountPercent > 0 || loyalty.creditBalance > 0)
  const savings = loyalty ? Number(order.total_amount) - loyalty.discountedAmount : 0
  const displayAmount = hasLoyaltyBenefit && applyLoyalty ? loyalty!.discountedAmount : Number(order.total_amount)

  // Returning from Stripe's hosted checkout — re-verify server-side before
  // trusting it, then strip the query param so a refresh doesn't re-check.
  useEffect(() => {
    if (!stripeSessionId || alreadyPaid) return
    confirmStripePayment({
      orderId: order.id,
      tenantId: session.tenantId,
      contactId: session.contactId,
      sessionId: stripeSessionId,
    }).then(result => {
      if (result.ok) {
        setState('paid')
      } else {
        setState('error')
        setErrorMsg(result.error)
      }
      router.replace(returnPath)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeSessionId])

  async function handlePayHelcim() {
    setState('loading')
    setErrorMsg('')

    const redeemed = await redeemLoyaltyAtCheckout(session.tenantId, session.contactId, Number(order.total_amount), hasLoyaltyBenefit && applyLoyalty)

    const result = await initHelcimCheckout({
      orderId: order.id,
      tenantId: session.tenantId,
      contactId: session.contactId,
      amountCents: redeemed.finalAmountCents,
      customerName: session.contactName,
      customerEmail: '',
    })

    if (!result.ok) {
      setState('error')
      setErrorMsg(result.error)
      return
    }

    // Load HelcimPay.js and open modal
    const script = document.createElement('script')
    script.src = 'https://secure.helcim.app/helcim-pay/services/start.js'
    script.onload = () => {
      window.appendHelcimPayIframe?.(result.checkoutToken)
    }
    document.head.appendChild(script)

    // Listen for Helcim postMessage — per Helcim's docs, eventName is
    // `helcim-pay-js-${checkoutToken}` (not a fixed constant), and on
    // SUCCESS the transaction id is nested inside a JSON-stringified
    // eventMessage at eventMessage.data.data.transactionId.
    window.addEventListener('message', async function handler(e) {
      if (e.origin !== 'https://secure.helcim.app') return
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

      // Server-side validation — never trust client alone. The server
      // recomputes and compares Helcim's transaction hash itself.
      const vResult = await validateAndRecordPayment({
        orderId: order.id,
        tenantId: session.tenantId,
        contactId: session.contactId,
        secretToken: result.secretToken,
        rawEventMessage: data.eventMessage,
        creditRedeemed: redeemed.creditToUse,
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

  async function handlePayStripe() {
    setState('loading')
    setErrorMsg('')

    const redeemed = await redeemLoyaltyAtCheckout(session.tenantId, session.contactId, Number(order.total_amount), hasLoyaltyBenefit && applyLoyalty)

    const result = await initStripeCheckout({
      orderId: order.id,
      tenantId: session.tenantId,
      contactId: session.contactId,
      amountCents: redeemed.finalAmountCents,
      customerEmail: '',
      returnPath,
      creditRedeemed: redeemed.creditToUse,
    })

    if (!result.ok) {
      setState('error')
      setErrorMsg(result.error)
      return
    }

    window.location.href = result.url // full redirect to Stripe's hosted checkout
  }

  const handlePay = paymentProvider === 'stripe' ? handlePayStripe : handlePayHelcim

  if (state === 'paid' || alreadyPaid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div style={BRAND_GRADIENT_BAR} />
        <div className="flex items-center justify-center p-6">
          <div className="max-w-sm w-full space-y-6">
            <div className="text-center space-y-4">
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
            </div>
            <JobStatusTimeline jobStatus={order.job_status} />
            <Link
              href={backHref}
              className="block w-full py-3 rounded-xl text-[15px] font-bold text-white text-center"
              style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}
            >
              Back to portal
            </Link>
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <PoweredByFooter />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={BRAND_GRADIENT_BAR} />
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

        {/* Job status */}
        <JobStatusTimeline jobStatus={order.job_status} />

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

        {hasLoyaltyBenefit && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
              <span className="text-[16px]">🏆</span>
              <h2 className="text-[15px] font-semibold text-gray-900 capitalize">{loyalty!.tier} member benefits</h2>
            </div>
            <div className="px-6 py-4 space-y-2">
              {loyalty!.discountPercent > 0 && (
                <p className="text-[14px] text-gray-600">{loyalty!.discountPercent}% member discount</p>
              )}
              {loyalty!.creditBalance > 0 && (
                <p className="text-[14px] text-gray-600">${loyalty!.creditBalance.toFixed(2)} available credit</p>
              )}
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={applyLoyalty} onChange={e => setApplyLoyalty(e.target.checked)} />
                <span className="text-[14px] font-medium text-gray-800">
                  Apply my benefits — save ${savings.toFixed(2)}
                </span>
              </label>
            </div>
          </div>
        )}

        {upsell && !upsellDismissed && (
          <div className="bg-white rounded-2xl border border-cyan-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-cyan-100 bg-cyan-50 flex items-center gap-2">
              <span className="text-[16px]">{upsell.rule.bundle_emoji_icon ?? '💡'}</span>
              <h2 className="text-[15px] font-semibold text-gray-900">Recommended for you</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <p className="text-[15px] font-medium text-gray-900">
                  {upsell.rule.bundle_description ?? upsell.suggestedItemName}
                </p>
                <p className="text-[14px] text-gray-500 mt-0.5">
                  ${upsell.bundlePrice.toFixed(2)} <span className="line-through text-gray-400">${upsell.basePrice.toFixed(2)}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptUpsell}
                  disabled={upsellPending}
                  className="px-4 py-2 rounded-xl text-[14px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
                >
                  {upsellPending ? 'Adding…' : 'Add to Order'}
                </button>
                <button
                  onClick={() => setUpsellDismissed(true)}
                  className="px-4 py-2 rounded-xl text-[14px] font-medium text-gray-500"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentProvider === 'helcim' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
            <p className="text-[13px] text-blue-800">
              A small processing fee will be added at checkout to cover card transaction costs.
            </p>
          </div>
        )}

        {state === 'error' && (
          <p className="text-[13px] text-red-600 font-medium">{errorMsg}</p>
        )}

        {paymentProvider === null ? (
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-5 py-4 text-center">
            <p className="text-[15px] font-medium text-gray-700">Online payment isn&apos;t set up yet.</p>
            <p className="text-[13px] text-gray-500 mt-1">Please contact {session.businessName} directly to arrange payment.</p>
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={state === 'loading'}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1a3070, #2a52a0)' }}
          >
            {state === 'loading' ? 'Preparing payment…' : `Pay $${displayAmount.toFixed(2)}`}
          </button>
        )}

        {paymentProvider && (
          <p className="text-[12px] text-gray-400 text-center">
            Invoice #{String(order.order_number ?? 0).padStart(4, '0')} · Secured by {paymentProvider === 'stripe' ? 'Stripe' : 'Helcim'}
          </p>
        )}

        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <PoweredByFooter />
        </div>
      </div>
    </div>
  )
}
