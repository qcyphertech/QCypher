'use client'

import { useState } from 'react'
import { createExpense, updateExpense, type ExpenseInput, type RecurrenceInput } from '@/lib/actions/expenses'
import type { RecurrenceFrequency } from '@/lib/recurrence'

const CATEGORIES = [
  'Advertising',
  'Equipment',
  'Insurance',
  'Materials & Supplies',
  'Meals & Entertainment',
  'Office',
  'Professional Services',
  'Rent & Utilities',
  'Software & Subscriptions',
  'Travel',
  'Vehicle',
  'Other',
]

interface Props {
  expense?: { id: string; date: string; category: string; amount: number; note?: string | null }
  onDone: () => void
  onCancel: () => void
}

export function ExpenseForm({ expense, onDone, onCancel }: Props) {
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState(expense?.category ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category) { setError('Please select a category.'); return }
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { setError('Please enter a valid amount.'); return }
    setSaving(true)
    setError('')
    try {
      const input: ExpenseInput = { date, category, amount: parsed, note: note || undefined }
      if (expense) {
        await updateExpense(expense.id, input)
      } else if (isRecurring) {
        const isMonthlyLike = frequency === 'monthly' || frequency === 'quarterly' || frequency === 'annually'
        const recurrence: RecurrenceInput = {
          frequency,
          dayOfMonth: isMonthlyLike ? parseInt(dayOfMonth, 10) || null : null,
          intervalDays: frequency === 'custom' ? 30 : null,
        }
        await createExpense(input, recurrence)
      } else {
        await createExpense(input)
      }
      onDone()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    fontSize: '15px',
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'hsl(var(--muted-foreground))',
    marginBottom: '6px',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-[15px] font-medium px-3 py-2 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
          {error}
        </p>
      )}

      <div>
        <label style={labelStyle}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          required style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">Select category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Amount ($)</label>
        <input type="number" min="0.01" step="0.01" placeholder="0.00"
          value={amount} onChange={e => setAmount(e.target.value)}
          required style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Note (optional)</label>
        <textarea placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: 'none' }} />
      </div>

      {!expense && (
        <div className="rounded-xl p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}>
          <label className="flex items-center gap-2 text-[15px] font-semibold cursor-pointer" style={{ color: 'hsl(var(--foreground))' }}>
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4" />
            Make this recurring
          </label>

          {isRecurring && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label style={labelStyle}>Repeats</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value as RecurrenceFrequency)} style={inputStyle}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="custom">Every 30 days</option>
                </select>
              </div>
              {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'annually') && (
                <div>
                  <label style={labelStyle}>Day of month</label>
                  <input type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} style={inputStyle} />
                </div>
              )}
              <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                This expense will be logged today, then automatically re-created on that schedule.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-opacity hover:opacity-70"
          style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', background: 'transparent' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#2a52a0' }}>
          {saving ? 'Saving…' : expense ? 'Update' : 'Add Expense'}
        </button>
      </div>
    </form>
  )
}
