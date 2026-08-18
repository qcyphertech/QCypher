'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Send, CheckCircle2 } from 'lucide-react'
import {
  listIncidents, updateIncidentStatus, reportIncidentManually,
  sendInitialCustomerNotification, sendRootCauseSummary,
  type Incident, type IncidentStatus, type IncidentType, type IncidentSeverity,
} from '@/lib/actions/incidents'
import type { TenantSummary } from '@/lib/actions/admin-console'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'

const TYPE_LABEL: Record<IncidentType, string> = {
  unauthorized_access: 'Unauthorized access',
  breach_attempt: 'Breach attempt',
  data_exposure: 'Data exposure',
  system_anomaly: 'System anomaly',
}

const SEVERITY_STYLE: Record<IncidentSeverity, string> = {
  low: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_STYLE: Record<IncidentStatus, string> = {
  detected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_ORDER: IncidentStatus[] = ['detected', 'investigating', 'confirmed', 'resolved']

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function IncidentsPanel({ tenants }: { tenants: TenantSummary[] }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showReportForm, setShowReportForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function load() {
    setLoading(true)
    listIncidents().then(r => { setIncidents(r); setLoading(false) })
  }
  useEffect(load, [])

  const active = incidents.filter(i => i.status !== 'resolved')
  const resolved = incidents.filter(i => i.status === 'resolved')

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Incidents</h2>
        <button
          onClick={() => setShowReportForm(true)}
          className="flex items-center gap-1.5 text-[14px] font-medium bg-accent text-white px-4 py-2 rounded-xl shadow-sm hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> Report incident manually
        </button>
      </div>

      {loading ? (
        <PanelSkeleton />
      ) : (
        <>
          <div>
            <SectionHeader icon={AlertTriangle} label="Active" count={active.length} accent={active.length > 0} />
            {active.length === 0 ? (
              <EmptyState icon={AlertTriangle} message="No active incidents." />
            ) : (
              <div className="space-y-3">
                {active.map(inc => (
                  <IncidentCard
                    key={inc.id} incident={inc}
                    expanded={expanded === inc.id}
                    onToggle={() => setExpanded(e => e === inc.id ? null : inc.id)}
                    isPending={isPending}
                    onRefresh={load}
                    startTransition={startTransition as (fn: () => void | Promise<void>) => void}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={CheckCircle2} label="Resolved" count={resolved.length} />
            {resolved.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No resolved incidents yet." />
            ) : (
              <div className="space-y-3">
                {resolved.map(inc => (
                  <IncidentCard
                    key={inc.id} incident={inc}
                    expanded={expanded === inc.id}
                    onToggle={() => setExpanded(e => e === inc.id ? null : inc.id)}
                    isPending={isPending}
                    onRefresh={load}
                    startTransition={startTransition as (fn: () => void | Promise<void>) => void}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showReportForm && (
        <ReportIncidentModal tenants={tenants} onClose={() => setShowReportForm(false)} onCreated={load} />
      )}
    </div>
  )
}

function IncidentCard({ incident, expanded, onToggle, isPending, onRefresh, startTransition }: {
  incident: Incident
  expanded: boolean
  onToggle: () => void
  isPending: boolean
  onRefresh: () => void
  startTransition: (fn: () => void | Promise<void>) => void
}) {
  const [rootCause, setRootCause] = useState(incident.root_cause ?? '')
  const [remediation, setRemediation] = useState(incident.remediation ?? '')
  const [affectedData, setAffectedData] = useState('customer records')
  const [actionsTaken, setActionsTaken] = useState('We’ve reviewed access and secured the affected area.')
  const [error, setError] = useState<string | null>(null)

  function advance(status: IncidentStatus) {
    setError(null)
    startTransition(async () => {
      try {
        await updateIncidentStatus(incident.id, status, { root_cause: rootCause || undefined, remediation: remediation || undefined })
        onRefresh()
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  function notify() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendInitialCustomerNotification(incident.id, {
          incidentTypeLabel: TYPE_LABEL[incident.incident_type].toLowerCase(),
          affectedData, actionsTaken,
        })
        if (result.ok) onRefresh()
        else setError(result.error)
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  function summary() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendRootCauseSummary(incident.id)
        if (result.ok) onRefresh()
        else setError(result.error)
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(incident.status) + 1]

  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium">{TYPE_LABEL[incident.incident_type]} — {incident.tenant_name}</p>
          <p className="text-[15px] text-[hsl(var(--muted-foreground))]">Detected {fmt(incident.detected_at)} · {incident.detected_by === 'automated_cron' ? 'Automated' : 'Manual report'}</p>
        </div>
        <span className={`text-[15px] px-2.5 py-1 rounded-full font-medium capitalize ${SEVERITY_STYLE[incident.severity]}`}>{incident.severity}</span>
        <span className={`text-[15px] px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLE[incident.status]}`}>{incident.status}</span>
        {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-[hsl(var(--border))]">
          <p className="text-[15px] text-[hsl(var(--muted-foreground))]">{incident.description}</p>

          {/* Timeline */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[hsl(var(--muted-foreground))]">
            <span>Detected: {fmt(incident.detected_at)}</span>
            <span>Notified: {fmt(incident.timeline?.notified_at ?? null)}</span>
            <span>Root cause: {fmt(incident.timeline?.confirmed_at ?? null)}</span>
            <span>Resolved: {fmt(incident.timeline?.resolved_at ?? null)}</span>
          </div>

          {error && <p className="text-[15px] text-red-500">{error}</p>}

          {/* Status progression */}
          {incident.status !== 'resolved' && (
            <div className="flex items-center gap-2">
              <button disabled={isPending} onClick={() => advance(nextStatus)} className="text-[15px] font-medium bg-accent text-white px-3.5 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-40">
                Mark as {nextStatus}
              </button>
            </div>
          )}

          {/* Root cause / remediation */}
          <div className="space-y-2">
            {rootCause.startsWith('[DRAFT') && (
              <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Auto-drafted from detection data — review and edit before sending to a customer
              </p>
            )}
            <label className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Root cause</label>
            <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={3}
              placeholder="What happened and why (plain English)"
              className="w-full text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-2 bg-transparent outline-none" />
            <label className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Remediation</label>
            <textarea value={remediation} onChange={e => setRemediation(e.target.value)} rows={3}
              placeholder="What we fixed / how we're preventing it"
              className="w-full text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-2 bg-transparent outline-none" />
            <button disabled={isPending} onClick={() => advance(incident.status)} className="text-[15px] font-medium text-accent px-2 py-1 rounded-lg hover:bg-accent/10">
              Save root cause / remediation
            </button>
          </div>

          {/* Customer notification (only for tenant-scoped incidents) */}
          {incident.tenant_id && (
            <div className="rounded-xl border border-[hsl(var(--border))] p-3 space-y-2">
              <p className="text-[13px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Customer notification</p>
              {!incident.customers_notified ? (
                <>
                  <input value={affectedData} onChange={e => setAffectedData(e.target.value)} placeholder="Affected data (vague, e.g. 'customer records')"
                    className="w-full text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-transparent outline-none" />
                  <input value={actionsTaken} onChange={e => setActionsTaken(e.target.value)} placeholder="Actions taken so far"
                    className="w-full text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-transparent outline-none" />
                  <button disabled={isPending} onClick={notify} className="flex items-center gap-1.5 text-[15px] font-medium bg-accent text-white px-3.5 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-40">
                    <Send className="w-3.5 h-3.5" /> Send initial notification
                  </button>
                </>
              ) : (
                <p className="text-[15px] flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Notified {fmt(incident.notification_sent_at)}</p>
              )}

              {incident.customers_notified && !incident.summary_sent_at && (
                <>
                  <button
                    disabled={isPending || !rootCause || rootCause.startsWith('[DRAFT')}
                    onClick={summary}
                    title={rootCause.startsWith('[DRAFT') ? 'Edit the auto-drafted root cause before sending' : undefined}
                    className="flex items-center gap-1.5 text-[15px] font-medium bg-accent text-white px-3.5 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" /> Send root cause summary
                  </button>
                  {rootCause.startsWith('[DRAFT') && (
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Save an edited root cause (with the [DRAFT] marker removed) to enable sending.</p>
                  )}
                </>
              )}
              {incident.summary_sent_at && (
                <p className="text-[15px] flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Summary sent {fmt(incident.summary_sent_at)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportIncidentModal({ tenants, onClose, onCreated }: { tenants: TenantSummary[]; onClose: () => void; onCreated: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ incident_type: IncidentType; severity: IncidentSeverity; tenant_id: string; description: string }>({
    incident_type: 'unauthorized_access', severity: 'medium', tenant_id: '', description: '',
  })

  function submit() {
    setError(null)
    startTransition(async () => {
      try {
        await reportIncidentManually({ ...form, tenant_id: form.tenant_id || undefined })
        onCreated()
        onClose()
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    })
  }

  const inputCls = 'w-full text-[15px] rounded-lg border border-[hsl(var(--border))] px-3 py-2 bg-transparent outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-[15px] font-semibold">Report incident manually</h2>
        </div>
        <div className="p-5 space-y-3">
          <select value={form.incident_type} onChange={e => setForm(f => ({ ...f, incident_type: e.target.value as IncidentType }))} className={inputCls}>
            {Object.entries(TYPE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as IncidentSeverity }))} className={inputCls}>
            {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} className={inputCls}>
            <option value="">System-wide (no specific tenant)</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Describe what happened" className={inputCls} />
          {error && <p className="text-[15px] text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button disabled={isPending || !form.description} onClick={submit} className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create incident'}
            </button>
            <button onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))]">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
