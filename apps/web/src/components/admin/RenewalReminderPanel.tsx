'use client'

import { useState, useTransition } from 'react'
import { Mail, X } from 'lucide-react'
import { sendRenewalReminder } from '@/lib/actions/renewal-reminder'
import { BASE_PRICING, type PriceTier } from '@/lib/pricing-constants'

const TIER_LABEL: Record<PriceTier, string> = { starter: 'Starter', growth: 'Growth', all_in: 'All-In' }

export function RenewalReminderPanel({ tenantId }: { tenantId: string }) {
  const [showModal, setShowModal] = useState(false)
  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Renewal Reminder</h2>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Manually send the 7-day auto-renewal disclosure email
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-[14px] font-medium text-accent px-3 py-1.5 rounded-lg hover:bg-accent/10"
        >
          <Mail className="w-3.5 h-3.5" /> Send Reminder
        </button>
      </div>
      {showModal && <ReminderModal tenantId={tenantId} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function ReminderModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [tier, setTier] = useState<PriceTier>('growth')
  const [renewalDate, setRenewalDate] = useState('')
  const [amount, setAmount] = useState(String(BASE_PRICING.growth.monthly))
  const [cardLast4, setCardLast4] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleTierChange(t: PriceTier) {
    setTier(t)
    setAmount(String(BASE_PRICING[t].monthly))
  }

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const result = await sendRenewalReminder({
        tenantId, plan: TIER_LABEL[tier], renewalDate, amount: Number(amount),
        cardLast4: cardLast4.trim() || undefined,
      })
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-accent" /> Send Renewal Reminder</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]"><X className="w-4 h-4" /></button>
        </div>

        {sent ? (
          <div className="p-5">
            <p className="text-[15px]">Reminder sent to the tenant owner.</p>
            <button onClick={onClose} className="mt-4 text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))]">Close</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
              There's no automated recurring-billing schedule yet, so this sends the disclosure email on demand — fill in the renewal details manually.
            </p>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Plan</label>
              <select value={tier} onChange={e => handleTierChange(e.target.value as PriceTier)} className={inputCls}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="all_in">All-In</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[14px] font-medium">Renewal date</label>
                <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[14px] font-medium">Amount ($)</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Card last 4 (optional)</label>
              <input type="text" maxLength={4} value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, ''))} placeholder="4242" className={inputCls} />
            </div>

            {error && <p className="text-[14px] text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={isPending || !renewalDate || !amount}
                className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isPending ? 'Sending…' : 'Send Reminder'}
              </button>
              <button onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))]">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
