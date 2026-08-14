'use client'

import { useState } from 'react'
import { Bell, Star } from 'lucide-react'
import { saveWorkflowSettings, type WorkflowSettings } from '@/lib/actions/workflow-settings'

const card: React.CSSProperties = {
  borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden',
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      style={{
        flexShrink: 0,
        width: '44px', height: '24px', borderRadius: '100px',
        border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative',
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
  )
}

const inputStyle: React.CSSProperties = {
  width: '64px', padding: '8px 10px', borderRadius: '10px',
  border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))', fontSize: '15px', fontWeight: 600, textAlign: 'center',
}

export function AutomationSettingsPanel({ initial }: { initial: WorkflowSettings }) {
  const [settings, setSettings] = useState<WorkflowSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof WorkflowSettings>(key: K, value: WorkflowSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await saveWorkflowSettings(settings)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setError(result.error)
    }
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* Invoice escalation */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '12px', paddingLeft: '2px' }}>
          Invoice Escalation
        </p>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: settings.invoice_reminder_enabled ? 'rgba(42,82,160,0.1)' : 'hsl(var(--muted))' }}>
              <Bell style={{ width: '16px', height: '16px', color: settings.invoice_reminder_enabled ? '#2a52a0' : 'hsl(var(--muted-foreground))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Reminder</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Nudge me after
                <input type="number" min={1} value={settings.invoice_reminder_days} disabled={!settings.invoice_reminder_enabled}
                  onChange={e => set('invoice_reminder_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
                days unpaid
              </p>
            </div>
            <Toggle enabled={settings.invoice_reminder_enabled} onChange={v => set('invoice_reminder_enabled', v)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: settings.invoice_escalate_enabled ? 'rgba(239,68,68,0.1)' : 'hsl(var(--muted))' }}>
              <Bell style={{ width: '16px', height: '16px', color: settings.invoice_escalate_enabled ? '#ef4444' : 'hsl(var(--muted-foreground))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Escalation</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Escalate after
                <input type="number" min={1} value={settings.invoice_escalate_days} disabled={!settings.invoice_escalate_enabled}
                  onChange={e => set('invoice_escalate_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
                days unpaid
              </p>
            </div>
            <Toggle enabled={settings.invoice_escalate_enabled} onChange={v => set('invoice_escalate_enabled', v)} />
          </div>
        </div>
      </div>

      {/* Review requests */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '12px', paddingLeft: '2px' }}>
          Review Requests
        </p>
        <div style={card}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '6px' }}>Your Google review link</p>
            <input
              type="url"
              placeholder="https://g.page/r/..."
              value={settings.google_review_url ?? ''}
              onChange={e => set('google_review_url', e.target.value || null)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontSize: '15px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: settings.review_request_enabled ? 'rgba(245,158,11,0.1)' : 'hsl(var(--muted))' }}>
              <Star style={{ width: '16px', height: '16px', color: settings.review_request_enabled ? '#f59e0b' : 'hsl(var(--muted-foreground))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Initial ask</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Ask
                <input type="number" min={0} value={settings.review_request_days} disabled={!settings.review_request_enabled}
                  onChange={e => set('review_request_days', Math.max(0, Number(e.target.value) || 0))} style={inputStyle} />
                days after job completes
              </p>
            </div>
            <Toggle enabled={settings.review_request_enabled} onChange={v => set('review_request_enabled', v)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: settings.review_reminder_enabled ? 'rgba(245,158,11,0.1)' : 'hsl(var(--muted))' }}>
              <Star style={{ width: '16px', height: '16px', color: settings.review_reminder_enabled ? '#f59e0b' : 'hsl(var(--muted-foreground))' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Follow-up (SMS only)</p>
              <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Follow up
                <input type="number" min={1} value={settings.review_reminder_days} disabled={!settings.review_reminder_enabled}
                  onChange={e => set('review_reminder_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} />
                days after job completes
              </p>
            </div>
            <Toggle enabled={settings.review_reminder_enabled} onChange={v => set('review_reminder_enabled', v)} />
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          fontSize: '15px', fontWeight: 700, padding: '10px 20px', borderRadius: '12px',
          border: 'none', background: '#2a52a0', color: '#fff',
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
    </div>
  )
}
