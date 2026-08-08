'use client'

import { useState } from 'react'
import { Download, User, FileText, Calendar, Check } from 'lucide-react'

type Option = { key: 'details' | 'notes' | 'events'; label: string; description: string; icon: React.ElementType }

const OPTIONS: Option[] = [
  { key: 'details', label: 'Contact details', description: 'Email, phone, company, address, tags, source, status', icon: User },
  { key: 'notes', label: 'Notes', description: 'All notes logged against each contact', icon: FileText },
  { key: 'events', label: 'Calendar events', description: 'Number of scheduled events per contact', icon: Calendar },
]

export function ExportSelector() {
  const [selected, setSelected] = useState<Record<Option['key'], boolean>>({ details: true, notes: true, events: true })

  function toggle(key: Option['key']) {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const params = new URLSearchParams()
  for (const opt of OPTIONS) if (!selected[opt.key]) params.set(opt.key, '0')
  const href = `/api/export/csv${params.toString() ? `?${params.toString()}` : ''}`

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {OPTIONS.map(({ key, label, description, icon: Icon }) => {
          const on = selected[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                textAlign: 'left', width: '100%',
                padding: '14px 16px', borderRadius: '14px',
                border: `1.5px solid ${on ? '#2a52a0' : 'hsl(var(--border))'}`,
                background: on ? 'rgba(42,82,160,0.06)' : 'hsl(var(--background))',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? 'rgba(42,82,160,0.12)' : 'hsl(var(--muted))',
              }}>
                <Icon style={{ width: '16px', height: '16px', color: on ? '#2a52a0' : 'hsl(var(--muted-foreground))' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{label}</p>
                <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>{description}</p>
              </div>
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                border: `1.5px solid ${on ? '#2a52a0' : 'hsl(var(--border))'}`,
                background: on ? '#2a52a0' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {on && <Check style={{ width: '13px', height: '13px', color: '#fff' }} strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>

      {anySelected ? (
        <a
          href={href}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '15px', fontWeight: 600, color: '#fff',
            background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
            padding: '12px 22px', borderRadius: '12px',
            textDecoration: 'none', boxShadow: '0 2px 10px rgba(42,82,160,0.25)',
          }}
        >
          <Download style={{ width: '16px', height: '16px' }} /> Download CSV
        </a>
      ) : (
        <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))' }}>Select at least one category to enable download.</p>
      )}
    </div>
  )
}
