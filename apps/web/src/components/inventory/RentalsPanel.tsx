'use client'

import { useState, useTransition } from 'react'
import { returnRental, type CatalogRental } from '@/lib/actions/catalog-rentals'
import { Key } from 'lucide-react'

const CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'needs_repair', label: 'Needs repair' },
  { value: 'damaged', label: 'Damaged' },
] as const

// Full inventory tier only — the page that renders this already gated on
// tier === 'full' before importing/rendering it.
export function RentalsPanel({ rentals }: { rentals: CatalogRental[] }) {
  const [isPending, startTransition] = useTransition()
  const [returningId, setReturningId] = useState<string | null>(null)

  function handleReturn(id: string, condition: typeof CONDITIONS[number]['value']) {
    startTransition(async () => {
      await returnRental(id, condition)
      setReturningId(null)
    })
  }

  const active = rentals.filter(r => !r.returned_date)
  const returned = rentals.filter(r => r.returned_date)

  if (rentals.length === 0) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-12 flex flex-col items-center gap-3 text-center">
        <Key className="w-8 h-8" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No rentals yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--border))]">
          <p className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Active ({active.length})
          </p>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-6 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Nothing currently rented out</p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {active.map(r => {
              const overdue = new Date(r.due_date) < new Date()
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{r.catalog_items?.name ?? 'Item'}</p>
                    <p className="text-[15px]" style={{ color: overdue ? '#dc2626' : 'hsl(var(--muted-foreground))' }}>
                      Due {new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {overdue ? ' — overdue' : ''}
                    </p>
                  </div>
                  {returningId === r.id ? (
                    <div className="flex items-center gap-2">
                      {CONDITIONS.map(c => (
                        <button key={c.value} disabled={isPending} onClick={() => handleReturn(r.id, c.value)}
                          className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                          {c.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => setReturningId(r.id)}
                      className="text-[15px] font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
                      Mark returned
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {returned.length > 0 && (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          <div className="px-5 py-3 border-b border-[hsl(var(--border))]">
            <p className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Returned
            </p>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {returned.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>{r.catalog_items?.name ?? 'Item'}</p>
                <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {r.condition_on_return === 'good' ? 'Good' : r.condition_on_return === 'needs_repair' ? 'Needs repair' : 'Damaged'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
