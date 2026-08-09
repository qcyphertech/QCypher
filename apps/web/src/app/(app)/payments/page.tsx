import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { PaymentsTable } from '@/components/payments/PaymentsTable'

export const metadata: Metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, payment_status, notes, created_at, paid_at, contact:contacts(id, first_name, last_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Payments</h1>
        <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Search and filter every payment across your customers
        </p>
      </div>
      <PaymentsTable orders={orders ?? []} />
    </div>
  )
}
