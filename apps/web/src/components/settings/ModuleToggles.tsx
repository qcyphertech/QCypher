'use client'

import { useState, useTransition } from 'react'
import { updateTenantSettings } from '@/lib/actions/settings'
import { type TenantSettings } from '@/lib/types/settings'
import { Calendar, FileText, Package, ShoppingBag, BarChart2, Bot } from 'lucide-react'

const MODULES: Array<{
  key: keyof TenantSettings
  label: string
  description: string
  icon: React.ElementType
  color: string
}> = [
  { key: 'show_calendar',  label: 'Calendar',   description: 'Scheduling and event management',       icon: Calendar,    color: '#0ea5e9' },
  { key: 'show_catalog',   label: 'Catalog',    description: 'Products, services & rentals',          icon: Package,     color: '#f59e0b' },
  { key: 'show_orders',    label: 'Orders',     description: 'Sales orders and invoicing',            icon: ShoppingBag, color: '#10b981' },
  { key: 'show_templates', label: 'Templates',  description: 'SMS and email quick-reply snippets',    icon: FileText,    color: '#a855f7' },
  { key: 'show_overview',  label: 'Overview',   description: 'Income, expenses, revenue & customer health', icon: BarChart2,   color: '#22c55e' },
  { key: 'show_crm_bot',   label: 'CRM Assistant', description: 'In-app AI assistant for how-to questions and quick actions', icon: Bot, color: '#6366f1' },
]

export function ModuleToggles({ settings, availableModules }: { settings: TenantSettings; availableModules?: string[] }) {
  const [pending, startTransition] = useTransition()
  // Mirrors `settings` but flips immediately on click — the server prop
  // only catches up once revalidatePath's refresh lands, and previously
  // this had no local state at all, so a failed save (e.g. an RLS write
  // that's silently accepted with 0 rows changed) looked identical to a
  // successful one until the next hard reload.
  const [localSettings, setLocalSettings] = useState(settings)
  const [error, setError] = useState<string | null>(null)

  function handleToggle(key: keyof TenantSettings, value: boolean) {
    setError(null)
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    startTransition(async () => {
      try {
        await updateTenantSettings({ [key]: value })
      } catch {
        setLocalSettings(prev => ({ ...prev, [key]: !value }))
        setError("Couldn't save that change — try again.")
      }
    })
  }

  // availableModules undefined means the platform_modules lookup failed
  // (e.g. migration not yet run) — fail open and show everything rather
  // than hiding every toggle.
  const visibleModules = availableModules
    ? MODULES.filter(m => availableModules.includes(m.key))
    : MODULES

  if (visibleModules.length === 0) {
    return (
      <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>
        No modules are currently available for your workspace.
      </p>
    )
  }

  return (
    <div>
      {error && (
        <p style={{ fontSize: '13px', color: 'hsl(var(--destructive, 0 84% 60%))', marginBottom: '8px' }}>{error}</p>
      )}
      <div style={{
        borderRadius: '18px',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        overflow: 'hidden',
      }}>
      {visibleModules.map(({ key, label, description, icon: Icon, color }, i) => {
        const enabled = localSettings[key]
        return (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '13px 16px',
            borderBottom: i < visibleModules.length - 1 ? '1px solid hsl(var(--border))' : 'none',
            opacity: pending ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}>
            {/* Icon */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: enabled ? `${color}1a` : 'hsl(var(--muted))',
              transition: 'background 0.2s',
            }}>
              <Icon style={{ width: '16px', height: '16px', color: enabled ? color : 'hsl(var(--muted-foreground))', transition: 'color 0.2s' }} />
            </div>

            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{label}</p>
              <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {description}
              </p>
            </div>

            {/* Toggle */}
            <button
              role="switch"
              aria-checked={enabled}
              disabled={pending}
              onClick={() => handleToggle(key, !enabled)}
              style={{
                flexShrink: 0,
                width: '44px', height: '24px', borderRadius: '100px',
                border: 'none', cursor: 'pointer', position: 'relative',
                background: enabled ? '#2a52a0' : 'hsl(var(--muted))',
                transition: 'background 0.2s',
                outline: 'none',
              }}
            >
              <span style={{
                position: 'absolute', top: '2px', left: '2px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
                transform: enabled ? 'translateX(20px)' : 'translateX(0)',
                display: 'block',
              }} />
            </button>
          </div>
        )
      })}
      </div>
    </div>
  )
}
