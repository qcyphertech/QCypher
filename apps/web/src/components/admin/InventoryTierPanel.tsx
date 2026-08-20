'use client'

import { useEffect, useState, useTransition } from 'react'
import { Package } from 'lucide-react'
import { getTenantInventoryTierAdmin, setTenantInventoryTier, type InventoryTier } from '@/lib/actions/catalog'

export function InventoryTierPanel({ tenantId }: { tenantId: string }) {
  const [tier, setTier] = useState<InventoryTier | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => { getTenantInventoryTierAdmin(tenantId).then(setTier) }, [tenantId])

  function handleChange(next: InventoryTier) {
    setTier(next) // optimistic
    startTransition(async () => {
      try {
        await setTenantInventoryTier(tenantId, next)
      } catch {
        getTenantInventoryTierAdmin(tenantId).then(setTier) // revert on failure
      }
    })
  }

  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
        <h2 className="text-[15px] font-semibold">Inventory tier</h2>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
          Lite covers products and services. Full adds images, reorder points, expiry dates, and rental tracking — the tenant turns those on themselves in Settings once granted.
        </p>
      </div>
      <div className="flex items-center gap-3.5 px-5 py-3.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Package className="w-4 h-4" style={{ color: '#f59e0b' }} />
        </div>
        <div className="flex-1">
          {tier === null ? (
            <p className="text-[15px] text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : (
            <div className="flex gap-2">
              {(['lite', 'full'] as const).map(t => (
                <button
                  key={t}
                  disabled={isPending}
                  onClick={() => handleChange(t)}
                  className="px-4 py-2 rounded-xl text-[14px] font-bold transition-colors disabled:opacity-50"
                  style={{
                    background: tier === t ? 'linear-gradient(135deg,#2a52a0,#4a9db5)' : 'hsl(var(--muted))',
                    color: tier === t ? '#fff' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {t === 'lite' ? 'Lite' : 'Full'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
