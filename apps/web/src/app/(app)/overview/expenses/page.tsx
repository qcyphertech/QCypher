import { createClient } from '@/lib/supabase/server'
import { ExpensesClient } from './ExpensesClient'

export const metadata = { title: 'Expenses' }

export default async function ExpensesPage() {
  const supabase = await createClient()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, date, category, amount, note, recurring_expense_id')
    .order('date', { ascending: false })
    .limit(200)

  return <ExpensesClient expenses={(expenses as any[]) ?? []} />
}
