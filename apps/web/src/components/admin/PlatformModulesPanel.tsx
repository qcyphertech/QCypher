'use client'

import { useEffect, useState, useTransition } from 'react'
import { GitBranch, Calendar, Package, ShoppingBag, FileText, BarChart2 } from 'lucide-react'
import { listPlatformModules, setModuleAvailability, type PlatformModule } from '@/lib/actions/platform-modules'

const ICONS: Record<string, React.ElementType> = {
  GitBranch, Calendar, Package, ShoppingBag, FileText, BarChart2,
}

export function PlatformModulesPanel() {
  const [modules, setModules] = useState<PlatformModule[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  function load() {
    setLoading(true)
    listPlatformModules().then(r => { setModules(r); setLoading(false) })
  }
  useEffect(load, [])

  function toggle(key: string, next: boolean) {
    startTransition(async () => {
      await setModuleAvailability(key, next)
      load()
    })
  }

  if (loading) return <p className="text-[15px] text-[hsl(var(--muted-foreground))]">Loading…</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold">Modules</h2>
        <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">
          Control which modules are offered to tenants at all. Turning a module off here hides it for every
          workspace immediately, regardless of that tenant's own toggle — their preference is preserved and
          takes effect again automatically if you turn it back on.
        </p>
      </div>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden divide-y divide-[hsl(var(--border))]">
        {modules.map(m => {
          const Icon = ICONS[m.icon_key] ?? Package
          return (
            <div key={m.key} className="flex items-center gap-3.5 px-4 py-3.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: m.is_available ? `${m.color}1a` : 'hsl(var(--muted))' }}
              >
                <Icon className="w-4 h-4" style={{ color: m.is_available ? m.color : 'hsl(var(--muted-foreground))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium">{m.label}</p>
                <p className="text-[15px] text-[hsl(var(--muted-foreground))] truncate">{m.description}</p>
              </div>
              <button
                role="switch"
                aria-checked={m.is_available}
                disabled={isPending}
                onClick={() => toggle(m.key, !m.is_available)}
                className="flex-shrink-0 w-11 h-6 rounded-full relative transition-colors disabled:opacity-50"
                style={{ background: m.is_available ? '#2a52a0' : 'hsl(var(--muted))' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: m.is_available ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
