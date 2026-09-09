'use client'

import { useState, useTransition } from 'react'
import { Mail, Reply, FlaskConical } from 'lucide-react'
import { updateTenantSettings } from '@/lib/actions/settings'
import type { TenantSettings } from '@/lib/types/settings'

type MailField = 'reply_to_email' | 'bcc_email' | 'test_email'

const FIELDS: Array<{
  key: MailField
  icon: React.ElementType
  color: string
  label: string
  hint: (loginEmail: string) => string
  placeholder: string
}> = [
  {
    key: 'reply_to_email', icon: Reply, color: '#a855f7',
    label: 'Reply-to email',
    hint: () => "Emails still send from QCypher's verified address for reliable delivery, but a customer's \"Reply\" goes here instead.",
    placeholder: 'you@yourbusiness.com',
  },
  {
    key: 'bcc_email', icon: Mail, color: '#0ea5e9',
    label: 'BCC email',
    hint: loginEmail => `Used when "BCC me on this email" is checked. Leave blank to use ${loginEmail || 'your login email'}.`,
    placeholder: 'you@yourbusiness.com',
  },
  {
    key: 'test_email', icon: FlaskConical, color: '#f59e0b',
    label: 'Test-send email',
    hint: () => 'Where "Send a test to myself" delivers. Leave blank to use the BCC email above.',
    placeholder: 'you@yourbusiness.com',
  },
]

function FieldRow({ field, initial, loginEmail }: {
  field: typeof FIELDS[number]
  initial: string
  loginEmail: string
}) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = value.trim()
    setStatus('saving')
    startTransition(async () => {
      try {
        await updateTenantSettings({ [field.key]: trimmed } as Partial<TenantSettings>)
        setSaved(trimmed)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1500)
      } catch {
        setStatus('error')
      }
    })
  }

  const Icon = field.icon
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${field.color}1a`,
      }}>
        <Icon style={{ width: '16px', height: '16px', color: field.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{field.label}</p>
        <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
          {field.hint(loginEmail)}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={field.placeholder}
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
  )
}

// Owner-only outgoing-mail settings: where a customer's reply lands
// (reply-to), where a BCC copy goes, and where a test send goes — see
// TenantSettings for why "From" itself can't be freely customized.
export function NotifyEmailPanel({ initial, loginEmail }: {
  initial: Pick<TenantSettings, 'reply_to_email' | 'bcc_email' | 'test_email'>
  loginEmail: string
}) {
  return (
    <div style={{
      borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
      padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      {FIELDS.map(field => (
        <FieldRow key={field.key} field={field} initial={initial[field.key]} loginEmail={loginEmail} />
      ))}
    </div>
  )
}
