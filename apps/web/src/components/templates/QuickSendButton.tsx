'use client'

import { useState, useEffect } from 'react'
import { Mail, MessageSquare, X, Send, ChevronDown, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/template-interpolate'
import type { Tables } from '@/types/database'

type Contact  = Tables<'contacts'>
type Template = Tables<'templates'>

export function QuickSendButton({
  contact,
  businessName = '',
  channel = 'email',
  iconOnly = false,
}: {
  contact:       Contact
  businessName?: string
  channel?:      'email' | 'sms'
  iconOnly?:     boolean
}) {
  const [open,      setOpen]      = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected,  setSelected]  = useState<Template | null>(null)
  const [preview,   setPreview]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<{ ok: boolean; msg: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    supabase
      .from('templates')
      .select('*')
      .eq('channel', channel)
      .order('name')
      .then(({ data }) => setTemplates(data ?? []))
  }, [open, channel])

  function buildPreview(t: Template): string {
    return interpolate(t.body, {
      first_name:       contact.first_name,
      last_name:        contact.last_name,
      company:          contact.company,
      phone:            contact.phone,
      business_name:    businessName || undefined,
      appointment_date: undefined,
      amount_due:       undefined,
    })
  }

  function selectTemplate(t: Template) {
    setSelected(t)
    setPreview(buildPreview(t))
  }

  const hasUnresolved = preview.includes('⚠{{')

  async function handleSend() {
    if (!selected) return
    setSending(true)
    setResult(null)

    const res  = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selected.id, contactId: contact.id, preview, channel }),
    })
    const json = await res.json()
    setSending(false)
    setResult({ ok: res.ok, msg: res.ok ? 'Sent!' : (json.error ?? 'Send failed') })
    if (res.ok) setTimeout(() => { setOpen(false); setSelected(null); setResult(null) }, 1200)
  }

  const Icon      = channel === 'email' ? Mail : MessageSquare
  const recipient = channel === 'email' ? contact.email : contact.phone
  if (!recipient) return null

  return (
    <>
      {iconOnly ? (
        <button
          onClick={() => setOpen(true)}
          title={`Quick ${channel}`}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-accent/10 hover:text-accent transition-colors"
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-[15px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Icon className="w-3.5 h-3.5" />
          Quick {channel}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-[15px] font-semibold capitalize">
                Quick {channel} → {recipient}
              </h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {templates.length === 0 ? (
                <p className="text-[15px] text-[hsl(var(--muted-foreground))]">
                  No {channel} templates yet. Create one first.
                </p>
              ) : (
                <>
                  {/* Template picker */}
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-medium">Template</label>
                    <div className="relative">
                      <select
                        className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] appearance-none pr-8"
                        value={selected?.id ?? ''}
                        onChange={e => {
                          const t = templates.find(t => t.id === e.target.value)
                          if (t) selectTemplate(t)
                        }}
                      >
                        <option value="">Select a template…</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}{(t as any).is_marketing ? ' ★' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground))]" />
                    </div>
                  </div>

                  {/* Unresolved variable warning */}
                  {selected && hasUnresolved && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[15px]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Some variables couldn't be filled (marked ⚠). Edit before sending.</span>
                    </div>
                  )}

                  {/* Preview */}
                  {selected && (
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-medium">Preview (editable)</label>
                      <textarea
                        value={preview}
                        onChange={e => setPreview(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                      />
                    </div>
                  )}

                  {result && (
                    <p className={`text-[15px] ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>{result.msg}</p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={!selected || sending || hasUnresolved}
                    className="w-full flex items-center justify-center gap-2 bg-accent text-white text-[15px] font-medium py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending…' : `Send ${channel}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
