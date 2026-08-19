import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()

  const [eventsRes, contactsRes, calIntegRes, gcalIntegRes, calBookingsRes, gcalEventsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, description, starts_at, ends_at, contact_id, guest_email, meeting_link')
      .order('starts_at', { ascending: true }),

    supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .order('first_name'),

    supabase
      .from('tenant_integrations')
      .select('id')
      .eq('provider', 'cal_com')
      .maybeSingle(),

    supabase
      .from('tenant_integrations')
      .select('id')
      .eq('provider', 'google_calendar')
      .maybeSingle(),

    supabase
      .from('cal_bookings')
      .select('id, title, starts_at, ends_at, status, attendee_name, cal_booking_uid')
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true }),

    supabase
      .from('google_calendar_events')
      .select('id, title, starts_at, ends_at, all_day, status, gcal_id')
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Calendar</h1>
      <CalendarView
        events={eventsRes.data ?? []}
        contacts={contactsRes.data ?? []}
        calBookings={calBookingsRes.data ?? []}
        gcalEvents={gcalEventsRes.data ?? []}
        calConnected={!!calIntegRes.data}
        gcalConnected={!!gcalIntegRes.data}
      />
    </div>
  )
}
