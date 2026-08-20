'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CatalogItemModal } from './CatalogItemModal'
import type { InventoryTier } from '@/lib/actions/catalog'
import type { TenantSettings } from '@/lib/types/settings'

export function NewCatalogItemButton({ tier, toggles }: { tier?: InventoryTier; toggles?: TenantSettings }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>
      {open && <CatalogItemModal onClose={() => setOpen(false)} tier={tier} toggles={toggles} />}
    </>
  )
}
