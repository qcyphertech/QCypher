'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, Trash2, AlertTriangle, Clock, CalendarDays, Video, Sparkles, Loader2, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'
import { TimePicker } from '@/components/shared/TimePicker'
import { generateGoogleMeetLink, deleteGoogleMeetEvent } from '@/lib/actions/google-meet'
import { listCalEventTypes, generateCalBookingLink, cancelCalBooking, type CalEventType } from '@/lib/actions/cal-booking'
import type { Tables } from '@/types/database'

type CalEvent = Pick<Tables<'events'>, 'id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'contact_id' | 'guest_email' | 'meeting_link' | 'gcal_meet_event_id' | 'cal_booking_uid'>
type Contact = { id: string; first_name: string; last_name: string | null; email: string | null }

function toInputDateTime(iso: string) {
  return iso.slice(0, 16)
}

function toISO(local: string) {
  return new Date(local).toISOString()
}

function splitDateTime(v: string) {
  const [date, time] = v.split('T')
  return { date: date ?? '', time: time ?? '' }
}

function joinDateTime(date: string, time: string) {
  return `${date}T${time || '00:00'}`
}

export function EventModal({ date, event, readOnly, contacts = [], gcalConnected = false, calConnected = false, onClose }: {
  date?: Date
  event?: CalEvent
  readOnly?: boolean
  contacts?: Contact[]
  gcalConnected?: boolean
  calConnected?: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPastConfirm, setShowPastConfirm] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [gcalMeetEventId, setGcalMeetEventId] = useState(event?.gcal_meet_event_id ?? null)
  const [linkIsAuto, setLinkIsAuto] = useState(false)
  const [calBookingUid, setCalBookingUid] = useState(event?.cal_booking_uid ?? null)
  const [showCalPanel, setShowCalPanel] = useState(false)
  const [calEventTypes, setCalEventTypes] = useState<CalEventType[] | null>(null)
  const [calEventTypeId, setCalEventTypeId] = useState('')
  const [calLoadError, setCalLoadError] = useState<string | null>(null)
  const [bookingCal, setBookingCal] = useState(false)
  const [calError, setCalError] = useState<string | null>(null)
  const supabase = createClient()

  // Use the exact date/time passed in — no hardcoded 09:00 override
  const defaultStart = date
    ? format(date, "yyyy-MM-dd'T'HH:mm")
    : toInputDateTime(event?.starts_at ?? new Date().toISOString())
  const defaultEnd = date
    ? format(new Date(date.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
    : toInputDateTime(event?.ends_at ?? new Date(new Date().getTime() + 60 * 60 * 1000).toISOString())

  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    starts_at: defaultStart,
    ends_at: defaultEnd,
    contact_id: event?.contact_id ?? '',
    guest_email: event?.guest_email ?? '',
    meeting_link: event?.meeting_link ?? '',
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const contactId = e.target.value
    const contact = contacts.find(c => c.id === contactId)
    setForm(prev => ({
      ...prev,
      contact_id: contactId,
      guest_email: contact?.email ? contact.email : prev.guest_email,
    }))
  }

  async function runGenerateMeetLink() {
    setLinkError(null)
    setGeneratingLink(true)
    const prevGcalEventId = gcalMeetEventId
    const result = await generateGoogleMeetLink({
      title: form.title.trim(),
      startsAt: toISO(form.starts_at),
      endsAt: toISO(form.ends_at),
    })
    setGeneratingLink(false)
    if (!result.ok) { setLinkError(result.error); return }
    setForm(prev => ({ ...prev, meeting_link: result.data.meetingLink }))
    setGcalMeetEventId(result.data.gcalEventId)
    setLinkIsAuto(true)
    if (prevGcalEventId) deleteGoogleMeetEvent(prevGcalEventId)
  }

  function handleGenerateMeetLink() {
    if (!form.title.trim()) { setLinkError('Add a title first.'); return }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) { setLinkError('End time must be after start time.'); return }
    runGenerateMeetLink()
  }

  // Auto-generate a Meet link once there's a title and a valid time range,
  // as long as the field is empty or still holds a link we generated
  // ourselves (never overwrite something the user typed in).
  const autoGenerateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!gcalConnected) return
    if (generatingLink) return
    if (form.meeting_link && !linkIsAuto) return
    if (!form.title.trim()) return
    if (new Date(form.ends_at) <= new Date(form.starts_at)) return

    autoGenerateTimer.current = setTimeout(() => { runGenerateMeetLink() }, 800)
    return () => { if (autoGenerateTimer.current) clearTimeout(autoGenerateTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.starts_at, form.ends_at, gcalConnected])

  async function doSave() {
    setError(null)
    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('End time must be after start time.')
      return
    }
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
      if (!tenantId) { setError('Session error — please refresh and try again.'); return }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        starts_at: toISO(form.starts_at),
        ends_at: toISO(form.ends_at),
        contact_id: form.contact_id || null,
        guest_email: form.guest_email.trim() || null,
        meeting_link: form.meeting_link.trim() || null,
        gcal_meet_event_id: gcalMeetEventId,
        cal_booking_uid: calBookingUid,
        tenant_id: tenantId,
      }
      if (event) {
        const { error } = await supabase.from('events').update(payload).eq('id', event.id)
        if (error) { setError(error.message); return }
        logAudit({ action: 'event_updated', resource_type: 'event', resource_id: event.id, resource_name: payload.title })
      } else {
        const { error } = await supabase.from('events').insert(payload)
        if (error) { setError(error.message); return }
        logAudit({ action: 'event_created', resource_type: 'event', resource_name: payload.title })
      }
      router.refresh()
      onClose()
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (new Date(form.starts_at) < new Date()) {
      setShowPastConfirm(true)
      return
    }
    doSave()
  }

  async function handleDelete() {
    if (!event) return
    startTransition(async () => {
      await supabase.from('events').delete().eq('id', event.id)
      logAudit({ action: 'event_deleted', resource_type: 'event', resource_id: event.id, resource_name: event.title })
      if (gcalMeetEventId) deleteGoogleMeetEvent(gcalMeetEventId)
      if (calBookingUid) cancelCalBooking(calBookingUid)
      router.refresh()
      onClose()
    })
  }

  async function handleOpenCalPanel() {
    setShowCalPanel(true)
    if (calEventTypes) return
    setCalLoadError(null)
    const result = await listCalEventTypes()
    if (!result.ok) { setCalLoadError(result.error); return }
    setCalEventTypes(result.data)
    if (result.data.length === 1) setCalEventTypeId(String(result.data[0].id))
  }

  async function handleCreateCalBooking() {
    setCalError(null)
    if (!calEventTypeId) { setCalError('Pick an event type.'); return }
    if (!form.guest_email.trim()) { setCalError('Add a guest email — Cal.com requires an attendee.'); return }
    setBookingCal(true)
    const prevBookingUid = calBookingUid
    const result = await generateCalBookingLink({
      eventTypeId: Number(calEventTypeId),
      startsAt: toISO(form.starts_at),
      guestName: (() => {
        const contact = contacts.find(c => c.id === form.contact_id)
        return contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : 'Guest'
      })(),
      guestEmail: form.guest_email.trim(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    setBookingCal(false)
    if (!result.ok) { setCalError(result.error); return }
    setForm(prev => ({ ...prev, meeting_link: result.data.meetingLink }))
    setCalBookingUid(result.data.bookingUid)
    setLinkIsAuto(false)
    setShowCalPanel(false)
    if (prevBookingUid) cancelCalBooking(prevBookingUid)
  }

  // Read-only view for gcal / cal_ events
  if (readOnly && event) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card flex flex-col"
          style={{ maxHeight: '92svh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
            <h2 className="text-[15px] font-semibold">Event details</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4 overflow-y-auto">
            <p className="text-[17px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{event.title}</p>
            <div className="flex items-start gap-3">
              <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <p className="text-[14px]" style={{ color: 'hsl(var(--foreground))' }}>
                {format(new Date(event.starts_at), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <p className="text-[14px]" style={{ color: 'hsl(var(--foreground))' }}>
                {format(new Date(event.starts_at), 'h:mm a')} – {format(new Date(event.ends_at), 'h:mm a')}
              </p>
            </div>
            {event.description && (
              <p className="text-[13px] leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {event.description}
              </p>
            )}
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}>
              Synced from Google Calendar
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full sm:max-w-lg bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card flex flex-col"
          style={{ maxHeight: '92svh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
            <h2 className="text-[15px] font-semibold">{event ? 'Edit event' : 'New event'}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Title *</label>
              <input required value={form.title} onChange={set('title')} className={input} placeholder="Team call…" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium">Start</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" required value={splitDateTime(form.starts_at).date}
                    onChange={e => setForm(prev => ({ ...prev, starts_at: joinDateTime(e.target.value, splitDateTime(prev.starts_at).time) }))}
                    className={`${input} w-[118px] flex-shrink-0`} />
                  <TimePicker
                    value={splitDateTime(form.starts_at).time}
                    onChange={t => setForm(prev => ({ ...prev, starts_at: joinDateTime(splitDateTime(prev.starts_at).date, t) }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium">End</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" required value={splitDateTime(form.ends_at).date}
                    onChange={e => setForm(prev => ({ ...prev, ends_at: joinDateTime(e.target.value, splitDateTime(prev.ends_at).time) }))}
                    className={`${input} w-[118px] flex-shrink-0`} />
                  <TimePicker
                    value={splitDateTime(form.ends_at).time}
                    onChange={t => setForm(prev => ({ ...prev, ends_at: joinDateTime(splitDateTime(prev.ends_at).date, t) }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium">Link a customer</label>
                <select value={form.contact_id} onChange={handleContactChange} className={input}>
                  <option value="">— None —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-medium">Guest email</label>
                <input type="email" value={form.guest_email} onChange={set('guest_email')} className={input} placeholder="name@example.com" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[15px] font-medium flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                Meeting link
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <input value={form.meeting_link}
                  onChange={e => { set('meeting_link')(e); setGcalMeetEventId(null); setCalBookingUid(null); setLinkIsAuto(false) }}
                  className={`${input} flex-1 min-w-[180px]`}
                  placeholder="https://cal.com/… or https://meet.google.com/…" />
                {gcalConnected && (
                  <button type="button" onClick={handleGenerateMeetLink} disabled={generatingLink}
                    className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl flex-shrink-0 disabled:opacity-60"
                    style={{ background: 'rgba(42,82,160,0.10)', color: '#2a52a0' }}>
                    {generatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generatingLink ? 'Generating…' : form.meeting_link ? 'Regenerate' : 'Generate Google Meet link'}
                  </button>
                )}
                {calConnected && (
                  <button type="button" onClick={handleOpenCalPanel}
                    className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: 'rgba(74,157,181,0.12)', color: '#2a7a8c' }}>
                    <CalendarClock className="w-3.5 h-3.5" />
                    Book via Cal.com
                  </button>
                )}
              </div>
              {linkError && <p className="text-[13px] text-red-500">{linkError}</p>}
              {!linkError && gcalConnected && !form.meeting_link && (
                <p className="text-[12.5px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  A Google Meet link is generated automatically once you add a title and time.
                </p>
              )}

              {showCalPanel && (
                <div className="rounded-xl border p-3 space-y-2.5" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted))' }}>
                  {calLoadError ? (
                    <p className="text-[13px] text-red-500">{calLoadError}</p>
                  ) : calEventTypes === null ? (
                    <p className="text-[13px] flex items-center gap-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your Cal.com event types…
                    </p>
                  ) : calEventTypes.length === 0 ? (
                    <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No event types found on your Cal.com account.
                    </p>
                  ) : (
                    <>
                      <label className="text-[13px] font-medium">Event type</label>
                      <select value={calEventTypeId} onChange={e => setCalEventTypeId(e.target.value)} className={input}>
                        <option value="">— Select —</option>
                        {calEventTypes.map(et => (
                          <option key={et.id} value={et.id}>{et.title}</option>
                        ))}
                      </select>
                      <p className="text-[12.5px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Books at the Start time above, using the Guest email field. Must fall within that event type's available hours on Cal.com.
                      </p>
                      {calError && <p className="text-[13px] text-red-500">{calError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={handleCreateCalBooking} disabled={bookingCal}
                          className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                          style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
                          {bookingCal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
                          {bookingCal ? 'Booking…' : 'Create booking'}
                        </button>
                        <button type="button" onClick={() => setShowCalPanel(false)}
                          className="text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={3} className={`${input} resize-none`} />
            </div>

            {error && <p className="text-[13px] text-red-500">{error}</p>}

            <div className="flex items-center gap-3 pt-1 pb-2">
              <button type="submit" disabled={isPending}
                className="flex-1 sm:flex-none bg-accent text-white text-[15px] font-medium px-5 py-2.5 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
                {isPending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
              </button>
              {event && (
                <button type="button" onClick={handleDelete} disabled={isPending}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[15px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Past-date confirmation popup */}
      {showPastConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-[hsl(var(--card))] rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(234,179,8,0.35)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
          >
            <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.30)' }}>
                <AlertTriangle className="w-6 h-6" style={{ color: '#b45309' }} />
              </div>
              <div>
                <p className="text-[16px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>Past date detected</p>
                <p className="text-[13px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  This event starts in the past. Are you sure you want to save it?
                </p>
              </div>
            </div>
            <div className="flex border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <button
                onClick={() => setShowPastConfirm(false)}
                className="flex-1 py-3 text-[14px] font-semibold transition-colors hover:bg-[hsl(var(--muted))]"
                style={{ color: 'hsl(var(--muted-foreground))', borderRight: '1px solid hsl(var(--border))' }}
              >
                Go back
              </button>
              <button
                onClick={() => { setShowPastConfirm(false); doSave() }}
                disabled={isPending}
                className="flex-1 py-3 text-[14px] font-bold transition-colors hover:bg-[hsl(var(--muted))]"
                style={{ color: '#b45309' }}
              >
                Save anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const input = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'
