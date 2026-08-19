'use client'

import { useEffect, useState } from 'react'
import { X, Users, FileText, Lock } from 'lucide-react'
import { startImpersonation, endImpersonation, getTenantSnapshot } from '@/lib/actions/impersonation'

type Snapshot = Awaited<ReturnType<typeof getTenantSnapshot>>

export function TenantSnapshotModal({ tenantId, tenantName, onClose }: {
  tenantId: string
  tenantName: string
  onClose: () => void
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [logId, setLogId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    startImpersonation(tenantId, 'Admin console snapshot view').then(id => { if (!cancelled) setLogId(id) })
    getTenantSnapshot(tenantId).then(s => { if (!cancelled) setSnapshot(s) })
    return () => { cancelled = true }
  }, [tenantId])

  function handleClose() {
    if (logId) endImpersonation(logId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full sm:max-w-lg bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between sticky top-0 bg-[hsl(var(--card))]">
          <div>
            <h2 className="text-[15px] font-semibold">{tenantName}</h2>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <Lock style={{ width: '13px', height: '13px' }} fill="currentColor" strokeWidth={1} />
              Impersonation session — logged
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!snapshot ? (
          <div className="p-8 text-center text-[15px] text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[hsl(var(--muted))] rounded-xl p-4">
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Contacts</p>
                <p className="text-xl font-bold">{snapshot.contactCount}</p>
              </div>
              <div className="bg-[hsl(var(--muted))] rounded-xl p-4">
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Team members</p>
                <p className="text-xl font-bold">{snapshot.members.length}</p>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Team
              </p>
              <div className="space-y-1.5">
                {snapshot.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-[15px]">
                    <span>{m.email}</span>
                    <span className="text-[13px] text-[hsl(var(--muted-foreground))] capitalize">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Recent activity
              </p>
              <div className="space-y-1.5">
                {snapshot.recentAudit.length === 0 && <p className="text-[15px] text-[hsl(var(--muted-foreground))]">No activity yet.</p>}
                {snapshot.recentAudit.map(a => (
                  <div key={a.id} className="text-[15px]">
                    <span className="font-medium">{a.user_email}</span> {a.action}{a.resource_name ? ` — ${a.resource_name}` : ''}
                    <span className="text-[13px] text-[hsl(var(--muted-foreground))]"> · {new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
