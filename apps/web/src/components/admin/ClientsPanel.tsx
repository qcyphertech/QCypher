'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Building2, CheckCircle2, AlertCircle, Clock, Eye, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
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
}

export function ClientsPanel({ tenants, totalClients, filteredCount, page, pageSize, isSuperAdmin }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? 'all'
  const sort = searchParams.get('sort') ?? 'newest'

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

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize))
  const rangeStart = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, filteredCount)

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
            <input
              type="search"
              defaultValue={q}
              onChange={e => updateParams({ q: e.target.value })}
              placeholder="Search by business name or workspace slug…"
              className="w-full pl-10 pr-4 py-2.5 text-[15px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={e => updateParams({ sort: e.target.value })}
              className="appearance-none pl-9 pr-8 py-2.5 text-[15px] font-medium rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none cursor-pointer focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => {
            const on = status === f.value
            return (
              <button
                key={f.value}
                onClick={() => updateParams({ status: f.value })}
                className="px-3.5 py-1.5 rounded-full text-[14px] transition-all"
                style={{
                  fontWeight: on ? 700 : 500,
                  border: `1px solid ${on ? f.color + '50' : 'hsl(var(--border))'}`,
                  background: on ? f.bg : 'transparent',
                  color: on ? f.color : 'hsl(var(--muted-foreground))',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Result count */}
      <p className="text-[13px] text-[hsl(var(--muted-foreground))] px-0.5">
        {filteredCount === 0
          ? `No matching clients${totalClients ? ` out of ${totalClients}` : ''}`
          : `Showing ${rangeStart}–${rangeEnd} of ${filteredCount}${filteredCount !== totalClients ? ` (${totalClients} total)` : ''}`}
      </p>

      {/* List */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden divide-y divide-[hsl(var(--border))]">
        {tenants.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[15px] text-[hsl(var(--muted-foreground))]">
              {totalClients === 0 ? 'No client tenants yet. Invite your first client.' : 'No clients match your search or filters.'}
            </p>
          </div>
        )}
        {tenants.map(t => <TenantRow key={t.id} tenant={t} isSuperAdmin={isSuperAdmin} />)}
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
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
      <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4" />
      </div>
      <button
        onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
        className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
      >
        <p className="text-[15px] font-medium truncate">{tenant.name}</p>
        <p className="text-[15px] text-[hsl(var(--muted-foreground))] truncate">
          /{tenant.slug} · {tenant.plan} · joined {fmtDate(tenant.created_at)}
        </p>
      </button>
      <span className={cn('flex items-center gap-1 text-[15px] px-2.5 py-1 rounded-full font-medium capitalize', STATUS_STYLE[tenant.status])}>
        <StatusIcon className="w-3 h-3" />
        {tenant.status}
      </span>
      {isSuperAdmin && (
        <button
          onClick={() => setShowSnapshot(true)}
          title="View snapshot (logged as impersonation)"
          className="flex items-center gap-1 text-[15px] text-accent px-2 py-1 rounded-lg hover:bg-accent/10"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
      )}
      <select
        disabled={isPending}
        value={tenant.status}
        onChange={e => setStatus(e.target.value as Tenant['status'])}
        className="text-[15px] rounded-lg border border-[hsl(var(--border))] px-2 py-1 bg-transparent outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
      >
        <option value="active">Active</option>
        <option value="trial">Trial</option>
        <option value="suspended">Suspend</option>
      </select>
      {showSnapshot && (
        <TenantSnapshotModal tenantId={tenant.id} tenantName={tenant.name} onClose={() => setShowSnapshot(false)} />
      )}
    </div>
  )
}
