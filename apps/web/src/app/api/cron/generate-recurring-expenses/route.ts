import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeNextOccurrence, type RecurrenceFrequency } from '@/lib/recurrence'

// Daily: for each active recurring_expenses template whose next occurrence
// is due (today or earlier — covers a missed day), create the expenses
// row and advance next_occurrence_date. Mirrors schedule-recurring-jobs'
// generate-then-advance pattern.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const created: string[] = []

  const today = new Date().toISOString().slice(0, 10)

  const { data: templates } = await admin
    .from('recurring_expenses')
    .select('id, tenant_id, category, amount, note, frequency, interval_days, day_of_month, next_occurrence_date')
    .eq('status', 'active')
    .lte('next_occurrence_date', today)

  if (!templates?.length) return NextResponse.json({ ok: true, created: [] })

  for (const t of templates as Array<{
    id: string; tenant_id: string; category: string; amount: number; note: string | null
    frequency: RecurrenceFrequency; interval_days: number | null; day_of_month: number | null
    next_occurrence_date: string
  }>) {
    const { data: expense, error: expenseErr } = await admin
      .from('expenses')
      .insert({
        tenant_id: t.tenant_id,
        date: t.next_occurrence_date,
        category: t.category,
        amount: t.amount,
        note: t.note,
        recurring_expense_id: t.id,
      })
      .select('id')
      .single()
    if (expenseErr || !expense) continue

    const nextDate = computeNextOccurrence(t.next_occurrence_date, t.frequency, t.day_of_month, t.interval_days)
    await admin.from('recurring_expenses').update({ next_occurrence_date: nextDate, updated_at: new Date().toISOString() }).eq('id', t.id)

    created.push(expense.id)
  }

  return NextResponse.json({ ok: true, created })
}
