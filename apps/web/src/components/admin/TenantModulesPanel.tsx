'use client'

import { useEffect, useState, useTransition } from 'react'
import { GitBranch, Calendar, Package, ShoppingBag, FileText, BarChart2 } from 'lucide-react'
import { listTenantModuleAccess, setTenantModuleAccess, type TenantModuleGrant } from '@/lib/actions/platform-modules'

const ICONS: Record<string, React.ElementType> = {
  GitBranch, Calendar, Package, ShoppingBag, FileText, BarChart2,
}

export function TenantModulesPanel({ tenantId }: { tenantId: string }) {
  const [modules, setModules] = useState<TenantModuleGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  function load() {
    setLoading(true)
    listTenantModuleAccess(tenantId).then(r => { setModules(r); setLoading(false) })
  }
  useEffect(load, [tenantId])

  function toggle(key: string, next: boolean) {
    startTransition(async () => {
      await setTenantModuleAccess(tenantId, key, next)
      load()
    })
  }

  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
        <h2 className="text-[15px] font-semibold">Modules</h2>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
          Choose which modules this account can use. Their own Settings toggle only offers what's granted here.
        </p>
      </div>
      {loading ? (
        <p className="px-5 py-4 text-[15px] text-[hsl(var(--muted-foreground))]">Loading…</p>
      ) : (
        <div className="divide-y divide-[hsl(var(--border))]">
          {modules.map(m => {
            const Icon = ICONS[m.icon_key] ?? Package
            const disabledByPlatform = !m.platform_available
            const active = m.enabled && !disabledByPlatform
            return (
              <div key={m.key} className="flex items-center gap-3.5 px-5 py-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: active ? `${m.color}1a` : 'hsl(var(--muted))' }}
                >
                  <Icon className="w-4 h-4" style={{ color: active ? m.color : 'hsl(var(--muted-foreground))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium">{m.label}</p>
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">
                    {disabledByPlatform ? 'Disabled platform-wide' : m.description}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={m.enabled}
                  disabled={isPending || disabledByPlatform}
                  onClick={() => toggle(m.key, !m.enabled)}
                  title={disabledByPlatform ? 'Turned off for every workspace in the Modules admin tab' : undefined}
                  className="flex-shrink-0 w-11 h-6 rounded-full relative transition-colors disabled:opacity-40"
                  style={{ background: m.enabled && !disabledByPlatform ? '#2a52a0' : 'hsl(var(--muted))' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{ transform: m.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
