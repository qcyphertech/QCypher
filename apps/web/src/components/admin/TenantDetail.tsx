'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, AlertCircle, RefreshCw, Send, Loader2 } from 'lucide-react'
import { toggleChecklist } from '@/lib/actions/admin'
import { TenantModulesPanel } from '@/components/admin/TenantModulesPanel'
import type { ServiceStat, ChecklistRow, ServiceName } from '@/lib/actions/admin'

const SERVICE_LABELS: Record<ServiceName, string> = {
  reviews:     'Review Requests',
  scheduler:   'Online Scheduler',
  missed_call: 'Missed-Call Text-Back',
  backup:      'Security & Backup',
}

type Tenant = {
  id: string; name: string; slug: string; plan: string
  status: string; created_at: string
}

type Props = {
  tenant: Tenant
  stats: ServiceStat[]
  checklist: ChecklistRow[]
}

export function TenantDetail({ tenant, stats, checklist: initialChecklist }: Props) {
  const router = useRouter()
  const [checklist, setChecklist] = useState(initialChecklist)
  const [isPending, startTransition] = useTransition()
  const [reportEmail, setReportEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [reportResult, setReportResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleToggle(row: ChecklistRow) {
    const next = !row.completed
    // Optimistic update
    setChecklist(prev => prev.map(r => r.id === row.id
      ? { ...r, completed: next, completed_at: next ? new Date().toISOString() : null }
      : r
    ))
    startTransition(async () => {
      await toggleChecklist(row.id, tenant.id, next)
    })
  }

  async function sendReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportEmail) return
    setSending(true)
    setReportResult(null)
    try {
      const res = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, recipientEmail: reportEmail }),
      })
      const json = await res.json()
      if (json.preview) {
        setReportResult({ ok: true, message: `Preview (no Resend key): subject — ${json.subject}` })
      } else if (json.ok) {
        setReportResult({ ok: true, message: `Report sent to ${reportEmail}` })
      } else {
        setReportResult({ ok: false, message: json.error ?? 'Failed' })
      }
    } catch (e) {
      setReportResult({ ok: false, message: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setSending(false)
    }
  }

  const completedCount = checklist.filter(r => r.completed).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + heading */}
      <div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 text-[15px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to admin
        </button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">{tenant.name}</h1>
            <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">
              /{tenant.slug} · {tenant.plan} · {tenant.status}
            </p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="ml-auto p-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      </div>

      {/* 14A — Services panel */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-[15px] font-semibold">Services Included</h2>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Live data from this billing cycle — read only
          </p>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {stats.map(stat => (
            <div key={stat.name} className="flex items-center gap-4 px-5 py-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                stat.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {stat.status === 'active'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium">{stat.label}</p>
                {stat.detail && (
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{stat.detail}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[15px] font-semibold">{stat.value}</p>
                <p className={`text-[12px] font-medium mt-0.5 ${
                  stat.status === 'active'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {stat.status === 'active' ? 'Active' : 'Needs attention'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modules — per-tenant module access, gated by super admin */}
      <TenantModulesPanel tenantId={tenant.id} />

      {/* 14B — Ops checklist */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Monthly Ops Checklist</h2>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {completedCount}/{checklist.length} completed this month
            </p>
          </div>
          <div className="flex gap-1">
            {checklist.map(r => (
              <div key={r.id} className={`w-2 h-2 rounded-full ${r.completed ? 'bg-emerald-500' : 'bg-[hsl(var(--border))]'}`} />
            ))}
          </div>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {checklist.map(row => (
            <label
              key={row.id}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[hsl(var(--muted))]/40 transition-colors"
            >
              <input
                type="checkbox"
                checked={row.completed}
                disabled={isPending}
                onChange={() => handleToggle(row)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <div className="flex-1">
                <p className={`text-[15px] font-medium ${row.completed ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>
                  {SERVICE_LABELS[row.service_name as ServiceName] ?? row.service_name}
                </p>
                {row.completed && row.completed_at && (
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Checked {new Date(row.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </div>
              {row.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
            </label>
          ))}
        </div>
      </div>

      {/* 14C — Monthly report */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-[15px] font-semibold">Monthly Customer Report</h2>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Assembles real numbers from this billing cycle, writes a short summary via AI, sends via email.
            AI only narrates the pre-computed figures — it cannot invent or estimate any number.
          </p>
        </div>
        <form onSubmit={sendReport} className="px-5 py-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="email"
              required
              value={reportEmail}
              onChange={e => setReportEmail(e.target.value)}
              placeholder="owner@example.com"
              className="flex-1 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-accent text-white text-[15px] font-medium px-4 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </div>
          {reportResult && (
            <p className={`text-[13px] font-medium ${reportResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {reportResult.message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
