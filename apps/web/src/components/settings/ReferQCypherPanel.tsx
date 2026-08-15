'use client'

import { useState, useTransition } from 'react'
import { claimTenantReferral, type TenantReferral } from '@/lib/actions/tenant-referrals'

const STATUS_LABEL: Record<TenantReferral['status'], { label: string; color: string }> = {
  completed: { label: 'Ready to claim', color: '#0ea5e9' },
  claimed: { label: 'Claimed — pending QCypher', color: '#eab308' },
  fulfilled: { label: 'Fulfilled', color: '#10b981' },
}

function ClaimRow({ referral, onClaimed }: { referral: TenantReferral; onClaimed: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const status = STATUS_LABEL[referral.status]

  function claim(creditType: 'discount' | 'balance') {
    setError(null)
    startTransition(async () => {
      const result = await claimTenantReferral(referral.id, creditType)
      if (!result.ok) { setError(result.error); return }
      onClaimed()
    })
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
          {referral.referred_tenant_name ?? 'Referred business'}
        </p>
        <p className="text-[13px]" style={{ color: status.color }}>{status.label}</p>
        {error && <p className="text-[13px] text-red-500 mt-1">{error}</p>}
      </div>
      {referral.status === 'completed' && (
        <div className="flex gap-2 shrink-0">
          <button disabled={pending} onClick={() => claim('discount')} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50">
            ${referral.credit_amount} discount
          </button>
          <button disabled={pending} onClick={() => claim('balance')} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50">
            ${referral.credit_amount} balance
          </button>
        </div>
      )}
    </div>
  )
}

export function ReferQCypherPanel({ initial }: { initial: TenantReferral[] }) {
  const [referrals, setReferrals] = useState(initial)

  return (
    <div style={{ maxWidth: '640px' }}>
      <p className="text-[14px] mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Know another service business that could use QCypher? Have a QCypher admin tag your referral when they invite them —
        once they're onboarded, you can claim your reward here. QCypher applies it by hand within a few business days.
      </p>
      {referrals.length === 0 ? (
        <div className="rounded-2xl border border-[hsl(var(--border))] px-4 py-6 text-center text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No referrals yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {referrals.map(r => (
            <ClaimRow
              key={r.id}
              referral={r}
              onClaimed={() => setReferrals(prev => prev.map(x => x.id === r.id ? { ...x, status: 'claimed' } : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
