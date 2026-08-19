'use client'

import { useState } from 'react'
import { format, isToday, isTomorrow, isThisWeek, parseISO, isSameDay } from 'date-fns'
import { Calendar, Plus } from 'lucide-react'
import { EventModal } from './EventModal'
import type { Tables } from '@/types/database'

type CalEvent = Pick<Tables<'events'>, 'id' | 'title' | 'description' | 'starts_at' | 'ends_at' | 'contact_id' | 'guest_email' | 'meeting_link' | 'gcal_meet_event_id'>

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'EEE, MMM d')
}

function groupByDay(events: CalEvent[]): { date: Date; events: CalEvent[] }[] {
  const map = new Map<string, { date: Date; events: CalEvent[] }>()
  for (const ev of events) {
    const d = parseISO(ev.starts_at)
    const key = format(d, 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, { date: d, events: [] })
    map.get(key)!.events.push(ev)
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function AgendaView({ events }: { events: CalEvent[] }) {
  const [modal, setModal] = useState<{ date?: Date; event?: CalEvent } | null>(null)
  const groups = groupByDay(events.filter(e => parseISO(e.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0))))

  return (
    <>
      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
            <Calendar className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[15px] text-[hsl(var(--muted-foreground))]">No upcoming events</p>
          </div>
        )}
        {groups.map(({ date, events: dayEvents }) => (
          <div key={format(date, 'yyyy-MM-dd')}>
            <p className={`text-[15px] font-semibold uppercase tracking-wide mb-2 ${isToday(date) ? 'text-accent' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {dayLabel(date)}
            </p>
            <div className="space-y-2">
              {dayEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setModal({ event: ev })}
                  className="w-full flex items-start gap-3 bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft px-4 py-3 text-left hover:bg-[hsl(var(--muted))]/60 transition-colors touch-target"
                >
                  <div className="w-1 self-stretch rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{ev.title}</p>
                    <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      {format(parseISO(ev.starts_at), 'h:mm a')} – {format(parseISO(ev.ends_at), 'h:mm a')}
                    </p>
                    {ev.description && (
                      <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setModal({ date: new Date() })}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 bg-accent text-white rounded-2xl shadow-card w-12 h-12 flex items-center justify-center hover:bg-accent-hover transition-colors md:w-auto md:h-auto md:px-4 md:py-2.5 md:gap-2 touch-target"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden md:inline text-[15px] font-medium">New event</span>
      </button>

      {modal && <EventModal date={modal.date} event={modal.event} onClose={() => setModal(null)} />}
    </>
  )
}
