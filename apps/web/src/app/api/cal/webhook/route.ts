import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@qcypher/db'

// Cal.com sends webhook events here.
// We cache booking data into cal_bookings and attempt to link to a contact.
// Cal.com webhook secret must be set in CAL_WEBHOOK_SECRET env var.

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.CAL_WEBHOOK_SECRET
  if (!secret) return true // skip verification in dev if secret not set

  const sig = req.headers.get('x-cal-signature-256') ?? ''
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  if (!(await verifySignature(req, body))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(body) } catch { return NextResponse.json({ ok: true }) }

  const triggerEvent = payload.triggerEvent as string
  const booking = (payload.payload ?? payload) as Record<string, unknown>

  // Cal.com webhooks include a `tenantId` custom field if you configure it,
  // or we resolve tenant by matching cal_user_id stored in tenant_integrations.
  const calUserId = String((booking.organizer as Record<string,unknown>)?.id ?? '')
  if (!calUserId) return NextResponse.json({ ok: true })

  const supabase = await createClient()

  // Find the tenant that owns this Cal.com account
  const { data: integration } = await supabase
    .from('tenant_integrations')
    .select('tenant_id')
    .eq('provider', 'cal_com')
    .eq('cal_user_id', calUserId)
    .single()

  if (!integration) return NextResponse.json({ ok: true })
  const tenantId = integration.tenant_id

  const uid         = String(booking.uid ?? '')
  const attendees   = (booking.attendees as Record<string,unknown>[] | undefined) ?? []
  const firstAttendee = attendees[0] ?? {}
  const attendeeName  = String((firstAttendee as Record<string,unknown>).name  ?? '')
  const attendeeEmail = String((firstAttendee as Record<string,unknown>).email ?? '')
  const attendeePhone = String((firstAttendee as Record<string,unknown>).phone ?? '')

  if (triggerEvent === 'BOOKING_CANCELLED') {
    await supabase.from('cal_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('cal_booking_uid', uid)
    return NextResponse.json({ ok: true })
  }

  // Try to link to a contact by email or phone
  let contactId: string | null = null
  if (attendeeEmail) {
    const { data: c } = await supabase.from('contacts')
      .select('id').eq('tenant_id', tenantId).eq('email', attendeeEmail).maybeSingle()
    contactId = c?.id ?? null
  }
  if (!contactId && attendeePhone) {
    const { data: c } = await supabase.from('contacts')
      .select('id').eq('tenant_id', tenantId).eq('phone', attendeePhone).maybeSingle()
    contactId = c?.id ?? null
  }

  const row = {
    tenant_id:           tenantId,
    cal_booking_uid:     uid,
    contact_id:          contactId,
    needs_contact_link:  !contactId,
    title:               String(booking.title ?? booking.eventTitle ?? ''),
    description:         String(booking.description ?? ''),
    starts_at:           booking.startTime ? new Date(booking.startTime as string).toISOString() : null,
    ends_at:             booking.endTime   ? new Date(booking.endTime   as string).toISOString() : null,
    status:              triggerEvent === 'BOOKING_RESCHEDULED' ? 'rescheduled' : 'accepted',
    attendee_name:       attendeeName,
    attendee_email:      attendeeEmail,
    attendee_phone:      attendeePhone,
    cal_event_type_id:   Number(booking.eventTypeId ?? 0) || null,
    raw:                 payload as Json,
    updated_at:          new Date().toISOString(),
  }

  await supabase.from('cal_bookings').upsert(row, { onConflict: 'tenant_id,cal_booking_uid' })

  return NextResponse.json({ ok: true })
}
