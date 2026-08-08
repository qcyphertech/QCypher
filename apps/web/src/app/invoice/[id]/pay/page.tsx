import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvoicePayCard } from '@/components/invoice/InvoicePayCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pay Invoice' }

// Public route (no auth) — a payment link is the auth. Anyone with the
// invoice's UUID can view/pay it, same trust model as Helcim's own hosted
// payment links.
export default async function InvoicePayPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, amount, description, status, tenants(name)')
    .eq('id', params.id)
    .single()

  if (!invoice) notFound()

  return (
    <InvoicePayCard
      invoice={{
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: Number(invoice.amount),
        description: invoice.description,
        status: invoice.status,
        tenant_name: (invoice as unknown as { tenants: { name: string } | null }).tenants?.name ?? null,
      }}
    />
  )
}
