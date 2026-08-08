'use client'

import { useEffect, useState, useTransition } from 'react'
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuditLogs, type AuditLog, type AuditAction, type ResourceType } from '@/lib/actions/audit'
import type { TeamMember } from '@/lib/actions/team'

const ACTION_LABEL: Record<AuditAction, string> = {
  contact_created: 'Contact created', contact_updated: 'Contact updated', contact_deleted: 'Contact deleted',
  event_created: 'Event created', event_updated: 'Event updated', event_deleted: 'Event deleted',
  note_created: 'Note added',
  template_created: 'Template created', template_updated: 'Template updated', template_deleted: 'Template deleted',
  login: 'Signed in', logout: 'Signed out',
  invite_sent: 'Invite sent', role_changed: 'Role changed', user_removed: 'User removed',
  data_exported: 'Data exported', deletion_requested: 'Deletion requested',
  deletion_cancelled: 'Deletion cancelled', account_deleted: 'Account deleted',
  pricing_override_set: 'Pricing override set', pricing_override_cleared: 'Pricing override cleared',
  invoice_created: 'Invoice created', invoice_sent: 'Invoice sent', invoice_paid: 'Invoice paid',
  invoice_voided: 'Invoice voided', invoice_marked_paid: 'Invoice marked paid',
}

const RESOURCE_TYPES: ResourceType[] = ['contact', 'event', 'note', 'template', 'auth', 'team', 'account', 'pricing', 'invoice']

const PAGE_SIZE = 25

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toCsv(logs: AuditLog[]) {
  const header = ['Timestamp', 'User', 'Action', 'Resource type', 'Resource', 'Details']
  const rows = logs.map(l => [
    l.created_at,
    l.user_email,
    ACTION_LABEL[l.action] ?? l.action,
    l.resource_type,
    l.resource_name ?? l.resource_id ?? '',
    l.details ? JSON.stringify(l.details) : '',
  ])
  return [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function AuditTrailPanel({ members }: { members: TeamMember[] }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const result = await getAuditLogs({
        page, pageSize: PAGE_SIZE,
        userId: userId || undefined,
        action: action || undefined,
        resourceType: resourceType || undefined,
        search: search || undefined,
      })
      setLogs(result.logs)
      setTotal(result.total)
    })
  }

  useEffect(load, [page, userId, action, resourceType, search])

  async function handleExport() {
    const result = await getAuditLogs({ page: 1, pageSize: 1000, userId: userId || undefined, action: action || undefined, resourceType: resourceType || undefined, search: search || undefined })
    const csv = toCsv(result.logs)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selectStyle: React.CSSProperties = {
    fontSize: '14px', padding: '8px 10px', borderRadius: '10px',
    border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'hsl(var(--muted-foreground))' }} />
          <input
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value) }}
            placeholder="Search user or resource…"
            style={{ ...selectStyle, width: '100%', paddingLeft: '32px' }}
          />
        </div>
        <select value={userId} onChange={e => { setPage(1); setUserId(e.target.value) }} style={selectStyle}>
          <option value="">All users</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.email}</option>)}
        </select>
        <select value={action} onChange={e => { setPage(1); setAction(e.target.value) }} style={selectStyle}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select value={resourceType} onChange={e => { setPage(1); setResourceType(e.target.value) }} style={selectStyle}>
          <option value="">All resources</option>
          {RESOURCE_TYPES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
        </select>
        <button
          onClick={handleExport}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600,
            padding: '8px 14px', borderRadius: '10px', border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', cursor: 'pointer',
          }}
        >
          <Download style={{ width: '14px', height: '14px' }} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '16px', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'hsl(var(--muted))' }}>
                {['Time', 'User', 'Action', 'Resource', 'Details'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'hsl(var(--muted-foreground))' }}>{fmtDate(l.created_at)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{l.user_email}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td style={{ padding: '10px 14px' }}>{l.resource_name ?? l.resource_id ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace', fontSize: '12px' }}>
                    {l.details ? JSON.stringify(l.details) : ''}
                  </td>
                </tr>
              ))}
              {!isPending && logs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No activity found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
        <span>{total} {total === 1 ? 'entry' : 'entries'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ background: 'none', border: 'none', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.3 : 1 }}>
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ background: 'none', border: 'none', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.3 : 1 }}>
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
