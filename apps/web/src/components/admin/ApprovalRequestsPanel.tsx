'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Clock, Inbox, History as HistoryIcon } from 'lucide-react'
import { listApprovalRequests, decideApprovalRequest, type ApprovalRequest, type ApprovalStatus } from '@/lib/actions/approvals'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'

const REQUEST_LABEL: Record<string, string> = {
  delete_account: 'Delete account',
  change_plan: 'Change plan',
  enable_integration: 'Enable integration',
  disable_integration: 'Disable integration',
}

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  denied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ApprovalRequestsPanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [reasonFor, setReasonFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  function load() {
    setLoading(true)
    listApprovalRequests().then(r => { setRequests(r); setLoading(false) })
  }

  useEffect(load, [])

  function decide(id: string, status: 'approved' | 'denied') {
    startTransition(async () => {
      await decideApprovalRequest(id, status, reason || undefined)
      setReasonFor(null); setReason('')
      load()
    })
  }

  const pending = requests.filter(r => r.status === 'pending')
  const decided = requests.filter(r => r.status !== 'pending')

  if (loading) return <PanelSkeleton />

  return (
    <div className="space-y-8 max-w-[60rem] mx-auto">
      <div>
        <SectionHeader icon={Inbox} label="Pending" count={pending.length} accent />
        {pending.length === 0 ? (
          <EmptyState icon={Inbox} message="No pending requests." />
        ) : (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft divide-y divide-[hsl(var(--border))] overflow-hidden">
            {pending.map(r => (
              <div key={r.id} className="p-4 space-y-2 hover:bg-[hsl(var(--muted))]/30 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[15px] font-medium">{REQUEST_LABEL[r.request_type] ?? r.request_type} — {r.tenant_name}</p>
                    <p className="text-[15px] text-[hsl(var(--muted-foreground))]">
                      Requested by {r.requested_by_email} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.details && <p className="text-[15px] text-[hsl(var(--muted-foreground))] font-mono mt-1">{JSON.stringify(r.details)}</p>}
                  </div>
                  <span className={`flex items-center gap-1 text-[15px] px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE.pending}`}>
                    <Clock className="w-3 h-3" /> pending
                  </span>
                </div>
                {reasonFor === r.id ? (
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-transparent outline-none"
                    />
                    <button disabled={isPending} onClick={() => decide(r.id, 'approved')} className="text-[15px] font-medium text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10">Approve</button>
                    <button disabled={isPending} onClick={() => decide(r.id, 'denied')} className="text-[15px] font-medium text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-500/10">Deny</button>
                    <button onClick={() => { setReasonFor(null); setReason('') }} className="text-[15px] text-[hsl(var(--muted-foreground))] px-2">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setReasonFor(r.id)} className="text-[15px] font-medium text-accent px-2 py-1 rounded-lg hover:bg-accent/10">
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader icon={HistoryIcon} label="History" count={decided.length} />
        {decided.length === 0 ? (
          <EmptyState icon={HistoryIcon} message="No decided requests yet." />
        ) : (
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft divide-y divide-[hsl(var(--border))] overflow-hidden">
            {decided.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-2 hover:bg-[hsl(var(--muted))]/30 transition-colors">
                <div>
                  <p className="text-[15px] font-medium">{REQUEST_LABEL[r.request_type] ?? r.request_type} — {r.tenant_name}</p>
                  <p className="text-[15px] text-[hsl(var(--muted-foreground))]">{r.requested_by_email} · {new Date(r.updated_at).toLocaleDateString()}</p>
                  {r.approval_reason && <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-1">"{r.approval_reason}"</p>}
                </div>
                <span className={`flex items-center gap-1 text-[15px] px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>
                  {r.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
