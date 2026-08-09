'use client'

import { useMemo, useState } from 'react'
import type { CatalogItem } from '@/lib/actions/catalog'
import { deactivateCatalogItem } from '@/lib/actions/catalog'
import { CatalogItemModal } from './CatalogItemModal'
import { Pencil, ToggleLeft, Package, Wrench, Key, Filter } from 'lucide-react'

const TYPE_META = {
  good:    { label: 'Good',    icon: Package, bg: 'var(--badge-indigo-bg)', color: 'var(--badge-indigo-text)' },
  service: { label: 'Service', icon: Wrench,  bg: 'var(--badge-active-bg)', color: 'var(--badge-active-text)' },
  rental:  { label: 'Rental',  icon: Key,     bg: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)' },
}

const UNIT_LABELS: Record<string, string> = {
  flat: 'flat', hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo',
}

const TYPE_OPTIONS = [
  { value: 'all',     label: 'All types' },
  { value: 'good',    label: 'Good' },
  { value: 'service', label: 'Service' },
  { value: 'rental',  label: 'Rental' },
]

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function CatalogList({ items }: { items: CatalogItem[] }) {
  const [editItem, setEditItem] = useState<CatalogItem | null>(null)
  const [nameQuery, setNameQuery] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')

  const hasFilters = !!(nameQuery || type !== 'all' || status !== 'all')

  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase()
    return items.filter(i => {
      if (type !== 'all' && i.item_type !== type) return false
      if (status === 'active' && !i.is_active) return false
      if (status === 'inactive' && i.is_active) return false
      if (nq && !i.name.toLowerCase().includes(nq)) return false
      return true
    })
  }, [items, nameQuery, type, status])

  const active   = filtered.filter(i => i.is_active)
  const inactive = filtered.filter(i => !i.is_active)

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'
  const headerColor = 'hsl(var(--muted-foreground))'

  return (
    <>
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {filtered.length} of {items.length} item{items.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={() => { setNameQuery(''); setType('all'); setStatus('all') }}
            className="text-[15px] font-semibold px-3 py-1.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '170px' }}>
                <span className={headerLabelCls}>Name</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="Filter…"
                    className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '150px' }}>
                <span className={headerLabelCls}>Type</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <select value={type} onChange={e => setType(e.target.value)}
                    className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor }}>
                <span className={headerLabelCls}>Price</span>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '150px' }}>
                <span className={headerLabelCls}>Status</span>
                <div className="relative">
                  <Filter className={filterIconCls} />
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </th>
              <th className="px-5 py-3 align-top" />
            </tr>
          </thead>
          <tbody>
            {status !== 'inactive' && active.map(item => <CatalogRow key={item.id} item={item} onEdit={() => setEditItem(item)} />)}
            {status !== 'active' && inactive.length > 0 && (
              <>
                {status === 'all' && (
                  <tr>
                    <td colSpan={5} className="px-5 py-2 text-[15px] font-bold uppercase tracking-wide"
                      style={{ color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }}>
                      Inactive
                    </td>
                  </tr>
                )}
                {inactive.map(item => <CatalogRow key={item.id} item={item} onEdit={() => setEditItem(item)} />)}
              </>
            )}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            No items match your filters
          </p>
        )}
      </div>

      {editItem && (
        <CatalogItemModal item={editItem} onClose={() => setEditItem(null)} />
      )}
    </>
  )
}

function CatalogRow({ item, onEdit }: { item: CatalogItem; onEdit: () => void }) {
  const { label, icon: Icon, bg, color } = TYPE_META[item.item_type]
  return (
    <tr
      className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors"
      style={{ opacity: item.is_active ? 1 : 0.5 }}
    >
      <td className="px-5 py-3.5">
        <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</p>
        {item.description && (
          <p className="text-[15px] mt-0.5 truncate max-w-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {item.description}
          </p>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-[15px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: bg, color }}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          ${Number(item.base_price).toFixed(2)}
        </span>
        <span className="text-[15px] ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {UNIT_LABELS[item.billing_unit]}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[15px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: item.is_active ? 'var(--badge-green-bg)' : 'var(--badge-inactive-bg)',
            color: item.is_active ? 'var(--badge-green-text)' : 'var(--badge-inactive-text)',
          }}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onEdit}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-indigo-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" style={{ color: '#2a52a0' }} />
          </button>
          {item.is_active && (
            <form action={deactivateCatalogItem.bind(null, item.id)}>
              <button type="submit"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-50 transition-colors"
                title="Deactivate">
                <ToggleLeft className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  )
}
