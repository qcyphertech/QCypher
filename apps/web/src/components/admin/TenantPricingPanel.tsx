'use client'

import { useEffect, useState, useTransition } from 'react'
import { DollarSign, Edit3, X } from 'lucide-react'
import {
  getTenantPricing, setTenantPricing, clearTenantPricing,
  type CustomerPricing,
} from '@/lib/actions/pricing'
import { BASE_PRICING, type PriceTier, type PricingReason } from '@/lib/pricing-constants'

const TIER_LABEL: Record<PriceTier, string> = { starter: 'Starter', growth: 'Growth', all_in: 'All-In' }
const REASON_LABEL: Record<PricingReason, string> = {
  negotiated_discount: 'Negotiated discount', volume_deal: 'Volume deal', retention: 'Retention', non_profit: 'Non-profit',
}

export function TenantPricingPanel({ tenantId }: { tenantId: string }) {
  const [pricing, setPricing] = useState<CustomerPricing | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function load() {
    setLoading(true)
    getTenantPricing(tenantId).then(p => { setPricing(p); setLoading(false) })
  }
  useEffect(load, [tenantId])

  const tier = pricing?.base_price_tier ?? 'growth'
  const oneTime = pricing?.override_one_time_amount ?? BASE_PRICING[tier].oneTime
  const monthly = pricing?.override_monthly_amount ?? BASE_PRICING[tier].monthly
  const hasOverride = !!pricing && (pricing.override_monthly_amount !== null || pricing.override_one_time_amount !== null)

  function handleClear() {
    startTransition(async () => {
      await clearTenantPricing(tenantId)
      load()
    })
  }

  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Pricing</h2>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            {loading ? 'Loading…' : `${TIER_LABEL[tier]} — $${oneTime} + $${monthly}/mo${hasOverride ? ' (custom)' : ''}`}
          </p>
          {!loading && pricing?.next_billing_date && (
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">Next billing: {pricing.next_billing_date}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-[14px] font-medium text-accent px-3 py-1.5 rounded-lg hover:bg-accent/10"
        >
          <Edit3 className="w-3.5 h-3.5" /> Override Pricing
        </button>
      </div>

      {hasOverride && pricing && (
        <div className="px-5 py-4 space-y-1.5">
          {pricing.reason && (
            <p className="text-[14px]"><span className="text-[hsl(var(--muted-foreground))]">Reason:</span> {REASON_LABEL[pricing.reason]}</p>
          )}
          {pricing.notes && (
            <p className="text-[14px] text-[hsl(var(--muted-foreground))]">"{pricing.notes}"</p>
          )}
          <button
            onClick={handleClear}
            disabled={isPending}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline mt-1"
          >
            Remove override — revert to standard {TIER_LABEL[tier]} pricing
          </button>
        </div>
      )}

      {showModal && (
        <PricingModal
          tenantId={tenantId}
          initial={pricing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}

function PricingModal({ tenantId, initial, onClose, onSaved }: {
  tenantId: string
  initial: CustomerPricing | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tier, setTier] = useState<PriceTier>(initial?.base_price_tier ?? 'growth')
  const [overrideOneTime, setOverrideOneTime] = useState(initial?.override_one_time_amount?.toString() ?? '')
  const [overrideMonthly, setOverrideMonthly] = useState(initial?.override_monthly_amount?.toString() ?? '')
  const [reason, setReason] = useState<PricingReason | ''>(initial?.reason ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [nextBillingDate, setNextBillingDate] = useState(initial?.next_billing_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await setTenantPricing(tenantId, {
          base_price_tier: tier,
          override_one_time_amount: overrideOneTime.trim() ? Number(overrideOneTime) : null,
          override_monthly_amount: overrideMonthly.trim() ? Number(overrideMonthly) : null,
          reason: reason || null,
          notes: notes.trim() || null,
          next_billing_date: nextBillingDate || null,
        })
        onSaved()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-accent" /> Override Pricing</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[14px] font-medium">Base tier</label>
            <select value={tier} onChange={e => setTier(e.target.value as PriceTier)} className={inputCls}>
              <option value="starter">Starter (${BASE_PRICING.starter.oneTime} + ${BASE_PRICING.starter.monthly}/mo)</option>
              <option value="growth">Growth (${BASE_PRICING.growth.oneTime} + ${BASE_PRICING.growth.monthly}/mo)</option>
              <option value="all_in">All-In (${BASE_PRICING.all_in.oneTime} + ${BASE_PRICING.all_in.monthly}/mo)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Override one-time ($)</label>
              <input type="number" min="0" step="0.01" value={overrideOneTime} onChange={e => setOverrideOneTime(e.target.value)} placeholder={`${BASE_PRICING[tier].oneTime}`} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] font-medium">Override monthly ($)</label>
              <input type="number" min="0" step="0.01" value={overrideMonthly} onChange={e => setOverrideMonthly(e.target.value)} placeholder={`${BASE_PRICING[tier].monthly}`} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[14px] font-medium">Next billing date</label>
            <input type="date" value={nextBillingDate ?? ''} onChange={e => setNextBillingDate(e.target.value)} className={inputCls} />
            <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Powers the automated 7-day renewal reminder email. Leave blank to disable it for this tenant.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[14px] font-medium">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value as PricingReason | '')} className={inputCls}>
              <option value="">— Select —</option>
              <option value="negotiated_discount">Negotiated discount</option>
              <option value="volume_deal">Volume deal</option>
              <option value="retention">Retention</option>
              <option value="non_profit">Non-profit</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[14px] font-medium">Internal notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Closed large contract, 20% discount negotiated" className={inputCls} />
          </div>

          {error && <p className="text-[14px] text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save Custom Pricing'}
            </button>
            <button onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
