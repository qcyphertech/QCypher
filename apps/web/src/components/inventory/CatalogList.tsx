'use client'

import { useMemo, useState, useTransition } from 'react'
import type { CatalogItem, InventoryTier } from '@/lib/actions/catalog'
import { activateCatalogItem, deactivateCatalogItem, deleteCatalogItem } from '@/lib/actions/catalog'
import type { TenantSettings } from '@/lib/types/settings'
import { CatalogItemModal } from './CatalogItemModal'
import { RentOutModal } from './RentOutModal'
import { Pencil, Trash2, Package, Wrench, Key, Filter, Download } from 'lucide-react'

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

const NICE_QTY_STEPS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000]
const NICE_PRICE_STEPS = [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

// Round-number options, trimmed to whatever actually fits the catalog —
// a tenant selling $15 candles shouldn't see a $5000 price bucket, and a
// tenant with 900 units in stock shouldn't be capped at 100.
function bucketsFor(steps: number[], maxVal: number): number[] {
  const ceilIdx = steps.findIndex(s => s >= maxVal)
  return ceilIdx === -1 ? steps : steps.slice(0, ceilIdx + 1)
}

function quantityStatus(item: CatalogItem, tier: InventoryTier, reorderEnabled: boolean): 'ok' | 'low' | 'critical' | null {
  if (item.quantity === null) return null
  if (tier === 'full' && reorderEnabled && item.reorder_point !== null) {
    if (item.quantity <= 0) return 'critical'
    if (item.quantity <= item.reorder_point) return 'low'
    return 'ok'
  }
  if (item.quantity <= 0) return 'critical'
  if (item.quantity <= 3) return 'low'
  return 'ok'
}

function exportCsv(items: CatalogItem[]) {
  const rows = [
    ['Name', 'Type', 'Quantity', 'Price', 'Billing unit', 'Rental price', 'Rental billing unit', 'Status'],
    ...items.map(i => [
      i.name, i.item_type, i.quantity ?? '', i.base_price, i.billing_unit,
      i.is_rentable ? (i.rental_price ?? '') : '',
      i.is_rentable ? i.rental_billing_unit : '',
      i.is_active ? 'Active' : 'Inactive',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'inventory.csv'
  a.click()
  URL.revokeObjectURL(url)
}

type ContactLite = { id: string; first_name: string; last_name: string | null }

export function CatalogList({ items, tier = 'lite', toggles, contacts = [] }: {
  items: CatalogItem[]
  tier?: InventoryTier
  toggles?: TenantSettings
  contacts?: ContactLite[]
}) {
  const [editItem, setEditItem] = useState<CatalogItem | null>(null)
  const [nameQuery, setNameQuery] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [qtyMin, setQtyMin] = useState('')
  const [qtyMax, setQtyMax] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  const hasFilters = !!(nameQuery || type !== 'all' || status !== 'all' || qtyMin || qtyMax || priceMin || priceMax)
  const reorderEnabled = !!toggles?.inventory_enable_reorder_points

  const qtyBuckets = useMemo(() => {
    const values = items.map(i => i.quantity).filter((q): q is number => q != null)
    return bucketsFor(NICE_QTY_STEPS, values.length ? Math.max(...values) : 0)
  }, [items])
  const priceBuckets = useMemo(() => {
    const values = items.map(i => i.base_price)
    return bucketsFor(NICE_PRICE_STEPS, values.length ? Math.max(...values) : 0)
  }, [items])

  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase()
    return items.filter(i => {
      if (type !== 'all' && i.item_type !== type) return false
      if (status === 'active' && !i.is_active) return false
      if (status === 'inactive' && i.is_active) return false
      if (nq && !i.name.toLowerCase().includes(nq)) return false
      if (qtyMin && (i.quantity == null || i.quantity < Number(qtyMin))) return false
      if (qtyMax && (i.quantity == null || i.quantity > Number(qtyMax))) return false
      if (priceMin && i.base_price < Number(priceMin)) return false
      if (priceMax && i.base_price > Number(priceMax)) return false
      return true
    })
  }, [items, nameQuery, type, status, qtyMin, qtyMax, priceMin, priceMax])

  const active   = filtered.filter(i => i.is_active)
  const inactive = filtered.filter(i => !i.is_active)

  const totalProducts = items.filter(i => i.item_type === 'good' || i.item_type === 'rental').length
  const totalServices = items.filter(i => i.item_type === 'service').length

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'
  const headerColor = 'hsl(var(--muted-foreground))'

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total products" value={totalProducts} />
        <StatTile label="Total services" value={totalServices} />
      </div>

      <div className="flex items-center justify-between">
        {hasFilters ? (
          <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {filtered.length} of {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        ) : <span />}
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={() => { setNameQuery(''); setType('all'); setStatus('all'); setQtyMin(''); setQtyMax(''); setPriceMin(''); setPriceMax('') }}
              className="text-[15px] font-semibold px-3 py-1.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              Clear filters
            </button>
          )}
          <button
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 text-[15px] font-semibold px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

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
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '150px' }}>
                <span className={headerLabelCls}>Qty</span>
                <div className="flex items-center gap-1 mt-1.5">
                  <select value={qtyMin} onChange={e => setQtyMin(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal appearance-none"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <option value="">Min</option>
                    {qtyBuckets.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <span style={{ color: headerColor }}>–</span>
                  <select value={qtyMax} onChange={e => setQtyMax(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal appearance-none"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <option value="">Max</option>
                    {qtyBuckets.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </th>
              <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '170px' }}>
                <span className={headerLabelCls}>Price</span>
                <div className="flex items-center gap-1 mt-1.5">
                  <select value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal appearance-none"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <option value="">Min</option>
                    {priceBuckets.map(v => <option key={v} value={v}>${v}</option>)}
                  </select>
                  <span style={{ color: headerColor }}>–</span>
                  <select value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-1.5 py-1 text-[13px] font-normal normal-case tracking-normal appearance-none"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    <option value="">Max</option>
                    {priceBuckets.map(v => <option key={v} value={v}>${v}</option>)}
                  </select>
                </div>
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
            {status !== 'inactive' && active.map(item => (
              <CatalogRow key={item.id} item={item} tier={tier} reorderEnabled={reorderEnabled} contacts={contacts} onEdit={() => setEditItem(item)} />
            ))}
            {status !== 'active' && inactive.length > 0 && (
              <>
                {status === 'all' && (
                  <tr>
                    <td colSpan={6} className="px-5 py-2 text-[15px] font-bold uppercase tracking-wide"
                      style={{ color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }}>
                      Inactive
                    </td>
                  </tr>
                )}
                {inactive.map(item => (
                  <CatalogRow key={item.id} item={item} tier={tier} reorderEnabled={reorderEnabled} contacts={contacts} onEdit={() => setEditItem(item)} />
                ))}
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
        <CatalogItemModal item={editItem} onClose={() => setEditItem(null)} tier={tier} toggles={toggles} />
      )}
    </>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] px-4 py-3.5">
      <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</p>
      <p className="text-[19px] font-bold mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>{value}</p>
    </div>
  )
}

const QTY_COLOR = {
  ok:       { bg: 'var(--badge-green-bg)',  color: 'var(--badge-green-text)' },
  low:      { bg: 'var(--badge-amber-bg)',  color: 'var(--badge-amber-text)' },
  critical: { bg: 'var(--badge-red-bg)',    color: 'var(--badge-red-text)' },
}

function CatalogRow({ item, tier, reorderEnabled, contacts, onEdit }: {
  item: CatalogItem
  tier: InventoryTier
  reorderEnabled: boolean
  contacts: ContactLite[]
  onEdit: () => void
}) {
  const { label, icon: Icon, bg, color } = TYPE_META[item.item_type]
  const qStatus = quantityStatus(item, tier, reorderEnabled)
  const rentable = item.is_rentable || item.item_type === 'rental'
  const [showRentOut, setShowRentOut] = useState(false)
  const [togglePending, startToggle] = useTransition()

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return
    await deleteCatalogItem(item.id)
  }

  return (
    <>
    <tr
      className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors"
      style={{ opacity: item.is_active ? 1 : 0.5 }}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {tier === 'full' && item.image_url && (
            <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          )}
          <div>
            <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{item.name}</p>
            {item.description && (
              <p className="text-[15px] mt-0.5 truncate max-w-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {item.description}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[15px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: bg, color }}>
            <Icon className="w-3 h-3" />
            {label}
          </span>
          {item.is_rentable && (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: TYPE_META.rental.bg, color: TYPE_META.rental.color }}>
              <Key className="w-3 h-3" />
              Rentable
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        {qStatus ? (
          <span className="text-[15px] font-bold px-2 py-0.5 rounded-full" style={{ background: QTY_COLOR[qStatus].bg, color: QTY_COLOR[qStatus].color }}>
            {item.quantity}{item.unit_of_measure ? ` ${item.unit_of_measure}` : ''}
          </span>
        ) : (
          <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div>
          <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            ${Number(item.base_price).toFixed(2)}
          </span>
          <span className="text-[15px] ml-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {UNIT_LABELS[item.billing_unit]}
          </span>
        </div>
        {item.is_rentable && item.rental_price != null && (
          <div>
            <span className="text-[15px] font-bold" style={{ color: 'var(--badge-amber-text)' }}>
              ${Number(item.rental_price).toFixed(2)}
            </span>
            <span className="text-[15px] ml-1" style={{ color: 'var(--badge-amber-text)' }}>
              {UNIT_LABELS[item.rental_billing_unit]} rent
            </span>
          </div>
        )}
      </td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          disabled={togglePending}
          onClick={() => startToggle(async () => {
            if (item.is_active) await deactivateCatalogItem(item.id)
            else await activateCatalogItem(item.id)
          })}
          className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1 transition-colors"
          style={{
            background: item.is_active ? 'var(--badge-green-bg)' : 'var(--badge-inactive-bg)',
            border: `1.5px solid ${item.is_active ? 'var(--badge-green-text)' : 'hsl(var(--border))'}`,
            opacity: togglePending ? 0.6 : 1,
            cursor: togglePending ? 'default' : 'pointer',
          }}
        >
          <span className="text-[15px] font-bold" style={{ color: item.is_active ? 'var(--badge-green-text)' : 'var(--badge-inactive-text)' }}>
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
          <span className="relative rounded-full transition-colors"
            style={{ width: '30px', height: '17px', background: item.is_active ? 'var(--badge-green-text)' : 'hsl(var(--border))' }}>
            <span className="absolute rounded-full bg-white transition-transform"
              style={{ width: '13px', height: '13px', top: '2px', left: '2px', transform: item.is_active ? 'translateX(13px)' : 'translateX(0)', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
          </span>
        </button>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2 justify-end">
          {tier === 'full' && rentable && item.is_active && (
            <button onClick={() => setShowRentOut(true)} title="Rent out"
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-50 transition-colors">
              <Key className="w-3.5 h-3.5" style={{ color: 'var(--badge-amber-text)' }} />
            </button>
          )}
          <button onClick={onEdit}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-indigo-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" style={{ color: '#2a52a0' }} />
          </button>
          <button onClick={handleDelete}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
            title="Delete">
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
          </button>
        </div>
      </td>
    </tr>
    {showRentOut && (
      <RentOutModal
        itemId={item.id}
        itemName={item.name}
        rentalPrice={item.rental_price ?? item.base_price}
        rentalBillingUnit={item.rental_billing_unit}
        contacts={contacts}
        onClose={() => setShowRentOut(false)}
      />
    )}
    </>
  )
}
