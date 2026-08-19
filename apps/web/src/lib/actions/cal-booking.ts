'use server'

import { createClient } from '@/lib/supabase/server'
import { getValidCalAccessToken } from '@/lib/cal-token'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const API_VERSION = '2026-02-25'
const RECONNECT_ERROR = 'Cal.com needs to be reconnected with booking permission. Go to Calendar and reconnect Cal.com.'

async function getTenantAndToken(): Promise<{ tenantId: string; accessToken: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
  if (!tenantId) return { error: 'Session error — please refresh and try again.' }

  const accessToken = await getValidCalAccessToken(tenantId)
  if (!accessToken) return { error: RECONNECT_ERROR }

  return { tenantId, accessToken }
}

export type CalEventType = { id: number; title: string; slug: string }

export async function listCalEventTypes(): Promise<Result<CalEventType[]>> {
  const ctx = await getTenantAndToken()
  if ('error' in ctx) return { ok: false, error: ctx.error }

  const res = await fetch('https://api.cal.com/v2/event-types', {
    headers: { Authorization: `Bearer ${ctx.accessToken}`, 'cal-api-version': API_VERSION },
  })
  if (res.status === 401 || res.status === 403) return { ok: false, error: RECONNECT_ERROR }
  if (!res.ok) return { ok: false, error: 'Could not load your Cal.com event types.' }

  const body = await res.json()
  const items = (body?.data ?? []) as Record<string, unknown>[]
  const eventTypes = items.map(e => ({
    id: e.id as number,
    title: (e.title as string) ?? 'Untitled',
    slug: (e.slug as string) ?? '',
  }))
  return { ok: true, data: eventTypes }
}

export async function generateCalBookingLink(input: {
  eventTypeId: number
  startsAt: string
  guestName: string
  guestEmail: string
  timeZone: string
}): Promise<Result<{ meetingLink: string; bookingUid: string }>> {
  const ctx = await getTenantAndToken()
  if ('error' in ctx) return { ok: false, error: ctx.error }

  const res = await fetch('https://api.cal.com/v2/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'cal-api-version': API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventTypeId: input.eventTypeId,
      start: input.startsAt,
      attendee: {
        name: input.guestName,
        email: input.guestEmail,
        timeZone: input.timeZone,
      },
    }),
  })

  if (res.status === 401 || res.status === 403) return { ok: false, error: RECONNECT_ERROR }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    console.error('[cal-booking] create failed', res.status, JSON.stringify(body))
    const message = body?.error?.message as string | undefined
    return {
      ok: false,
      error: message ?? 'Could not book that time on Cal.com — it may be outside your available hours for this event type.',
    }
  }

  const body = await res.json()
  const booking = body?.data
  const meetingLink = booking?.location as string | undefined
  const bookingUid = booking?.uid as string | undefined
  if (!meetingLink || !bookingUid) {
    return { ok: false, error: 'Cal.com did not return a meeting link. Please try again.' }
  }

  return { ok: true, data: { meetingLink, bookingUid } }
}

export async function cancelCalBooking(bookingUid: string): Promise<void> {
  try {
    const ctx = await getTenantAndToken()
    if ('error' in ctx) return

    await fetch(`https://api.cal.com/v2/bookings/${bookingUid}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        'cal-api-version': API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellationReason: 'Removed from QCypher event' }),
    })
  } catch (err) {
    console.error('[cal-booking] cancel failed', err)
  }
}
