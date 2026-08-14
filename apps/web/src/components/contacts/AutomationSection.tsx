'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { getCustomerAutomationOverride, saveCustomerAutomationOverride } from '@/lib/actions/workflow-settings'

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      style={{
        flexShrink: 0,
        width: '40px', height: '22px', borderRadius: '100px',
        border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative',
        background: enabled ? '#2a52a0' : 'hsl(var(--muted))',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '2px', left: '2px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s',
        transform: enabled ? 'translateX(18px)' : 'translateX(0)',
      }} />
    </button>
  )
}

export function AutomationSection({ contactId }: { contactId: string }) {
  const [override, setOverride] = useState<{ send_review_requests: boolean; send_invoice_reminders: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCustomerAutomationOverride(contactId).then(setOverride).catch(() => setOverride({ send_review_requests: true, send_invoice_reminders: true }))
  }, [contactId])

  async function update(key: 'send_review_requests' | 'send_invoice_reminders', value: boolean) {
    if (!override) return
    const next = { ...override, [key]: value }
    setOverride(next)
    setSaving(true)
    await saveCustomerAutomationOverride(contactId, next)
    setSaving(false)
  }

  if (!override) return null

  return (
    <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
        <Zap style={{ width: '14px', height: '14px', color: '#eab308' }} />
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>Automation</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
        <p style={{ fontSize: '14px', color: 'hsl(var(--foreground))' }}>Invoice reminders</p>
        <Toggle enabled={override.send_invoice_reminders} onChange={v => update('send_invoice_reminders', v)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <p style={{ fontSize: '14px', color: 'hsl(var(--foreground))' }}>Review requests</p>
        <Toggle enabled={override.send_review_requests} onChange={v => update('send_review_requests', v)} />
      </div>
    </div>
  )
}
