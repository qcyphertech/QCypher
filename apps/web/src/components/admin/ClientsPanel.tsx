'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Building2, CheckCircle2, AlertCircle, Clock, Eye, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TenantSnapshotModal } from '@/components/admin/TenantSnapshotModal'

type Tenant = {
  id: string; name: string; slug: string; plan: string
  status: 'active' | 'suspended' | 'trial'; is_admin: boolean; created_at: string
}

const STATUS_STYLE: Record<Tenant['status'], string> = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trial:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const STATUS_ICON: Record<Tenant['status'], React.ElementType> = {
  active: CheckCircle2, trial: Clock, suspended: AlertCircle,
}
const STATUS_FILTERS = [
  { value: 'all',       label: 'All',       color: '#4a9db5', bg: 'rgba(74,157,181,0.12)' },
  { value: 'active',    label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'trial',     label: 'Trial',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'suspended', label: 'Suspended', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  tenants: Tenant[]
  totalClients: number
  filteredCount: number
  page: number
  pageSize: number
  isSuperAdmin: boolean
  availablePlans: string[]
}

export function ClientsPanel({ tenants, totalClients, filteredCount, page, pageSize, isSuperAdmin, availablePlans }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? 'all'
  const plan = searchParams.get('plan') ?? 'all'
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const hasActiveFilters = !!(q || status !== 'all' || plan !== 'all' || from || to)

  const [openFilter, setOpenFilter] = useState<'business' | 'plan' | 'status' | 'joined' | null>(null)
  function toggleFilter(col: 'business' | 'plan' | 'status' | 'joined') {
    setOpenFilter(prev => (prev === col ? null : col))
  }

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== 'all' && !(key === 'sort' && value === 'newest')) params.set(key, value)
      else params.delete(key)
    }
    // Any filter/search/sort change resets pagination.
    if (!('page' in updates)) params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }, [pathname, router, searchParams])

  function clearFilters() {
    startTransition(() => router.push(pathname))
  }

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize))
  const rangeStart = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, filteredCount)

  function toggleSort(column: 'name' | 'newest') {
    updateParams({ sort: sort === column ? (column === 'name' ? 'name_desc' : 'oldest') : column })
  }

  const SortIcon = ({ column }: { column: string }) =>
    sort !== column ? <ArrowUpDown className="w-3 h-3 opacity-40" />
      : sort.endsWith('_desc') || sort === 'oldest' ? <ArrowDown className="w-3 h-3" />
      : <ArrowUp className="w-3 h-3" />

  return (
    <div className="space-y-4">
      {/* Click-outside catcher for any open header filter popover */}
      {openFilter && <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />}

      {/* Result count + clear-all, sits above the table */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
          {filteredCount === 0
            ? `No matching clients${totalClients ? ` out of ${totalClients}` : ''}`
            : `Showing ${rangeStart}–${rangeEnd} of ${filteredCount}${filteredCount !== totalClients ? ` (${totalClients} total)` : ''}`}
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[13px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Table with per-column filters embedded in the header */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
        {tenants.length === 0 && !hasActiveFilters && totalClients === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] text-[hsl(var(--muted-foreground))]">No client tenants yet. Invite your first client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: '640px' }}>
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-[hsl(var(--foreground))] transition-colors">
                        Business <SortIcon column="name" />
                      </button>
                      <FilterToggle active={!!q} open={openFilter === 'business'} onClick={() => toggleFilter('business')} />
                    </div>
                    {openFilter === 'business' && (
                      <Popover>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                          <input
                            autoFocus
                            type="search"
                            defaultValue={q}
                            onChange={e => updateParams({ q: e.target.value })}
                            placeholder="Name or slug…"
                            className="w-full pl-8 pr-2.5 py-2 text-[14px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                          />
                        </div>
                      </Popover>
                    )}
                  </th>

                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative">
                    <div className="flex items-center gap-1">
                      Plan
                      {availablePlans.length > 1 && (
                        <FilterToggle active={plan !== 'all'} open={openFilter === 'plan'} onClick={() => toggleFilter('plan')} />
                      )}
                    </div>
                    {openFilter === 'plan' && availablePlans.length > 1 && (
                      <Popover>
                        <FilterOption label="All" active={plan === 'all'} onClick={() => { updateParams({ plan: 'all' }); setOpenFilter(null) }} />
                        {availablePlans.map(p => (
                          <FilterOption key={p} label={p} capitalize active={plan === p} onClick={() => { updateParams({ plan: p }); setOpenFilter(null) }} />
                        ))}
                      </Popover>
                    )}
                  </th>

                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative">
                    <div className="flex items-center gap-1">
                      Status
                      <FilterToggle active={status !== 'all'} open={openFilter === 'status'} onClick={() => toggleFilter('status')} />
                    </div>
                    {openFilter === 'status' && (
                      <Popover>
                        {STATUS_FILTERS.map(f => (
                          <FilterOption
                            key={f.value}
                            label={f.label}
                            color={f.value !== 'all' ? f.color : undefined}
                            active={status === f.value}
                            onClick={() => { updateParams({ status: f.value }); setOpenFilter(null) }}
                          />
                        ))}
                      </Popover>
                    )}
                  </th>

                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] relative">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSort('newest')} className="flex items-center gap-1 hover:text-[hsl(var(--foreground))] transition-colors">
                        Joined <SortIcon column="newest" />
                      </button>
                      <FilterToggle active={!!(from || to)} open={openFilter === 'joined'} onClick={() => toggleFilter('joined')} />
                    </div>
                    {openFilter === 'joined' && (
                      <Popover>
                        <div className="flex flex-col gap-2" style={{ minWidth: '160px' }}>
                          <label className="flex flex-col gap-1 text-[12px] font-medium text-[hsl(var(--muted-foreground))] normal-case tracking-normal">
                            From
                            <input
                              type="date"
                              value={from}
                              max={to || undefined}
                              onChange={e => updateParams({ from: e.target.value })}
                              className="px-2 py-1.5 text-[13px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[12px] font-medium text-[hsl(var(--muted-foreground))] normal-case tracking-normal">
                            To
                            <input
                              type="date"
                              value={to}
                              min={from || undefined}
                              onChange={e => updateParams({ to: e.target.value })}
                              className="px-2 py-1.5 text-[13px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                            />
                          </label>
                          {(from || to) && (
                            <button
                              onClick={() => updateParams({ from: '', to: '' })}
                              className="text-[12px] font-medium normal-case tracking-normal text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-left transition-colors"
                            >
                              Clear dates
                            </button>
                          )}
                        </div>
                      </Popover>
                    )}
                  </th>

                  <th className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[15px] text-[hsl(var(--muted-foreground))]">
                      No clients match your filters.
                    </td>
                  </tr>
                ) : (
                  tenants.map(t => <TenantRow key={t.id} tenant={t} isSuperAdmin={isSuperAdmin} />)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-0.5">
          <button
            onClick={() => updateParams({ page: String(page - 1) })}
            disabled={page <= 1}
            className="flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</p>
          <button
            onClick={() => updateParams({ page: String(page + 1) })}
            disabled={page >= totalPages}
            className="flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function FilterToggle({ active, open, onClick }: { active: boolean; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className={cn(
        'flex items-center justify-center w-5 h-5 rounded-md transition-colors',
        active ? 'text-accent' : 'text-[hsl(var(--muted-foreground))] opacity-60 hover:opacity-100',
        open && 'bg-[hsl(var(--muted))]',
      )}
    >
      <Filter className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute left-0 top-full mt-1.5 z-20 min-w-[160px] p-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-card normal-case font-normal"
    >
      {children}
    </div>
  )
}

function FilterOption({ label, active, onClick, color, capitalize }: { label: string; active: boolean; onClick: () => void; color?: string; capitalize?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-[14px] transition-colors',
        capitalize && 'capitalize',
        active ? 'bg-accent/10 text-accent font-semibold' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
      )}
    >
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
      {label}
    </button>
  )
}

function TenantRow({ tenant, isSuperAdmin }: { tenant: Tenant; isSuperAdmin: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showSnapshot, setShowSnapshot] = useState(false)
  const StatusIcon = STATUS_ICON[tenant.status]

  function setStatus(status: Tenant['status']) {
    startTransition(async () => {
      await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    })
  }

  return (
    <tr className="hover:bg-[hsl(var(--muted))]/40 transition-colors">
      <td className="px-5 py-3.5">
        <button
          onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
          className="flex items-center gap-3 text-left hover:opacity-70 transition-opacity"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
          >
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold uppercase tracking-wide truncate text-[hsl(var(--foreground))]">{tenant.name}</p>
          </div>
        </button>
      </td>
      <td className="px-5 py-3.5 text-[14px] font-medium text-[hsl(var(--muted-foreground))] capitalize whitespace-nowrap">{tenant.plan}</td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className={cn('inline-flex items-center gap-1 text-[13px] px-2.5 py-1 rounded-full font-medium capitalize', STATUS_STYLE[tenant.status])}>
          <StatusIcon className="w-3 h-3" />
          {tenant.status}
        </span>
      </td>
      <td className="px-5 py-3.5 text-[15px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">{fmtDate(tenant.created_at)}</td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setShowSnapshot(true)}
              title="View snapshot (logged as impersonation)"
              className="flex items-center gap-1 text-[14px] text-accent px-2 py-1 rounded-lg hover:bg-accent/10 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
          )}
          <select
            disabled={isPending}
            value={tenant.status}
            onChange={e => setStatus(e.target.value as Tenant['status'])}
            className="text-[14px] rounded-lg border border-[hsl(var(--border))] px-2 py-1 bg-transparent outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspend</option>
          </select>
        </div>
        {showSnapshot && (
          <TenantSnapshotModal tenantId={tenant.id} tenantName={tenant.name} onClose={() => setShowSnapshot(false)} />
        )}
      </td>
    </tr>
  )
}
