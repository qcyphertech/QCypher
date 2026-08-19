'use client'

import { useEffect, useState, useTransition } from 'react'
import { ShieldAlert, ShieldCheck, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react'
import { listVulnerabilityScans, getScanFindings, listFindingGroups, resolveFindingGroup, type VulnerabilityScan, type VulnerabilityFinding, type VulnerabilityFindingGroup } from '@/lib/actions/security-scans'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'
import { MfaDevicesPanel } from '@/components/admin/MfaDevicesPanel'

const SEVERITY_STYLE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Low: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  Info: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CountBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null
  return (
    <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded" style={{ color }}>
      {label} {count}
    </span>
  )
}

// Raw per-scan record — read-only historical detail. Remediation tracking
// lives on the deduplicated group (see TrackedFindings/FindingGroupRow
// below), so this no longer offers a resolve action.
function FindingRow({ finding }: { finding: VulnerabilityFinding }) {
  return (
    <div className="px-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${SEVERITY_STYLE[finding.severity]}`}>
          {finding.severity}
        </span>
        <p className="text-[14px] font-semibold truncate">{finding.vulnerability_type ?? 'Unnamed finding'}</p>
      </div>
      {finding.affected_url && (
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">{finding.affected_url}</p>
      )}
      {finding.description && (
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-1">{finding.description}</p>
      )}
    </div>
  )
}

// Deduplicated across scans — this is the primary remediation surface.
// Resolving here reflects "confirmed fixed"; it auto-reopens if the same
// vuln (type+url+parameter) is flagged again on a later scan, so a group
// staying resolved across weeks is a real signal, not a stale checkbox.
function FindingGroupRow({ group, isPending, onResolve }: { group: VulnerabilityFindingGroup; isPending: boolean; onResolve: () => void }) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${SEVERITY_STYLE[group.severity]}`}>
            {group.severity}
          </span>
          <p className="text-[14px] font-semibold truncate">{group.vulnerability_type ?? 'Unnamed finding'}</p>
          {group.is_resolved
            ? <span className="text-[11px] font-semibold text-emerald-600">Resolved</span>
            : <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Seen in {group.occurrence_count} scan{group.occurrence_count === 1 ? '' : 's'}</span>}
        </div>
        {group.affected_url && (
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">{group.affected_url}</p>
        )}
        <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
          First seen {fmtDate(group.first_seen_at)} · Last seen {fmtDate(group.last_seen_at)}
        </p>
        {group.description && (
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-1">{group.description}</p>
        )}
        {group.remediation_advice && (
          <p className="text-[13px] mt-1"><span className="font-semibold">Remediation:</span> {group.remediation_advice}</p>
        )}
      </div>
      {!group.is_resolved && (
        <button
          onClick={onResolve}
          disabled={isPending}
          className="shrink-0 text-[12px] font-semibold px-2.5 py-1 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
        >
          Mark resolved
        </button>
      )}
    </div>
  )
}

function TrackedFindings() {
  const [groups, setGroups] = useState<VulnerabilityFindingGroup[] | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listFindingGroups().then(setGroups)
  }, [])

  function handleResolve(groupId: string) {
    startTransition(async () => {
      const result = await resolveFindingGroup(groupId)
      if (result.ok) {
        setGroups(prev => prev?.map(g => g.id === groupId ? { ...g, is_resolved: true, resolved_at: new Date().toISOString() } : g) ?? null)
      }
    })
  }

  if (groups === null) return <PanelSkeleton />

  const open = groups.filter(g => !g.is_resolved)
  const resolved = groups.filter(g => g.is_resolved)

  return (
    <div className="space-y-3">
      <SectionHeader icon={ShieldAlert} label="Tracked Findings" count={open.length} accent />
      {groups.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="No findings tracked yet — they'll appear here once a scan runs." />
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          {open.length === 0 ? (
            <div className="px-4 py-3"><EmptyState icon={ShieldCheck} message="No open findings — everything tracked has been resolved." /></div>
          ) : (
            open.map(g => <FindingGroupRow key={g.id} group={g} isPending={isPending} onResolve={() => handleResolve(g.id)} />)
          )}
          {resolved.length > 0 && open.length > 0 && (
            <div className="px-4 py-2 bg-[hsl(var(--muted))]/40 border-t border-[hsl(var(--border))]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Resolved ({resolved.length})</p>
            </div>
          )}
          {resolved.map(g => <FindingGroupRow key={g.id} group={g} isPending={isPending} onResolve={() => handleResolve(g.id)} />)}
        </div>
      )}
    </div>
  )
}

function ScanRow({ scan, expanded, onToggle }: { scan: VulnerabilityScan; expanded: boolean; onToggle: () => void }) {
  const [findings, setFindings] = useState<VulnerabilityFinding[] | null>(null)

  useEffect(() => {
    if (expanded && findings === null) {
      getScanFindings(scan.id).then(setFindings)
    }
  }, [expanded, findings, scan.id])

  const totalFindings = scan.critical_count + scan.high_count + scan.medium_count + scan.low_count + scan.info_count

  return (
    <div className="border-b border-[hsl(var(--border))] last:border-0">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[hsl(var(--muted))] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <div className="text-left min-w-0">
            <p className="text-[14px] font-semibold">{fmtDate(scan.scan_date)} · {scan.environment}</p>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
              {scan.status === 'failed' ? `Failed${scan.error_message ? `: ${scan.error_message}` : ''}` : `${totalFindings} finding${totalFindings === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CountBadge label="Crit" count={scan.critical_count} color="#dc2626" />
          <CountBadge label="High" count={scan.high_count} color="#ea580c" />
          <CountBadge label="Med" count={scan.medium_count} color="#d97706" />
          <CountBadge label="Low" count={scan.low_count} color="#0284c7" />
        </div>
      </button>
      {expanded && (
        <div className="bg-[hsl(var(--muted))]/40">
          {findings === null ? (
            <div className="px-4 py-3"><PanelSkeleton /></div>
          ) : findings.length === 0 ? (
            <div className="px-4 py-3"><EmptyState icon={ShieldCheck} message="No findings on this scan." /></div>
          ) : (
            findings.map(f => <FindingRow key={f.id} finding={f} />)
          )}
        </div>
      )}
    </div>
  )
}

export function SecurityPanel() {
  const [scans, setScans] = useState<VulnerabilityScan[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    listVulnerabilityScans().then(r => { setScans(r); setLoading(false) })
  }, [])

  if (loading) return <PanelSkeleton />

  const latest = scans[0]

  return (
    <div className="space-y-6 max-w-[60rem] mx-auto">
      <MfaDevicesPanel />

      <SectionHeader icon={ShieldAlert} label="Vulnerability Scans" count={scans.length} accent />

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">Latest scan</p>
            <p className="text-[15px] font-bold">{fmtDate(latest.scan_date)}</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">Critical</p>
            <p className="text-[19px] font-bold" style={{ color: latest.critical_count > 0 ? '#dc2626' : undefined }}>{latest.critical_count}</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">High</p>
            <p className="text-[19px] font-bold" style={{ color: latest.high_count > 0 ? '#ea580c' : undefined }}>{latest.high_count}</p>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-1">Status</p>
            <p className="text-[15px] font-bold flex items-center gap-1.5">
              {latest.status === 'completed'
                ? <><CheckCircle2 style={{ width: '15px', height: '15px' }} fill="currentColor" strokeWidth={1} className="text-emerald-600" /> Completed</>
                : <><AlertTriangle style={{ width: '15px', height: '15px' }} fill="currentColor" strokeWidth={1} className="text-red-600" /> Failed</>}
            </p>
          </div>
        </div>
      )}

      {scans.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="No scans have run yet. The weekly scan is scheduled for Mondays at 2am UTC — you can also trigger it manually from the GitHub Actions tab." />
      ) : (
        <>
          <TrackedFindings />
          <div className="space-y-3">
            <SectionHeader icon={ShieldAlert} label="Scan History" count={scans.length} />
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
              {scans.map(scan => (
                <ScanRow key={scan.id} scan={scan} expanded={expanded === scan.id} onToggle={() => setExpanded(e => e === scan.id ? null : scan.id)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
