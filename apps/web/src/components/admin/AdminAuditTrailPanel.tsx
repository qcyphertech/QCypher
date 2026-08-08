'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react'
import { getAuditLogs, type AuditLog, type AuditAction } from '@/lib/actions/audit'
import type { TenantSummary } from '@/lib/actions/admin-console'
import { FilterToggle, FilterPopover, FilterOption } from '@/components/admin/AdminPanelUI'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

const ACTIONS: AuditAction[] = [
  'contact_created', 'contact_updated', 'contact_deleted',
  'event_created', 'event_updated', 'event_deleted',
  'note_created',
  'template_created', 'template_updated', 'template_deleted',
  'login', 'logout',
  'invite_sent', 'role_changed', 'user_removed',
  'data_exported', 'deletion_requested', 'deletion_cancelled', 'account_deleted',
]

const ACTION_COLOR = (a: string) =>
  a.endsWith('_deleted') || a === 'user_removed' ? '#ef4444'
  : a.endsWith('_created') || a === 'invite_sent' ? '#10b981'
  : a === 'login' ? '#4a9db5'
  : a === 'logout' ? 'hsl(var(--muted-foreground))'
  : '#f59e0b'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function AdminAuditTrailPanel({ tenants }: { tenants: TenantSummary[] }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [tenantId, setTenantId] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [openFilter, setOpenFilter] = useState<'time' | 'user' | 'action' | 'resource' | null>(null)

  function load() {
    startTransition(async () => {
      const result = await getAuditLogs({
        page, pageSize: PAGE_SIZE,
        tenantId: tenantId || undefined,
        search: search || undefined,
        action: action || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      })
      setLogs(result.logs)
      setTotal(result.total)
    })
  }

  useEffect(load, [page, tenantId, search, action, from, to])

  function toggleFilter(col: 'time' | 'user' | 'action' | 'resource') {
    setOpenFilter(prev => (prev === col ? null : col))
  }

  const hasActiveFilters = !!(search || action || from || to || tenantId)
  function clearFilters() {
    setPage(1); setTenantId(''); setSearch(''); setAction(''); setFrom(''); setTo('')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="max-w-4xl">
      {openFilter && <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />}

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
          {total === 0 ? 'No activity found' : `Showing ${rangeStart}–${rangeEnd} of ${total} ${total === 1 ? 'entry' : 'entries'}`}
        </p>
        <div className="flex items-center gap-2">
          {tenants.length > 0 && (
            <select
              value={tenantId}
              onChange={e => { setPage(1); setTenantId(e.target.value) }}
              className="text-[13px] font-medium px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none cursor-pointer"
            >
              <option value="">All tenants</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[13px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px] border-collapse text-left" style={{ minWidth: '640px' }}>
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    Time
                    <FilterToggle active={!!(from || to)} open={openFilter === 'time'} onClick={() => toggleFilter('time')} />
                  </div>
                  {openFilter === 'time' && (
                    <FilterPopover>
                      <div className="flex flex-col gap-2" style={{ minWidth: '160px' }}>
                        <label className="flex flex-col gap-1 text-[12px] font-medium text-[hsl(var(--muted-foreground))] normal-case tracking-normal">
                          From
                          <input
                            type="date" value={from} max={to || undefined}
                            onChange={e => { setPage(1); setFrom(e.target.value) }}
                            className="px-2 py-1.5 text-[13px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[12px] font-medium text-[hsl(var(--muted-foreground))] normal-case tracking-normal">
                          To
                          <input
                            type="date" value={to} min={from || undefined}
                            onChange={e => { setPage(1); setTo(e.target.value) }}
                            className="px-2 py-1.5 text-[13px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                          />
                        </label>
                        {(from || to) && (
                          <button
                            onClick={() => { setPage(1); setFrom(''); setTo('') }}
                            className="text-[12px] font-medium normal-case tracking-normal text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-left transition-colors"
                          >
                            Clear dates
                          </button>
                        )}
                      </div>
                    </FilterPopover>
                  )}
                </th>

                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    User
                    <FilterToggle active={!!search} open={openFilter === 'user'} onClick={() => toggleFilter('user')} />
                  </div>
                  {openFilter === 'user' && (
                    <FilterPopover>
                      <input
                        autoFocus type="search" value={search}
                        onChange={e => { setPage(1); setSearch(e.target.value) }}
                        placeholder="Email contains…"
                        className="w-full px-2.5 py-2 text-[14px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        style={{ minWidth: '180px' }}
                      />
                    </FilterPopover>
                  )}
                </th>

                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    Action
                    <FilterToggle active={!!action} open={openFilter === 'action'} onClick={() => toggleFilter('action')} />
                  </div>
                  {openFilter === 'action' && (
                    <FilterPopover>
                      <div className="max-h-64 overflow-y-auto" style={{ minWidth: '180px' }}>
                        <FilterOption label="All actions" active={!action} onClick={() => { setPage(1); setAction(''); setOpenFilter(null) }} />
                        {ACTIONS.map(a => (
                          <FilterOption
                            key={a} label={a} color={ACTION_COLOR(a)}
                            active={action === a}
                            onClick={() => { setPage(1); setAction(a); setOpenFilter(null) }}
                          />
                        ))}
                      </div>
                    </FilterPopover>
                  )}
                </th>

                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative">
                  <div className="flex items-center gap-1">
                    Resource
                    <FilterToggle active={!!search} open={openFilter === 'resource'} onClick={() => toggleFilter('resource')} />
                  </div>
                  {openFilter === 'resource' && (
                    <FilterPopover>
                      <input
                        autoFocus type="search" value={search}
                        onChange={e => { setPage(1); setSearch(e.target.value) }}
                        placeholder="Name or ID contains…"
                        className="w-full px-2.5 py-2 text-[14px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                        style={{ minWidth: '180px' }}
                      />
                    </FilterPopover>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-[hsl(var(--muted))]/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-[hsl(var(--muted-foreground))]">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      {l.user_email}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold"
                      style={{ background: `${ACTION_COLOR(l.action)}1a`, color: ACTION_COLOR(l.action) }}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-[13px] truncate max-w-[240px]">
                    {l.resource_name ?? l.resource_id ?? '—'}
                  </td>
                </tr>
              ))}
              {!isPending && logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[hsl(var(--muted-foreground))]">No activity matches your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-0.5">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={cn('flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors', page <= 1 && 'opacity-40 cursor-not-allowed')}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</p>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={cn('flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors', page >= totalPages && 'opacity-40 cursor-not-allowed')}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
