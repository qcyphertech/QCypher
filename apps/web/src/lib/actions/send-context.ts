'use server'

import { createClient } from '@/lib/supabase/server'

export type SendContext = {
  businessName?: string
  amountDue?: string
  appointmentDate?: string
}

// Same data a contact's own detail page already assembles for Quick Send
// (see apps/web/src/app/(app)/contacts/[id]/page.tsx) — pulled out here so
// the template-first "Send" flow (pick a template, then a contact) can
// populate the same {{business_name}}/{{amount_due}}/{{appointment_date}}
// variables without duplicating the queries.
export async function getContactSendContext(contactId: string): Promise<SendContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
  if (!tenantId) return {}

  const [{ data: tenant }, { data: nextUnpaidOrder }, { data: nextEvent }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', tenantId).single(),
    supabase.from('orders')
      .select('total_amount')
      .eq('customer_id', contactId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('events')
      .select('starts_at')
      .eq('contact_id', contactId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    businessName: (tenant as { name?: string } | null)?.name ?? undefined,
    amountDue: nextUnpaidOrder ? `$${nextUnpaidOrder.total_amount.toFixed(2)}` : undefined,
    appointmentDate: nextEvent?.starts_at
      ? new Date(nextEvent.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : undefined,
  }
}
