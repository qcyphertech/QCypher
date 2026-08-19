'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { deleteTenantAccount } from '@/lib/actions/admin-console'

export function DeleteTenantPanel({ tenantId, tenantName, status }: {
  tenantId: string
  tenantName: string
  status: string
}) {
  const [showModal, setShowModal] = useState(false)

  if (status === 'deleted') return null

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(220,38,38,0.3)' }}>
      <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ background: 'rgba(220,38,38,0.05)' }}>
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: '#dc2626' }}>Danger Zone</h2>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Permanently delete this account and all its contacts, notes, and calendar events. This cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-[14px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete account
        </button>
      </div>
      {showModal && <ConfirmModal tenantId={tenantId} tenantName={tenantName} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function ConfirmModal({ tenantId, tenantName, onClose }: {
  tenantId: string
  tenantName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteTenantAccount(tenantId, confirmText)
      if (!result.ok) { setError(result.error); return }
      router.push('/admin')
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: '#dc2626' }}>
            <AlertTriangle className="w-4 h-4" /> Delete this account?
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[14px]" style={{ color: 'hsl(var(--foreground))' }}>
            This immediately and permanently deletes <strong>{tenantName}</strong> — all contacts, notes, and calendar events. There is no grace period and no undo. Team members will still be able to log in, but will find an empty, deleted account.
          </p>

          <div className="space-y-1.5">
            <label className="text-[14px] font-medium">
              Type <strong>{tenantName}</strong> to confirm
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-red-400"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-[14px] text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending || confirmText.trim() !== tenantName}
              className="bg-red-600 text-white text-[15px] font-semibold px-5 py-2 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              {isPending ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))]">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
