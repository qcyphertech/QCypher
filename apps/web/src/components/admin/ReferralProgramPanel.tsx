'use client'

import { useEffect, useState, useTransition } from 'react'
import { Gift, CheckCircle2 } from 'lucide-react'
import { listAllTenantReferrals, markTenantReferralFulfilled, type TenantReferral } from '@/lib/actions/tenant-referrals'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'

const STATUS_STYLE: Record<TenantReferral['status'], string> = {
  completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  claimed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  fulfilled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ReferralRow({ referral, onFulfilled }: { referral: TenantReferral; onFulfilled: (id: string) => void }) {
  const [pending, startTransition] = useTransition()

  function markFulfilled() {
    startTransition(async () => {
      const result = await markTenantReferralFulfilled(referral.id)
      if (result.ok) onFulfilled(referral.id)
    })
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold truncate">
          {referral.referrer_tenant_name} <span className="text-[hsl(var(--muted-foreground))] font-normal">referred</span> {referral.referred_tenant_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[referral.status]}`}>
            {referral.status}
          </span>
          <span className="text-[13px] text-[hsl(var(--muted-foreground))]">
            ${referral.credit_amount}{referral.credit_type ? ` · ${referral.credit_type}` : ''} · {fmt(referral.created_at)}
          </span>
        </div>
      </div>
      {referral.status === 'claimed' && (
        <button
          disabled={pending}
          onClick={markFulfilled}
          className="shrink-0 flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark fulfilled
        </button>
      )}
    </div>
  )
}

export function ReferralProgramPanel() {
  const [referrals, setReferrals] = useState<TenantReferral[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listAllTenantReferrals().then(r => { setReferrals(r); setLoading(false) })
  }, [])

  if (loading) return <PanelSkeleton />

  return (
    <div className="space-y-3 max-w-[60rem] mx-auto">
      <SectionHeader icon={Gift} label="Tenant Referrals" count={referrals.length} accent />
      {referrals.length === 0 ? (
        <EmptyState icon={Gift} message="No tenant referrals yet." />
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {referrals.map(r => (
            <ReferralRow
              key={r.id}
              referral={r}
              onFulfilled={id => setReferrals(prev => prev.map(x => x.id === id ? { ...x, status: 'fulfilled', fulfilled_at: new Date().toISOString() } : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
