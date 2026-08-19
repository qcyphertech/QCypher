import { format } from 'date-fns'
import { Phone, Mail, MapPin, FileText } from 'lucide-react'
import type { Tables } from '@/types/database'

type Interaction = Tables<'interactions'>

const TYPE_META = {
  call:  { icon: Phone,    label: 'Call',   color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  email: { icon: Mail,     label: 'Email',  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  visit: { icon: MapPin,   label: 'Visit',  color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  note:  { icon: FileText, label: 'Note',   color: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' },
}

export function InteractionTimeline({ interactions }: { interactions: Interaction[] }) {
  if (interactions.length === 0) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
        <p className="text-[15px] text-[hsl(var(--muted-foreground))]">No interactions yet. Log the first one above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {interactions.map(item => {
        const meta = TYPE_META[item.type]
        const Icon = meta.icon
        return (
          <div key={item.id} className="flex gap-3 bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft p-4">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{meta.label}</span>
                <span className="text-[15px] text-[hsl(var(--muted-foreground))]">
                  {format(new Date(item.occurred_at), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
              <p className="text-[15px] mt-1 whitespace-pre-wrap">{item.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
