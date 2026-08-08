import { Loader2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SectionHeader({
  icon: Icon, label, count, accent,
}: { icon: React.ElementType; label: string; count?: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: accent ? 'rgba(42,82,160,0.10)' : 'hsl(var(--muted))',
          color: accent ? '#2a52a0' : 'hsl(var(--muted-foreground))',
        }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h2 className="text-[15px] font-semibold">
        {label}
        {count !== undefined && <span className="text-[hsl(var(--muted-foreground))] font-medium"> ({count})</span>}
      </h2>
    </div>
  )
}

export function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-dashed border-[hsl(var(--border))] py-10 flex flex-col items-center justify-center gap-2.5 text-center">
      <div className="w-9 h-9 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
      <p className="text-[14px] text-[hsl(var(--muted-foreground))]">{message}</p>
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div className="flex items-center gap-2 text-[15px] text-[hsl(var(--muted-foreground))] py-6">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  )
}

// Per-column header filter popover — a small icon button that toggles a
// dropdown of options anchored to the column header, used by tables with
// filterable columns (Clients, Audit Trail).

export function FilterToggle({ active, open, onClick }: { active: boolean; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className={cn(
        'flex items-center justify-center w-5 h-5 rounded-md transition-colors',
        active ? 'text-accent' : 'text-[hsl(var(--muted-foreground))] opacity-60 hover:opacity-100',
        open && 'bg-[hsl(var(--muted))]',
      )}
    >
      <Filter className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}

export function FilterPopover({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute left-0 top-full mt-1.5 z-20 min-w-[160px] p-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-card normal-case font-normal"
    >
      {children}
    </div>
  )
}

export function FilterOption({ label, active, onClick, color, capitalize }: { label: string; active: boolean; onClick: () => void; color?: string; capitalize?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-[14px] transition-colors',
        capitalize && 'capitalize',
        active ? 'bg-accent/10 text-accent font-semibold' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
      )}
    >
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
      {label}
    </button>
  )
}
