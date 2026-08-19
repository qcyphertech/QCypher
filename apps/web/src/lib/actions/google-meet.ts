'use server'

import { createClient } from '@/lib/supabase/server'
import { getValidGoogleAccessToken } from '@/lib/google-calendar-token'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const RECONNECT_ERROR = 'Google Calendar needs to be reconnected with meeting-link permission. Go to Calendar and reconnect Google Calendar.'

export async function generateGoogleMeetLink(input: {
  title: string
  startsAt: string
  endsAt: string
}): Promise<Result<{ meetingLink: string; gcalEventId: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
  if (!tenantId) return { ok: false, error: 'Session error — please refresh and try again.' }

  const accessToken = await getValidGoogleAccessToken(tenantId)
  if (!accessToken) return { ok: false, error: RECONNECT_ERROR }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: input.title || 'Meeting',
        start: { dateTime: input.startsAt },
        end: { dateTime: input.endsAt },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    }
  )

  if (res.status === 401 || res.status === 403) return { ok: false, error: RECONNECT_ERROR }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    console.error('[google-meet] create event failed', res.status, JSON.stringify(body))
    return { ok: false, error: 'Could not create a Google Meet link. Please try again.' }
  }

  const body = await res.json()
  const meetingLink = body?.hangoutLink as string | undefined
  const gcalEventId = body?.id as string | undefined
  if (!meetingLink || !gcalEventId) {
    return { ok: false, error: 'Google did not return a meeting link. Please try again.' }
  }

  return { ok: true, data: { meetingLink, gcalEventId } }
}

export async function deleteGoogleMeetEvent(gcalEventId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
    if (!tenantId) return

    const accessToken = await getValidGoogleAccessToken(tenantId)
    if (!accessToken) return

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (err) {
    // Best-effort cleanup — a stray Google event is a minor annoyance, not worth failing the user's action over.
    console.error('[google-meet] cleanup delete failed', err)
  }
}
