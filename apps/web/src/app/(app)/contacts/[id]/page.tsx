import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContactDetail } from '@/components/contacts/ContactDetail'
import type { Metadata } from 'next'
import type { RecurringJob } from '@/lib/actions/recurring-jobs'
import { getContactActivity } from '@/lib/actions/audit'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('first_name, last_name')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Contact' }
  const d = data as { first_name?: string; last_name?: string }
  return { title: `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() }
}

export default async function ContactPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? ''

  const [{ data: contact }, { data: interactions }, { data: tenantRaw }, { data: orders }, { data: catalogItems }, { data: recurringJobs }, { data: nextEvent }, activity] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single(),
    supabase.from('interactions').select('*').eq('contact_id', id).order('occurred_at', { ascending: false }),
    supabase.from('tenants').select('slug, name').eq('id', tenantId).single(),
    supabase.from('orders').select('id, order_number, total_amount, payment_status, notes, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('catalog_items').select('id, name, description, base_price').eq('is_active', true).order('name'),
    supabase.from('recurring_jobs').select('id, contact_id, catalog_item_id, title, description, amount, frequency, interval_days, day_of_month, next_scheduled_date, scheduled_time, status, send_reminder, reminder_days_before, auto_confirm_if_no_reply, created_at').eq('contact_id', id).order('created_at', { ascending: false }),
    // Soonest upcoming appointment for this contact — populates the
    // {{appointment_date}} quick-send template variable.
    supabase.from('events').select('starts_at').eq('contact_id', id).gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(1).maybeSingle(),
    getContactActivity(id).catch(() => []),
  ])

  if (!contact) notFound()

  const tenant = tenantRaw as { slug: string; name: string } | null
  return (
    <ContactDetail
      contact={contact}
      interactions={interactions ?? []}
      orders={orders ?? []}
      activity={activity}
      tenantId={tenantId}
      tenantSlug={tenant?.slug ?? ''}
      businessName={tenant?.name ?? ''}
      catalogItems={catalogItems ?? []}
      recurringJobs={(recurringJobs ?? []) as RecurringJob[]}
      nextAppointmentAt={nextEvent?.starts_at ?? null}
    />
  )
}
