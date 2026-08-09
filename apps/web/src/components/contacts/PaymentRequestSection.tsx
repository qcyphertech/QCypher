'use client'

import { useState } from 'react'
import { Copy, MessageSquare, Mail, CheckCircle2 } from 'lucide-react'
import { createPaymentLink, sendPaymentLinkSms, sendPaymentLinkEmail } from '@/lib/actions/payment-requests'
import { useUserRole } from '@/lib/hooks/useUserRole'

type Order = {
  id: string
  total_amount: number
  payment_status: string
  notes: string | null
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function orderLabel(order: { id: string; notes: string | null }) {
  return order.notes || `Order #${order.id.slice(-6).toUpperCase()}`
}

export function PaymentRequestSection({ orders, hasPhone, hasEmail }: { orders: Order[]; hasPhone: boolean; hasEmail: boolean }) {
  const { isAdmin } = useUserRole()
  if (orders.length === 0) return null

  const unpaid = orders.filter(o => o.payment_status !== 'paid' && o.payment_status !== 'refunded')
  const paid = orders.filter(o => o.payment_status === 'paid')

  return (
    <div id="payments" className="space-y-4 scroll-mt-6">
      <h2 className="text-[15px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Payments</h2>

      {unpaid.length > 0 && (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {unpaid.map(order => (
            <OrderRow key={order.id} order={order} isAdmin={isAdmin} hasPhone={hasPhone} hasEmail={hasEmail} />
          ))}
        </div>
      )}

      {paid.length > 0 && (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {paid.map(order => (
            <div key={order.id} className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium">${Number(order.total_amount).toFixed(2)}</p>
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">{orderLabel(order)}</p>
              </div>
              <span className={`text-[13px] px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE.paid}`}>Paid</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order, isAdmin, hasPhone, hasEmail }: { order: Order; isAdmin: boolean; hasPhone: boolean; hasEmail: boolean }) {
  const [busy, setBusy] = useState<'sms' | 'email' | 'copy' | 'cancel' | null>(null)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleCopy() {
    setBusy('copy')
    const { url } = await createPaymentLink(order.id)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setBusy(null)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleSms() {
    setBusy('sms')
    setResult(null)
    const res = await sendPaymentLinkSms(order.id)
    setResult(res.ok ? { ok: true, message: 'Sent via SMS' } : { ok: false, message: res.error })
    setBusy(null)
  }

  async function handleEmail() {
    setBusy('email')
    setResult(null)
    const res = await sendPaymentLinkEmail(order.id)
    setResult(res.ok ? { ok: true, message: 'Sent via email' } : { ok: false, message: res.error })
    setBusy(null)
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">${Number(order.total_amount).toFixed(2)}</p>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">{orderLabel(order)} · {fmtDate(order.created_at)}</p>
        </div>
        <span className={`text-[13px] px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_STYLE[order.payment_status] ?? STATUS_STYLE.draft}`}>
          {order.payment_status}
        </span>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSms}
            disabled={!hasPhone || busy !== null}
            title={!hasPhone ? 'No phone number on file' : undefined}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent px-2.5 py-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageSquare className="w-3.5 h-3.5" /> {busy === 'sms' ? 'Sending…' : 'Request via SMS'}
          </button>
          <button
            onClick={handleEmail}
            disabled={!hasEmail || busy !== null}
            title={!hasEmail ? 'No email on file' : undefined}
            className="flex items-center gap-1.5 text-[13px] font-medium text-accent px-2.5 py-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail className="w-3.5 h-3.5" /> {busy === 'email' ? 'Sending…' : 'Request via Email'}
          </button>
          <button
            onClick={handleCopy}
            disabled={busy !== null}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--muted-foreground))] px-2.5 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {result && (
        <p className={`text-[13px] font-medium ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
