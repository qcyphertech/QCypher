import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NewOrderButton } from '@/components/orders/NewOrderButton'
import { ShoppingBag } from 'lucide-react'

export const metadata: Metadata = { title: 'Orders' }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  draft:    { bg: 'var(--badge-inactive-bg)', color: 'var(--badge-inactive-text)' },
  pending:  { bg: 'var(--badge-lead-bg)',     color: 'var(--badge-lead-text)'     },
  paid:     { bg: 'var(--badge-green-bg)',    color: 'var(--badge-green-text)'    },
  refunded: { bg: 'var(--badge-red-bg)',      color: 'var(--badge-red-text)'      },
}

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
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                {['Order', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[15px] font-bold uppercase tracking-wide"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const s = STATUS_STYLE[o.payment_status] ?? STATUS_STYLE.draft
                const contact = o.contact as { id: string; first_name: string; last_name: string | null } | null
                return (
                  <tr key={o.id}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/orders/${o.id}`}
                        className="text-[15px] font-bold hover:text-[#1a3070] transition-colors"
                        style={{ color: 'hsl(var(--foreground))' }}>
                        #{String(i + 1).padStart(4, '0')}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
                      {contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      ${Number(o.total_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {contact ? (
                        <Link href={`/contacts/${contact.id}#payments`}
                          className="text-[15px] font-bold px-2.5 py-1 rounded-full capitalize hover:opacity-80 transition-opacity"
                          style={s} title="View payments for this customer">
                          {o.payment_status}
                        </Link>
                      ) : (
                        <span className="text-[15px] font-bold px-2.5 py-1 rounded-full capitalize"
                          style={s}>{o.payment_status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
