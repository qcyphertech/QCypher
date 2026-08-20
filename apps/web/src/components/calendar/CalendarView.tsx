'use client'

import { useState, useRef, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, format, parseISO, getHours, getMinutes,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { EventModal } from './EventModal'
import { AddEventSheet } from './AddEventSheet'
import type { Tables } from '@/types/database'

type CalEvent = Pick<Tables<'events'>, 'id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'contact_id' | 'guest_email' | 'meeting_link' | 'gcal_meet_event_id' | 'cal_booking_uid'>
type Contact = { id: string; first_name: string; last_name: string | null; email: string | null }
type ViewMode = 'month' | 'week' | '3day' | 'day'

type CalBooking = {
  id: string
  title: string | null
  starts_at: string | null
  ends_at: string | null
  status: string
  attendee_name: string | null
  cal_booking_uid: string
}

type GCalEvent = {
  id: string
  title: string | null
  starts_at: string | null
  ends_at: string | null
  all_day: boolean
  status: string | null
  gcal_id: string
}

const HOUR_H    = 64
const DAY_START = 7
const DAY_END   = 21
const HOURS     = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

// Futuristic palette — works on top of the app theme
const FX = {
  border:      'rgba(42,82,160,0.18)',
  borderMed:   'rgba(42,82,160,0.30)',
  glow:        '0 0 18px rgba(42,82,160,0.18)',
  glowStrong:  '0 0 18px rgba(42,82,160,0.28)',
  gridLine:    'rgba(42,82,160,0.14)',
  headerGrad:  'linear-gradient(135deg, rgba(26,48,112,0.08) 0%, rgba(42,82,160,0.12) 100%)',
  activePill:  'linear-gradient(135deg, #1a3070 0%, #2a52a0 100%)',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function getDays(mode: ViewMode, anchor: Date): Date[] {
  if (mode === 'month') return []
  if (mode === 'week') {
    const s = startOfWeek(anchor, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }
  if (mode === '3day') return [anchor, addDays(anchor, 1), addDays(anchor, 2)]
  return [anchor]
}

function navigate(mode: ViewMode, anchor: Date, dir: 1 | -1): Date {
  if (mode === 'month') return dir === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1)
  if (mode === 'week')  return addDays(anchor, dir * 7)
  if (mode === '3day')  return addDays(anchor, dir * 3)
  return addDays(anchor, dir)
}

function headerLabel(mode: ViewMode, anchor: Date): string {
  if (mode === 'month') return format(anchor, 'MMMM yyyy')
  if (mode === 'week') {
    const s = startOfWeek(anchor, { weekStartsOn: 0 })
    const e = addDays(s, 6)
    return isSameMonth(s, e)
      ? `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`
      : `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  }
  if (mode === '3day') return `${format(anchor, 'MMM d')} – ${format(addDays(anchor, 2), 'MMM d, yyyy')}`
  return format(anchor, 'EEEE, MMMM d, yyyy')
}

function buildWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 0 })
  const weeks: Date[][] = []
  let day = start
  while (day <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1) }
    weeks.push(week)
  }
  return weeks
}

function evPos(ev: CalEvent) {
  const s = parseISO(ev.starts_at)
  const e = parseISO(ev.ends_at)
  const startMin = getHours(s) * 60 + getMinutes(s)
  const endMin   = getHours(e) * 60 + getMinutes(e)
  const top    = Math.max(0, (startMin - DAY_START * 60) / 60) * HOUR_H
  const height = Math.max((endMin - startMin) / 60 * HOUR_H, 24)
  return { top, height, startMin, endMin }
}

// Assign each event a column index so overlapping events sit side-by-side
function layoutEvents(evs: CalEvent[]) {
  const sorted = [...evs].sort((a, b) =>
    parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime()
  )
  const cols: number[] = [] // cols[i] = end minute of last event in column i
  const result: { ev: CalEvent; col: number; totalCols: number }[] = []

  sorted.forEach(ev => {
    const { startMin, endMin } = evPos(ev)
    let placed = false
    for (let i = 0; i < cols.length; i++) {
      if (cols[i] <= startMin) {
        cols[i] = endMin
        result.push({ ev, col: i, totalCols: 0 })
        placed = true
        break
      }
    }
    if (!placed) {
      cols.push(endMin)
      result.push({ ev, col: cols.length - 1, totalCols: 0 })
    }
  })

  // Determine totalCols for each event: max columns active during its time span
  result.forEach(item => {
    const { startMin, endMin } = evPos(item.ev)
    const concurrent = result.filter(other => {
      const o = evPos(other.ev)
      return o.startMin < endMin && o.endMin > startMin
    })
    item.totalCols = Math.max(...concurrent.map(c => c.col)) + 1
  })

  return result
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthView({ anchor, events, onClickDay, onClickEvent }: {
  anchor: Date
  events: CalEvent[]
  onClickDay: (d: Date) => void
  onClickEvent: (ev: CalEvent) => void
}) {
  const weeks = buildWeeks(anchor)

  return (
    <div>
      {/* Day labels */}
      <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${FX.border}` }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
          <div key={d} className="text-center py-2.5"
            style={{ color: 'var(--cal-accent)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.10em' }}>
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7" style={{ borderBottom: `1px solid ${FX.gridLine}` }}>
          {week.map((day, di) => {
            const dayEvs = events.filter(e => isSameDay(parseISO(e.starts_at), day))
            const inMonth = isSameMonth(day, anchor)
            const today   = isToday(day)
            return (
              <div key={di}
                onClick={() => onClickDay(day)}
                className="min-h-[84px] p-1.5 cursor-pointer transition-all group"
                style={{
                  borderRight: `1px solid ${FX.gridLine}`,
                  opacity: inMonth ? 1 : 0.25,
                  background: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex justify-start mb-1">
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    width: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px',
                    background: today ? 'var(--cal-marker-bg)' : 'transparent',
                    color: today ? 'var(--cal-marker-fg)' : 'hsl(var(--foreground))',
                    boxShadow: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvs.slice(0, 2).map(ev => (
                    <button key={ev.id}
                      onClick={e => { e.stopPropagation(); onClickEvent(ev) }}
                      className="w-full text-left truncate transition-all"
                      style={{
                        fontSize: '11px', fontWeight: 700,
                        background: 'var(--cal-event-bg)',
                        color: 'var(--cal-event-fg)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        borderLeft: '2px solid var(--cal-accent)',
                        letterSpacing: '0.01em',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--cal-event-bg)')}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {dayEvs.length > 2 && (
                    <p style={{ fontSize: '11px', color: 'var(--cal-accent)', fontWeight: 700, paddingLeft: '4px' }}>
                      +{dayEvs.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Time grid ─────────────────────────────────────────────────────────────────
function TimeGrid({ days, events, onClickSlot, onClickEvent }: {
  days: Date[]
  events: CalEvent[]
  onClickSlot: (d: Date, hour: number, minute: number) => void
  onClickEvent: (ev: CalEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - DAY_START) * HOUR_H
  }, [])

  return (
    <div>
      {/* Day headers */}
      <div className="flex" style={{ borderBottom: `1px solid ${FX.border}` }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        {days.map(day => {
          const today = isToday(day)
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-3"
              style={{ borderLeft: `1px solid ${FX.border}` }}>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.10em', color: today ? 'var(--cal-accent)' : 'hsl(var(--muted-foreground))' }}>
                {format(day, 'EEE').toUpperCase()}
              </p>
              <p style={{
                fontSize: '18px', fontWeight: 900, lineHeight: 1.1, marginTop: '2px',
                color: today ? 'var(--cal-accent)' : 'hsl(var(--foreground))',
                textShadow: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100svh - 290px)' }}>
        <div className="flex relative" style={{ height: `${HOURS.length * HOUR_H}px` }}>
          {/* Time labels */}
          <div style={{ width: 52, flexShrink: 0, position: 'relative' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_H, position: 'relative' }}>
                {/* Hour label */}
                <span style={{
                  position: 'absolute', top: -9, right: 8,
                  fontSize: '11px', fontWeight: 700,
                  color: 'var(--cal-accent)',
                  letterSpacing: '0.04em',
                }}>
                  {format(new Date(2000, 0, 1, h), 'ha').toLowerCase()}
                </span>
                {/* :30 label */}
                <span style={{
                  position: 'absolute', top: HOUR_H / 2 - 7, right: 8,
                  fontSize: '9px', fontWeight: 600,
                  color: 'rgba(42,82,160,0.45)',
                  letterSpacing: '0.03em',
                }}>
                  :30
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvs = events.filter(e => isSameDay(parseISO(e.starts_at), day))
            const today   = isToday(day)
            return (
              <div key={di} className="flex-1 relative"
                style={{
                  borderLeft: `1px solid ${today ? FX.borderMed : FX.border}`,
                  background: today ? 'rgba(42,82,160,0.04)' : 'transparent',
                }}>
                {/* Hour rows — each split into two 30-min half-blocks */}
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H, borderBottom: `1px solid ${FX.borderMed}` }}>
                    {/* :00 half */}
                    <div
                      onClick={() => onClickSlot(day, h, 0)}
                      className="cursor-pointer transition-all"
                      style={{ height: HOUR_H / 2 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    />
                    {/* :30 half — dashed separator line */}
                    <div
                      onClick={() => onClickSlot(day, h, 30)}
                      className="cursor-pointer transition-all"
                      style={{
                        height: HOUR_H / 2,
                        borderTop: '1px dashed rgba(42,82,160,0.20)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    />
                  </div>
                ))}

                {/* Events */}
                {(() => {
                  const layout = layoutEvents(dayEvs)
                  return layout.map(({ ev, col, totalCols }) => {
                  const { top, height } = evPos(ev)
                  const pct = 100 / totalCols
                  return (
                    <button key={ev.id}
                      onClick={e => { e.stopPropagation(); onClickEvent(ev) }}
                      className="absolute transition-all"
                      style={{
                        left: `calc(${col * pct}% + 2px)`,
                        width: `calc(${pct}% - 4px)`,
                        top, height,
                        background: 'var(--cal-event-bg)',
                        borderLeft: '3px solid var(--cal-accent)',
                        borderRadius: '6px',
                        boxShadow: `0 0 10px rgba(42,82,160,0.20)`,
                        zIndex: 10,
                        textAlign: 'left',
                        padding: '3px 8px',
                        overflow: 'hidden',
                        backdropFilter: 'blur(4px)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.30)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--cal-event-bg)')}
                    >
                      <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cal-event-fg)', lineHeight: 1.2, letterSpacing: '0.02em' }} className="truncate">
                        {ev.title}
                      </p>
                      {height > 30 && (
                        <p style={{ fontSize: '11px', color: 'var(--cal-event-fg)', opacity: 0.75, marginTop: '1px' }}>
                          {format(parseISO(ev.starts_at), 'h:mm')}–{format(parseISO(ev.ends_at), 'h:mma')}
                        </p>
                      )}
                    </button>
                  )
                  })
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── View switcher pill ────────────────────────────────────────────────────────
const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week',  label: 'Week'  },
  { key: '3day',  label: '3 Day' },
  { key: 'day',   label: 'Day'   },
]

// ── Main export ───────────────────────────────────────────────────────────────
export function CalendarView({
  events,
  contacts = [],
  calBookings = [],
  gcalEvents = [],
  calConnected = false,
  gcalConnected = false,
}: {
  events: CalEvent[]
  contacts?: Contact[]
  calBookings?: CalBooking[]
  gcalEvents?: GCalEvent[]
  calConnected?: boolean
  gcalConnected?: boolean
}) {
  const [view, setViewRaw] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'month'
    return (localStorage.getItem('cal_view') as ViewMode) ?? 'month'
  })
  function setView(v: ViewMode) {
    localStorage.setItem('cal_view', v)
    setViewRaw(v)
  }
  const [anchor,    setAnchor]    = useState(() => new Date())
  const [modal,     setModal]     = useState<{ date?: Date; event?: CalEvent; readOnly?: boolean } | null>(null)
  const [showSheet, setShowSheet] = useState(false)

  // Merge manual events + Cal.com bookings + Google Calendar events
  const allEvents: CalEvent[] = [
    ...events,
    ...calBookings
      .filter(b => b.starts_at && b.ends_at && b.status !== 'cancelled')
      .map(b => ({
        id:          `cal_${b.cal_booking_uid}`,
        title:       b.title ?? (b.attendee_name ? `Booking — ${b.attendee_name}` : 'Cal.com booking'),
        description: null,
        starts_at:   b.starts_at!,
        ends_at:     b.ends_at!,
        contact_id:  null,
        guest_email: null,
        meeting_link: null,
        gcal_meet_event_id: null,
        cal_booking_uid: null,
      })),
    ...gcalEvents
      .filter(e => e.starts_at && e.ends_at && e.status !== 'cancelled')
      .map(e => ({
        id:          `gcal_${e.gcal_id}`,
        title:       e.title ?? '(No title)',
        description: null,
        starts_at:   e.starts_at!,
        ends_at:     e.ends_at!,
        contact_id:  null,
        guest_email: null,
        meeting_link: null,
        gcal_meet_event_id: null,
        cal_booking_uid: null,
      })),
  ]

  const days = getDays(view, anchor)

  function openSlot(date: Date, hour?: number, minute = 0) {
    const d = hour !== undefined
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute)
      : date
    setModal({ date: d })
  }

  return (
    <>
      <div style={{
        borderRadius: '20px',
        border: `1px solid ${FX.border}`,
        background: 'hsl(var(--card))',
        boxShadow: FX.glow,
        overflow: 'hidden',
      }}>
        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', padding: '12px 16px',
          background: FX.headerGrad,
          borderBottom: `1px solid ${FX.border}`,
          flexWrap: 'wrap', rowGap: '8px',
        }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={() => setAnchor(d => navigate(view, d, -1))}
              style={{
                padding: '6px', borderRadius: '8px', border: `1px solid ${FX.border}`,
                background: 'transparent', cursor: 'pointer', color: 'var(--cal-accent)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setAnchor(new Date())}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: `1px solid ${FX.border}`,
                background: 'transparent', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700, color: 'var(--cal-accent)', letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              TODAY
            </button>
            <button onClick={() => setAnchor(d => navigate(view, d, 1))}
              style={{
                padding: '6px', borderRadius: '8px', border: `1px solid ${FX.border}`,
                background: 'transparent', cursor: 'pointer', color: 'var(--cal-accent)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,82,160,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Header label */}
          <span style={{
            flex: 1, textAlign: 'center', minWidth: 0,
            fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em',
            color: 'hsl(var(--foreground))',
            textTransform: 'uppercase',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {headerLabel(view, anchor)}
          </span>

          {/* View switcher */}
          <div style={{
            display: 'flex', borderRadius: '10px', overflow: 'hidden',
            border: `1px solid ${FX.border}`,
          }}>
            {VIEWS.map((v, i) => (
              <button key={v.key}
                onClick={() => setView(v.key)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderRight: i < VIEWS.length - 1 ? `1px solid ${FX.border}` : 'none',
                  background: view === v.key ? FX.activePill : 'transparent',
                  color: view === v.key ? '#fff' : 'var(--cal-accent)',
                  textShadow: view === v.key ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                  boxShadow: view === v.key ? '0 0 16px rgba(42,82,160,0.30)' : 'none',
                }}
              >
                {v.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── View content ── */}
        {view === 'month' ? (
          <MonthView
            anchor={anchor}
            events={allEvents}
            onClickDay={openSlot}
            onClickEvent={ev => {
              const ro = ev.id.startsWith('cal_') || ev.id.startsWith('gcal_')
              setModal({ event: ev, readOnly: ro })
            }}
          />
        ) : (
          <TimeGrid
            days={days}
            events={allEvents}
            onClickSlot={openSlot}
            onClickEvent={ev => {
              const ro = ev.id.startsWith('cal_') || ev.id.startsWith('gcal_')
              setModal({ event: ev, readOnly: ro })
            }}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowSheet(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6"
        style={{
          background: FX.activePill,
          color: '#fff', border: 'none', cursor: 'pointer',
          borderRadius: '16px',
          boxShadow: `${FX.glowStrong}, 0 4px 24px rgba(74,157,181,0.35)`,
          width: '48px', height: '48px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em',
          transition: 'all 0.15s',
        }}
      >
        <Plus size={20} />
      </button>

      {showSheet && (
        <AddEventSheet
          calConnected={calConnected}
          gcalConnected={gcalConnected}
          onManual={() => { setShowSheet(false); setModal({ date: new Date() }) }}
          onClose={() => setShowSheet(false)}
        />
      )}

      {modal && <EventModal date={modal.date} event={modal.event} readOnly={modal.readOnly} contacts={contacts} gcalConnected={gcalConnected} calConnected={calConnected} onClose={() => setModal(null)} />}
    </>
  )
}
