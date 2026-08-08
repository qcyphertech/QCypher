'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { createApprovalRequest, listApprovalRequests, type ApprovalRequest } from '@/lib/actions/approvals'

export function RequestActionsPanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isPending, startTransition] = useTransition()
  const [plan, setPlan] = useState('')
  const [error, setError] = useState<string | null>(null)

  function load() {
    listApprovalRequests().then(setRequests)
  }
  useEffect(load, [])

  function submit(type: 'change_plan', details?: Record<string, unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await createApprovalRequest(type, details)
        setPlan('')
        load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <p className="text-[15px] font-medium text-amber-700 dark:text-amber-400">Pending requests</p>
          {pending.map(r => (
            <p key={r.id} className="text-[15px] text-[hsl(var(--muted-foreground))]">
              {r.request_type.replace('_', ' ')} — submitted {new Date(r.created_at).toLocaleDateString()}, awaiting review
            </p>
          ))}
        </div>
      )}

      {error && <p className="text-[15px] text-red-500">{error}</p>}

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-accent" />
          <p className="text-[15px] font-medium">Change plan</p>
        </div>
        <p className="text-[15px] text-[hsl(var(--muted-foreground))]">Requesting a plan change goes to QCypher for approval.</p>
        <div className="flex gap-2">
          <input
            value={plan}
            onChange={e => setPlan(e.target.value)}
            placeholder="e.g. Growth"
            className="flex-1 text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-transparent outline-none"
          />
          <button
            disabled={isPending || !plan.trim()}
            onClick={() => submit('change_plan', { new_plan: plan.trim() })}
            className="text-[15px] font-medium bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-40"
          >
            Request
          </button>
        </div>
      </div>
    </div>
  )
}
