import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { NewOrderButton } from '@/components/orders/NewOrderButton'
import { OrdersTable } from '@/components/orders/OrdersTable'
import { ShoppingBag } from 'lucide-react'

export const metadata: Metadata = { title: 'Orders' }

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('*, contact:contacts(id, first_name, last_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Orders</h1>
          <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Track sales, services & rentals
          </p>
        </div>
        <NewOrderButton />
      </div>

      {(!orders || orders.length === 0) ? (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>No orders yet</p>
            <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Create an order from a contact or click below
            </p>
          </div>
          <NewOrderButton />
        </div>
      ) : (
        <OrdersTable orders={orders as any} />
      )}
    </div>
  )
}
