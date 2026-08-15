'use client'

import { useState, useTransition } from 'react'
import { createRecurringJob } from '@/lib/actions/recurring-jobs'
import { computeNextOccurrence, type RecurrenceFrequency } from '@/lib/recurrence'

type CatalogItem = { id: string; name: string; description: string | null; base_price: number }

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'custom', label: 'Custom' },
]

export function CreateRecurringJobModal({
  contactId,
  catalogItems,
  onClose,
  onCreated,
}: {
  contactId: string
  tenantId: string
  businessName: string
  catalogItems: CatalogItem[]
  onClose: () => void
  onCreated: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [intervalDays, setIntervalDays] = useState('30')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sendReminder, setSendReminder] = useState(true)
  const [reminderDaysBefore, setReminderDaysBefore] = useState('3')
  const [autoConfirm, setAutoConfirm] = useState(true)

  const needsDayOfMonth = frequency === 'monthly' || frequency === 'quarterly' || frequency === 'annually'
  const needsInterval = frequency === 'custom'

  function handleCatalogSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const item = catalogItems.find(i => i.id === e.target.value)
    if (!item) return
    setName(item.name)
    setDescription(item.description ?? '')
    setAmount(String(item.base_price))
  }

  const previewNextDate = startDate
    ? computeNextOccurrence(startDate, frequency, needsDayOfMonth ? Number(dayOfMonth) : null, needsInterval ? Number(intervalDays) : null)
    : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createRecurringJob({
        contactId,
        catalogItemId: (fd.get('catalog_item_id') as string) || null,
        title: name,
        description: description || null,
        amount: parseFloat(amount) || 0,
        frequency,
        intervalDays: needsInterval ? parseInt(intervalDays, 10) : null,
        dayOfMonth: needsDayOfMonth ? parseInt(dayOfMonth, 10) : null,
        startDate,
        sendReminder,
        reminderDaysBefore: parseInt(reminderDaysBefore, 10) || 3,
        autoConfirmIfNoReply: autoConfirm,
      })
      if (!result.ok) { setError(result.error); return }
      onCreated()
    })
  }

  const labelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Schedule recurring job</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {catalogItems.length > 0 && (
            <div className="space-y-1.5">
              <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>From catalog (optional)</label>
              <select name="catalog_item_id" onChange={handleCatalogSelect} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
                <option value="">— Custom —</option>
                {catalogItems.map(i => <option key={i.id} value={i.id}>{i.name} (${Number(i.base_price).toFixed(2)})</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Job title</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Monthly HVAC Maintenance" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Price per visit</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as RecurrenceFrequency)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {needsDayOfMonth && (
            <div className="space-y-1.5">
              <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Day of month</label>
              <input type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
            </div>
          )}
          {needsInterval && (
            <div className="space-y-1.5">
              <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Every ___ days</label>
              <input type="number" min="1" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>First occurrence</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
            {previewNextDate && (
              <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                After that, the next one repeats on {new Date(previewNextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
            <label className="flex items-center gap-2 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
              <input type="checkbox" checked={sendReminder} onChange={e => setSendReminder(e.target.checked)} />
              Send customer reminder before appointment
            </label>
            {sendReminder && (
              <div className="pl-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Remind</span>
                  <input type="number" min="1" max="30" value={reminderDaysBefore} onChange={e => setReminderDaysBefore(e.target.value)}
                    className="w-16 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-2 py-1 text-[14px]" style={{ color: 'hsl(var(--foreground))' }} />
                  <span className="text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>days before</span>
                </div>
                <label className="flex items-center gap-2 text-[14px]" style={{ color: 'hsl(var(--foreground))' }}>
                  <input type="checkbox" checked={autoConfirm} onChange={e => setAutoConfirm(e.target.checked)} />
                  Auto-confirm if no response
                </label>
              </div>
            )}
          </div>

          {error && <p className="text-[14px] text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-[15px]" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl font-bold text-[15px] text-white disabled:opacity-50" style={{ background: 'hsl(var(--accent))' }}>
              {pending ? 'Saving…' : 'Save & Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
