'use client'

import { useState, useTransition } from 'react'
import { Mail } from 'lucide-react'
import { updateTenantSettings } from '@/lib/actions/settings'

// Owner-only: the address used to BCC the sender on outgoing template
// emails, and as the destination for "send a test to myself" (Quick Send
// / Templates → Send). Falls back to the owner's own login email when
// left blank.
export function NotifyEmailPanel({ initial, loginEmail }: { initial: string; loginEmail: string }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = value.trim()
    setStatus('saving')
    startTransition(async () => {
      try {
        await updateTenantSettings({ notify_email: trimmed })
        setSaved(trimmed)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1500)
      } catch {
        setStatus('error')
      }
    })
  }

  return (
    <div style={{ borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0ea5e91a',
        }}>
          <Mail style={{ width: '16px', height: '16px', color: '#0ea5e9' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>Notification email</p>
          <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
            Used to BCC yourself on emails you send, and as the inbox for &ldquo;send a test to myself&rdquo;. Leave blank to use {loginEmail || 'your login email'}.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={loginEmail || 'you@yourbusiness.com'}
              style={{
                flex: 1, minWidth: 0, fontSize: '15px', padding: '8px 12px',
                borderRadius: '10px', border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              }}
            />
            <button
              onClick={handleSave}
              disabled={pending || value.trim() === saved}
              style={{
                fontSize: '15px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px',
                border: 'none', color: '#fff', background: '#2a52a0',
                opacity: (pending || value.trim() === saved) ? 0.5 : 1,
                cursor: (pending || value.trim() === saved) ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
          {status === 'saved' && <p style={{ fontSize: '13px', color: '#059669', marginTop: '6px' }}>Saved.</p>}
          {status === 'error' && <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '6px' }}>Couldn&apos;t save — try again.</p>}
        </div>
      </div>
    </div>
  )
}
