'use client'

import { useState, useTransition } from 'react'
import { updateTenantSettings } from '@/lib/actions/settings'
import { type TenantSettings } from '@/lib/types/settings'
import { Image as ImageIcon, Ruler, AlertTriangle, CalendarClock, PackageCheck } from 'lucide-react'

const TOGGLES: Array<{
  key: keyof TenantSettings
  label: string
  description: string
  icon: React.ElementType
  color: string
}> = [
  { key: 'inventory_enable_images',          label: 'Item photos',       description: 'Attach a photo to catalog items',        icon: ImageIcon,     color: '#a855f7' },
  { key: 'inventory_enable_uom',             label: 'Unit of measure',   description: 'Track units like each, box, or case',    icon: Ruler,         color: '#0ea5e9' },
  { key: 'inventory_enable_reorder_points',  label: 'Reorder points',    description: 'Flag items that need restocking',        icon: AlertTriangle, color: '#f59e0b' },
  { key: 'inventory_enable_expiry_dates',    label: 'Expiry dates',      description: 'Track expiration on perishable items',   icon: CalendarClock, color: '#ef4444' },
  { key: 'inventory_enable_rental_condition', label: 'Rental tracking',  description: 'Track rentals and condition on return',  icon: PackageCheck,  color: '#10b981' },
]

// Same pattern as ModuleToggles.tsx (optimistic local state + visible
// error on failure) — only rendered on the Full inventory tier, since
// these are the 5 optional Full-tier features (the tier itself is
// super-admin-only, set via TenantModulesPanel).
export function InventoryToggles({ settings }: { settings: TenantSettings }) {
  const [pending, startTransition] = useTransition()
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
        {TOGGLES.map(({ key, label, description, icon: Icon, color }, i) => {
          const enabled = localSettings[key]
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '13px 16px',
              borderBottom: i < TOGGLES.length - 1 ? '1px solid hsl(var(--border))' : 'none',
              opacity: pending ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: enabled ? `${color}1a` : 'hsl(var(--muted))',
                transition: 'background 0.2s',
              }}>
                <Icon style={{ width: '16px', height: '16px', color: enabled ? color : 'hsl(var(--muted-foreground))', transition: 'color 0.2s' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{label}</p>
                <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {description}
                </p>
              </div>

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
