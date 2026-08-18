'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Repeat } from 'lucide-react'
import { BackLink } from '@/components/ui/BackLink'
import { ExpenseForm } from '@/components/overview/ExpenseForm'
import { deleteExpense, stopRecurringExpense } from '@/lib/actions/expenses'
import { useRouter } from 'next/navigation'

interface Expense {
  id: string
  date: string
  category: string
  amount: number
  note?: string | null
  recurring_expense_id?: string | null
}

interface Props { expenses: Expense[] }

export function ExpensesClient({ expenses: initial }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [stoppingRecurring, setStoppingRecurring] = useState<string | null>(null)
  const [showStopConfirm, setShowStopConfirm] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteExpense(id)
      router.refresh()
    } finally {
      setDeleting(null)
      setShowConfirm(null)
    }
  }

  async function handleStopRecurring(recurringExpenseId: string) {
    setStoppingRecurring(recurringExpenseId)
    try {
      await stopRecurringExpense(recurringExpenseId)
      router.refresh()
    } finally {
      setStoppingRecurring(null)
      setShowStopConfirm(null)
    }
  }

  const totalAmount = initial.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pt-6" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex flex-col gap-1">
          <BackLink href="/overview" label="Overview" />
          <h1 className="text-xl font-black" style={{ color: 'var(--heading)' }}>Expenses</h1>
        </div>
        {mode === 'list' && (
          <button onClick={() => setMode('create')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-semibold text-white"
            style={{ background: '#2a52a0' }}>
            <Plus style={{ width: '14px', height: '14px' }} /> Add
          </button>
        )}
        {mode !== 'list' && (
          <button onClick={() => { setMode('list'); setEditing(null) }}
            className="p-2 rounded-xl hover:opacity-70" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* Form */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="rounded-2xl p-4 mb-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              {mode === 'create' ? 'Add Expense' : 'Edit Expense'}
            </h2>
            <ExpenseForm
              expense={editing ?? undefined}
              onDone={() => { setMode('list'); setEditing(null); router.refresh() }}
              onCancel={() => { setMode('list'); setEditing(null) }}
            />
          </div>
        )}

        {/* Summary */}
        {mode === 'list' && initial.length > 0 && (
          <div className="rounded-2xl px-4 py-3.5 mb-4 flex items-center justify-between"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <span className="text-[15px] font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {initial.length} expense{initial.length !== 1 ? 's' : ''}
            </span>
            <span className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Empty */}
        {mode === 'list' && initial.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <p className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>No expenses yet</p>
            <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Tap <strong>Add</strong> to record your first expense.
            </p>
          </div>
        )}

        {/* List */}
        {mode === 'list' && initial.length > 0 && (
          <div className="flex flex-col gap-2">
            {initial.map(expense => (
              <div key={expense.id}
                className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                {/* Date col */}
                <div className="flex flex-col items-center min-w-[36px]">
                  <span className="text-[15px] font-bold uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold leading-tight" style={{ color: 'hsl(var(--foreground))' }}>
                    {new Date(expense.date + 'T00:00:00').getDate()}
                  </span>
                </div>
                {/* Main */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{expense.category}</p>
                    {expense.recurring_expense_id && (
                      showStopConfirm === expense.recurring_expense_id ? (
                        <span className="flex items-center gap-1.5 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Stop recurring?
                          <button onClick={() => setShowStopConfirm(null)}
                            className="px-2 py-0.5 rounded-lg" style={{ border: '1px solid hsl(var(--border))' }}>No</button>
                          <button onClick={() => handleStopRecurring(expense.recurring_expense_id!)}
                            disabled={stoppingRecurring === expense.recurring_expense_id}
                            className="px-2 py-0.5 rounded-lg text-white disabled:opacity-50" style={{ background: '#ef4444' }}>
                            {stoppingRecurring === expense.recurring_expense_id ? '…' : 'Yes'}
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => setShowStopConfirm(expense.recurring_expense_id!)}
                          title="Recurring expense — click to stop future occurrences"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[15px] font-semibold"
                          style={{ color: '#2a52a0', background: 'rgba(42,82,160,0.10)' }}>
                          <Repeat style={{ width: '11px', height: '11px' }} /> Recurring
                        </button>
                      )
                    )}
                  </div>
                  {expense.note && (
                    <p className="text-[15px] mt-0.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{expense.note}</p>
                  )}
                </div>
                {/* Amount + actions */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    ${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(expense); setMode('edit') }}
                      className="p-1 rounded-lg hover:opacity-70" style={{ color: '#2a52a0' }}>
                      <Pencil style={{ width: '13px', height: '13px' }} />
                    </button>
                    {showConfirm === expense.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => setShowConfirm(null)}
                          className="px-2 py-0.5 text-[15px] rounded-lg" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                          No
                        </button>
                        <button onClick={() => handleDelete(expense.id)} disabled={deleting === expense.id}
                          className="px-2 py-0.5 text-[15px] rounded-lg text-white disabled:opacity-50"
                          style={{ background: '#ef4444' }}>
                          {deleting === expense.id ? '…' : 'Yes'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowConfirm(expense.id)}
                        className="p-1 rounded-lg hover:opacity-70" style={{ color: '#ef4444' }}>
                        <Trash2 style={{ width: '13px', height: '13px' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
