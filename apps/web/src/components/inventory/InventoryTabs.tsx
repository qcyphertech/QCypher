'use client'

import { useState } from 'react'
import { RentalsPanel } from './RentalsPanel'
import type { CatalogRental } from '@/lib/actions/catalog-rentals'

export function InventoryTabs({ catalogList, rentals }: { catalogList: React.ReactNode; rentals: CatalogRental[] }) {
  const [tab, setTab] = useState<'items' | 'rentals'>('items')
  const activeRentalCount = rentals.filter(r => !r.returned_date).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['items', 'rentals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-[15px] font-bold transition-colors"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#2a52a0,#4a9db5)' : 'hsl(var(--muted))',
              color: tab === t ? '#fff' : 'hsl(var(--muted-foreground))',
            }}
          >
            {t === 'items' ? 'Items' : `Rentals${activeRentalCount ? ` (${activeRentalCount})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'items' ? catalogList : <RentalsPanel rentals={rentals} />}
    </div>
  )
}
