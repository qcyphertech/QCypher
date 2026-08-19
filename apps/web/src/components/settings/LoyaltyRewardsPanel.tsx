'use client'

import { useState, useTransition } from 'react'
import { Medal, Trophy, type LucideIcon } from 'lucide-react'
import { updateLoyaltySettings, type LoyaltySettings } from '@/lib/actions/loyalty'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }
const labelCls = 'text-[12px] font-bold uppercase tracking-wider'
const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent'

function TierRow({ icon: Icon, iconColor, name, minAmount, discountPercent, onMinChange, onDiscountChange }: {
  icon: LucideIcon; iconColor: string; name: string; minAmount: number; discountPercent: number
  onMinChange: (v: number) => void; onDiscountChange: (v: number) => void
}) {
  return (
    <div className="p-4 space-y-2">
      <p className="text-[15px] font-bold flex items-center gap-1.5" style={{ color: 'hsl(var(--foreground))' }}>
        <Icon style={{ width: '16px', height: '16px', color: iconColor }} fill="currentColor" strokeWidth={1} />
        {name}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Min. lifetime spend</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>$</span>
            <input type="number" min="0" value={minAmount} onChange={e => onMinChange(Number(e.target.value))} className={`${inputCls} pl-6`} style={{ color: 'hsl(var(--foreground))' }} />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Discount</label>
          <div className="relative">
            <input type="number" min="0" max="100" value={discountPercent} onChange={e => onDiscountChange(Number(e.target.value))} className={`${inputCls} pr-7`} style={{ color: 'hsl(var(--foreground))' }} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoyaltyRewardsPanel({ initial }: { initial: LoyaltySettings }) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState(initial)

  function patch<K extends keyof LoyaltySettings>(key: K, value: LoyaltySettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const { tenant_id, ...input } = settings
      void tenant_id
      const result = await updateLoyaltySettings(input)
      if (!result.ok) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <p className="text-[13px] font-bold uppercase tracking-wider mb-3 px-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Customer tiers
      </p>
      <div className={card.toString()} style={card}>
        <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <span className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Enable tier discounts</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.tier_program_enabled} onChange={e => patch('tier_program_enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-6 bg-[hsl(var(--muted))] peer-checked:bg-accent rounded-full transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform relative" />
          </label>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          <TierRow icon={Medal} iconColor="#b45309" name="Bronze" minAmount={settings.bronze_min_amount} discountPercent={settings.bronze_discount_percent}
            onMinChange={v => patch('bronze_min_amount', v)} onDiscountChange={v => patch('bronze_discount_percent', v)} />
          <TierRow icon={Medal} iconColor="#64748b" name="Silver" minAmount={settings.silver_min_amount} discountPercent={settings.silver_discount_percent}
            onMinChange={v => patch('silver_min_amount', v)} onDiscountChange={v => patch('silver_discount_percent', v)} />
          <TierRow icon={Trophy} iconColor="#ca8a04" name="Gold" minAmount={settings.gold_min_amount} discountPercent={settings.gold_discount_percent}
            onMinChange={v => patch('gold_min_amount', v)} onDiscountChange={v => patch('gold_discount_percent', v)} />
        </div>
      </div>

      <p className="text-[13px] font-bold uppercase tracking-wider mb-3 mt-6 px-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Customer referrals
      </p>
      <div style={card}>
        <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <span className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Enable referral credit</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.referral_program_enabled} onChange={e => patch('referral_program_enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-6 bg-[hsl(var(--muted))] peer-checked:bg-accent rounded-full transition-colors peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform relative" />
          </label>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Credit per referral</label>
            <div className="relative max-w-[160px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>$</span>
              <input type="number" min="0" value={settings.referral_credit_amount} onChange={e => patch('referral_credit_amount', Number(e.target.value))} className={`${inputCls} pl-6`} style={{ color: 'hsl(var(--foreground))' }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[14px]" style={{ color: 'hsl(var(--foreground))' }}>
            <input type="checkbox" checked={settings.referral_requires_completion} onChange={e => patch('referral_requires_completion', e.target.checked)} />
            Only credit after the referred customer's first paid job
          </label>
        </div>
      </div>

      {error && <p className="text-[14px] text-red-500 mt-3">{error}</p>}

      {saved && (
        <div
          className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-semibold"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[12px] font-bold" style={{ background: '#059669' }}>✓</span>
          Settings saved
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={pending}
        className="mt-4 px-5 py-2.5 rounded-xl font-bold text-[15px] text-white disabled:opacity-50 transition-all active:scale-[0.98]"
        style={saved
          ? { background: '#059669' }
          : { background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))' }
        }
      >
        {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
      </button>
    </div>
  )
}
