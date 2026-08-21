'use client'

import { useState, useTransition } from 'react'
import { createRental } from '@/lib/actions/catalog-rentals'
import { createOrder, addLineItem } from '@/lib/actions/orders'
import { X } from 'lucide-react'

type ContactLite = { id: string; first_name: string; last_name: string | null }

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export function RentOutModal({ itemId, itemName, rentalPrice, rentalBillingUnit, contacts, onClose }: {
  itemId: string
  itemName: string
  rentalPrice: number
  rentalBillingUnit: 'flat' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  contacts: ContactLite[]
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [contactId, setContactId] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        // Linking to an order gives the rental a place in order history and
        // invoicing — the order shell + a reserved line item, then the
        // catalog_rentals row (what the Rentals tab reads) points at it.
        const orderId = await createOrder({ customer_id: contactId || undefined, notes: notes || undefined })
        const lineResult = await addLineItem({
          order_id: orderId,
          catalog_item_id: itemId,
          item_name_snapshot: itemName,
          quantity: 1,
          unit_price: rentalPrice,
          billing_unit_snapshot: rentalBillingUnit,
          rental_status: 'reserved',
          rental_start_date: new Date().toISOString().slice(0, 10),
          rental_end_date: dueDate,
        })
        if (!lineResult.ok) { setError(lineResult.error); return }
        await createRental({ catalog_item_id: itemId, order_id: orderId, due_date: dueDate, notes: notes || undefined })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-sm border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Rent out &ldquo;{itemName}&rdquo;</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Renting to
            </label>
            <select value={contactId} onChange={e => setContactId(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="">— No contact / walk-in —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>
              ))}
            </select>
            <p className="text-[12.5px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Creates an order for this contact so the rental shows up in order history and can be invoiced.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Due back *
            </label>
            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Notes
            </label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Condition, anything to remember"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px] resize-none"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>

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
              {pending ? 'Renting out…' : 'Rent out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
