'use client'

import { useState } from 'react'
import { Bell, Star, AlertTriangle, Link2, Check } from 'lucide-react'
import { saveWorkflowSettings, type WorkflowSettings } from '@/lib/actions/workflow-settings'

function sectionCard(accent: string): React.CSSProperties {
  return {
    borderRadius: '20px',
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
  }
}

function accentRail(color: string): React.CSSProperties {
  return {
    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
  }
}

function Toggle({ enabled, onChange, disabled, color = '#2a52a0' }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean; color?: string }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      style={{
        flexShrink: 0,
        width: '42px', height: '24px', borderRadius: '100px',
        border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative',
        background: enabled ? color : 'hsl(var(--muted))',
        boxShadow: enabled ? `0 0 0 1px ${color}55, inset 0 1px 2px rgba(0,0,0,0.06)` : 'inset 0 1px 2px rgba(0,0,0,0.06)',
        transition: 'background 0.2s, box-shadow 0.2s',
        outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'transform 0.2s cubic-bezier(.4,0,.2,1)',
        transform: enabled ? 'translateX(18px)' : 'translateX(0)',
        display: 'block',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '52px', padding: '6px 8px', borderRadius: '8px',
  border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 700, textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
}

function Row({
  icon: Icon, iconColor, title, hint, control, enabled, isLast,
}: {
  icon: React.ElementType; iconColor: string; title: string; hint: React.ReactNode
  control: React.ReactNode; enabled: boolean; isLast?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px',
      borderBottom: isLast ? 'none' : '1px solid hsl(var(--border))',
      opacity: enabled ? 1 : 0.55,
      transition: 'opacity 0.15s',
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: enabled ? `${iconColor}16` : 'hsl(var(--muted))',
        border: `1px solid ${enabled ? `${iconColor}30` : 'transparent'}`,
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <Icon style={{ width: '17px', height: '17px', color: enabled ? iconColor : 'hsl(var(--muted-foreground))' }} strokeWidth={2.25} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}>{title}</p>
        <div style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
          {hint}
        </div>
      </div>
      {control}
    </div>
  )
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '2px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>{children}</p>
    </div>
  )
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

  const BLUE = '#2a52a0'
  const RED = '#ef4444'
  const AMBER = '#f59e0b'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Invoice escalation */}
      <div>
        <SectionLabel color={BLUE}>Invoice Escalation</SectionLabel>
        <div style={sectionCard(BLUE)}>
          <div style={accentRail(BLUE)} />
          <Row
            icon={Bell} iconColor={BLUE} title="Reminder" enabled={settings.invoice_reminder_enabled}
            hint={<>Nudge me after <input type="number" min={1} value={settings.invoice_reminder_days} disabled={!settings.invoice_reminder_enabled}
              onChange={e => set('invoice_reminder_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} /> days unpaid</>}
            control={<Toggle enabled={settings.invoice_reminder_enabled} onChange={v => set('invoice_reminder_enabled', v)} color={BLUE} />}
          />
          <Row
            icon={AlertTriangle} iconColor={RED} title="Escalation" enabled={settings.invoice_escalate_enabled} isLast
            hint={<>Escalate after <input type="number" min={1} value={settings.invoice_escalate_days} disabled={!settings.invoice_escalate_enabled}
              onChange={e => set('invoice_escalate_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} /> days unpaid</>}
            control={<Toggle enabled={settings.invoice_escalate_enabled} onChange={v => set('invoice_escalate_enabled', v)} color={RED} />}
          />
        </div>
      </div>

      {/* Review requests */}
      <div>
        <SectionLabel color={AMBER}>Review Requests</SectionLabel>
        <div style={sectionCard(AMBER)}>
          <div style={accentRail(AMBER)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px', borderBottom: '1px solid hsl(var(--border))' }}>
            <Link2 style={{ width: '15px', height: '15px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--muted-foreground))', marginBottom: '6px' }}>Your Google review link</p>
              <input
                type="url"
                placeholder="https://g.page/r/..."
                value={settings.google_review_url ?? ''}
                onChange={e => set('google_review_url', e.target.value || null)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 500,
                }}
              />
            </div>
          </div>
          <Row
            icon={Star} iconColor={AMBER} title="Initial ask" enabled={settings.review_request_enabled}
            hint={<>Ask <input type="number" min={0} value={settings.review_request_days} disabled={!settings.review_request_enabled}
              onChange={e => set('review_request_days', Math.max(0, Number(e.target.value) || 0))} style={inputStyle} /> days after job completes</>}
            control={<Toggle enabled={settings.review_request_enabled} onChange={v => set('review_request_enabled', v)} color={AMBER} />}
          />
          <Row
            icon={Star} iconColor={AMBER} title="Follow-up" enabled={settings.review_reminder_enabled} isLast
            hint={<>SMS only · follow up <input type="number" min={1} value={settings.review_reminder_days} disabled={!settings.review_reminder_enabled}
              onChange={e => set('review_reminder_days', Math.max(1, Number(e.target.value) || 1))} style={inputStyle} /> days after job completes</>}
            control={<Toggle enabled={settings.review_reminder_enabled} onChange={v => set('review_reminder_enabled', v)} color={AMBER} />}
          />
        </div>
      </div>

      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: RED, margin: 0 }}>
          <AlertTriangle style={{ width: '14px', height: '14px', flexShrink: 0 }} /> {error}
        </p>
      )}

      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          borderRadius: '12px', padding: '12px 16px',
          fontSize: '14px', fontWeight: 600,
          background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#059669', color: '#fff', fontSize: '12px', fontWeight: 700,
          }}>✓</span>
          Settings saved
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          alignSelf: 'flex-start',
          fontSize: '15px', fontWeight: 700, padding: '11px 22px', borderRadius: '13px',
          border: 'none', color: '#fff',
          background: saved ? 'linear-gradient(135deg,#10b981,#0ea56f)' : `linear-gradient(135deg,${BLUE},#4a9db5)`,
          boxShadow: `0 4px 16px ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(42,82,160,0.28)'}`,
          cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
          transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
        }}
        onMouseDown={e => { if (!saving) e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {saved && <Check style={{ width: '16px', height: '16px' }} strokeWidth={3} />}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
      </button>
    </div>
  )
}
