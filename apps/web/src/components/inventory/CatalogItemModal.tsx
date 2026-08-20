'use client'

import { useState, useTransition } from 'react'
import { createCatalogItem, updateCatalogItem, type CatalogItem, type InventoryTier } from '@/lib/actions/catalog'
import { type TenantSettings } from '@/lib/types/settings'
import { X } from 'lucide-react'
import { CatalogImageUpload } from './CatalogImageUpload'

type Props = {
  item?: CatalogItem
  onClose: () => void
  tier?: InventoryTier
  toggles?: TenantSettings
}

export function CatalogItemModal({ item, onClose, tier = 'lite', toggles }: Props) {
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState<'good' | 'service' | 'rental'>(item?.item_type ?? 'service')
  const [isRentable, setIsRentable] = useState(item?.is_rentable ?? false)
  const [requiresDeposit, setRequiresDeposit] = useState(item?.requires_deposit ?? false)
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '')
  const [error, setError] = useState<string | null>(null)

  const isFull = tier === 'full'
  const tracksQuantity = type !== 'service'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name: fd.get('name') as string,
      description: fd.get('description') as string || undefined,
      item_type: fd.get('item_type') as 'good' | 'service' | 'rental',
      is_rentable: type === 'good' && isRentable,
      base_price: parseFloat(fd.get('base_price') as string) || 0,
      billing_unit: fd.get('billing_unit') as 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly',
      taxable: fd.has('taxable'),
      requires_deposit: fd.has('requires_deposit'),
      deposit_amount: fd.has('requires_deposit') ? parseFloat(fd.get('deposit_amount') as string) || 0 : undefined,
      quantity: tracksQuantity && fd.get('quantity') ? parseInt(fd.get('quantity') as string, 10) : undefined,
      unit_of_measure: isFull && fd.get('unit_of_measure') ? (fd.get('unit_of_measure') as string) : undefined,
      reorder_point: isFull && fd.get('reorder_point') ? parseInt(fd.get('reorder_point') as string, 10) : undefined,
      expiry_date: isFull && fd.get('expiry_date') ? (fd.get('expiry_date') as string) : undefined,
      image_url: isFull && imageUrl ? imageUrl : undefined,
    }
    setError(null)
    startTransition(async () => {
      try {
        if (item) {
          await updateCatalogItem(item.id, payload)
        } else {
          await createCatalogItem(payload)
        }
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>
            {item ? 'Edit item' : 'New catalog item'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Name" required>
            <input name="name" defaultValue={item?.name} required
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </Field>

          <Field label="Description">
            <textarea name="description" defaultValue={item?.description ?? ''} rows={2}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px] resize-none"
              style={{ color: 'hsl(var(--foreground))' }} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select name="item_type" defaultValue={item?.item_type ?? 'service'}
                onChange={e => setType(e.target.value as typeof type)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }}>
                <option value="good">Good</option>
                <option value="service">Service</option>
                <option value="rental">Rental</option>
              </select>
            </Field>

            <Field label="Billing unit">
              <select name="billing_unit" defaultValue={item?.billing_unit ?? 'flat'}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }}>
                <option value="flat">Flat</option>
                <option value="hourly">Per hour</option>
                <option value="daily">Per day</option>
                <option value="weekly">Per week</option>
                <option value="monthly">Per month</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Base price ($)">
              <input name="base_price" type="number" step="0.01" min="0"
                defaultValue={item?.base_price ?? ''}
                required
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </Field>

            {tracksQuantity && (
              <Field label="Quantity" required>
                <input name="quantity" type="number" step="1" min="0"
                  defaultValue={item?.quantity ?? ''}
                  required
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                  style={{ color: 'hsl(var(--foreground))' }} />
              </Field>
            )}
          </div>

          {isFull && tracksQuantity && toggles?.inventory_enable_uom && (
            <Field label="Unit of measure">
              <input name="unit_of_measure" defaultValue={item?.unit_of_measure ?? ''} placeholder="each, box, case…"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </Field>
          )}

          {isFull && tracksQuantity && toggles?.inventory_enable_reorder_points && (
            <Field label="Reorder point">
              <input name="reorder_point" type="number" step="1" min="0" defaultValue={item?.reorder_point ?? ''}
                placeholder="Flag when quantity falls to or below this"
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </Field>
          )}

          {isFull && toggles?.inventory_enable_expiry_dates && (
            <Field label="Expiry date">
              <input name="expiry_date" type="date" defaultValue={item?.expiry_date ?? ''}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </Field>
          )}

          {isFull && toggles?.inventory_enable_images && (
            <Field label="Photo">
              <CatalogImageUpload value={imageUrl} onChange={setImageUrl} />
            </Field>
          )}

          {type === 'good' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isRentable}
                onChange={e => setIsRentable(e.target.checked)} className="rounded" />
              <span className="text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>Also available to rent</span>
            </label>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="taxable" defaultChecked={item?.taxable} className="rounded" />
              <span className="text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>Taxable</span>
            </label>
            {(type !== 'good' || isRentable) && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="requires_deposit"
                  defaultChecked={item?.requires_deposit}
                  onChange={e => setRequiresDeposit(e.target.checked)} className="rounded" />
                <span className="text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>Requires deposit</span>
              </label>
            )}
          </div>

          {requiresDeposit && (type !== 'good' || isRentable) && (
            <Field label="Deposit amount ($)">
              <input name="deposit_amount" type="number" step="0.01" min="0"
                defaultValue={item?.deposit_amount ?? ''}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </Field>
          )}

          {error && <p className="text-[15px] text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              Cancel
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}
