import { Loader2 } from 'lucide-react'

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
