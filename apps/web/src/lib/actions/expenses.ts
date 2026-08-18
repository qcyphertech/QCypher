'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeNextOccurrence, type RecurrenceFrequency } from '@/lib/recurrence'

export type ExpenseInput = {
  date:     string   // ISO date
  category: string
  amount:   number
  note?:    string
}

export type RecurrenceInput = {
  frequency:     RecurrenceFrequency
  intervalDays?: number | null
  dayOfMonth?:   number | null
}

export async function createExpense(input: ExpenseInput, recurrence?: RecurrenceInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', tenantId).single()
  if (!tenant) throw new Error('Tenant not found')

  let recurring_expense_id: string | null = null

  if (recurrence) {
    const nextOccurrence = computeNextOccurrence(
      input.date, recurrence.frequency, recurrence.dayOfMonth ?? null, recurrence.intervalDays ?? null,
    )
    const { data: template, error: templateErr } = await supabase
      .from('recurring_expenses')
      .insert({
        tenant_id: tenant.id,
        category: input.category,
        amount: input.amount,
        note: input.note ?? null,
        frequency: recurrence.frequency,
        interval_days: recurrence.intervalDays ?? null,
        day_of_month: recurrence.dayOfMonth ?? null,
        next_occurrence_date: nextOccurrence,
      })
      .select('id')
      .single()
    if (templateErr) throw templateErr
    recurring_expense_id = template.id
  }

  const { error } = await supabase.from('expenses').insert({
    tenant_id: tenant.id,
    date:      input.date,
    category:  input.category,
    amount:    input.amount,
    note:      input.note ?? null,
    recurring_expense_id,
  })
  if (error) throw error
  revalidatePath('/overview')
  revalidatePath('/overview/expenses')
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/overview')
  revalidatePath('/overview/expenses')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/overview')
  revalidatePath('/overview/expenses')
}

// Stops future occurrences of a recurring expense's template — the expense
// rows already created (including today's) are left alone, matching how
// pausing/cancelling recurring_jobs never touches past orders.
export async function stopRecurringExpense(recurringExpenseId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', recurringExpenseId)
  if (error) throw error
  revalidatePath('/overview')
  revalidatePath('/overview/expenses')
}
