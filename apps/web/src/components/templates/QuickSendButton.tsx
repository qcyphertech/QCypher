'use client'

import { useState, useEffect } from 'react'
import { Mail, MessageSquare, X, Send, ChevronDown, AlertTriangle, FlaskConical, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { interpolate, hasBlockingUnresolved } from '@/lib/template-interpolate'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { useUndoSend } from '@/lib/hooks/useUndoSend'
import type { Tables } from '@/types/database'

type Contact  = Tables<'contacts'>
type Template = Tables<'templates'>

export function QuickSendButton({
  contact,
  businessName = '',
  amountDue,
  appointmentDate,
  channel = 'email',
  iconOnly = false,
}: {
  contact:          Contact
  businessName?:    string
  amountDue?:       string
  appointmentDate?: string
  channel?:         'email' | 'sms'
  iconOnly?:        boolean
}) {
  const { isAdmin } = useUserRole()
  const [open,      setOpen]      = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected,  setSelected]  = useState<Template | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [customSubject, setCustomSubject] = useState('')
  const [preview,   setPreview]   = useState('')
  const [bccSelf,   setBccSelf]   = useState(false)
  const [sending,   setSending]   = useState(false)
  const [testSending, setTestSending] = useState(false)
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

  function interpolateContext() {
    return {
      first_name:       contact.first_name,
      last_name:        contact.last_name,
      company:          contact.company,
      phone:            contact.phone,
      business_name:    businessName || undefined,
      appointment_date: appointmentDate,
      amount_due:       amountDue,
    }
  }

  function buildPreview(t: Template): string {
    return interpolate(t.body, interpolateContext())
  }

  function selectTemplate(t: Template) {
    setCustomMode(false)
    setSelected(t)
    setPreview(buildPreview(t))
    setCustomSubject(t.subject ? interpolate(t.subject, interpolateContext()) : '')
  }

  function startCustomMessage() {
    setSelected(null)
    setCustomMode(true)
    setCustomSubject('')
    setPreview('')
  }

  const hasUnresolved = hasBlockingUnresolved(preview)
  const canSend = (!!selected || (customMode && channel === 'email' && customSubject.trim())) && preview.trim().length > 0

  async function doSend(opts: { testOnly?: boolean } = {}) {
    const subject = channel === 'email' ? customSubject.trim() || undefined : undefined
    return fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selected?.id,
        contactId: contact.id,
        preview,
        subject,
        channel,
        bccSelf: channel === 'email' ? bccSelf : undefined,
        testOnly: opts.testOnly,
      }),
    })
  }

  async function actuallySend() {
    setSending(true)
    setResult(null)
    const res = await doSend()
    const json = await res.json()
    setSending(false)
    setResult({ ok: res.ok, msg: res.ok ? 'Sent!' : (json.error ?? 'Send failed') })
    if (res.ok) setTimeout(() => { setOpen(false); setSelected(null); setCustomMode(false); setResult(null) }, 1200)
  }

  // There's no real "recall" for mail that's already left the server —
  // this is the practical stand-in, same idea as Gmail's own Undo Send:
  // hold the actual send for a few seconds so a mis-send can be caught
  // before anything goes out.
  const undoSend = useUndoSend(actuallySend)

  function handleSend() {
    if (!canSend) return
    undoSend.start()
  }

  async function handleSendTest() {
    if (!canSend) return
    setTestSending(true)
    setResult(null)
    const res = await doSend({ testOnly: true })
    const json = await res.json()
    setTestSending(false)
    setResult({ ok: res.ok, msg: res.ok ? 'Test sent to your own inbox.' : (json.error ?? 'Test send failed') })
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
              {templates.length === 0 && !isAdmin ? (
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
                        value={customMode ? '__custom__' : selected?.id ?? ''}
                        onChange={e => {
                          if (e.target.value === '__custom__') { startCustomMessage(); return }
                          const t = templates.find(t => t.id === e.target.value)
                          if (t) selectTemplate(t)
                        }}
                      >
                        <option value="">Select a template…</option>
                        {isAdmin && <option value="__custom__">✎ Write my own…</option>}
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

                  {/* Subject — editable for a template's own subject, or required when writing a custom email */}
                  {(selected || customMode) && channel === 'email' && (
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-medium">Subject</label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        placeholder={customMode ? 'Subject line…' : undefined}
                        className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      />
                    </div>
                  )}

                  {/* Preview */}
                  {(selected || customMode) && (
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-medium">{customMode ? 'Message' : 'Preview (editable)'}</label>
                      <textarea
                        value={preview}
                        onChange={e => setPreview(e.target.value)}
                        rows={5}
                        placeholder={customMode ? 'Write your message…' : undefined}
                        className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                      />
                    </div>
                  )}

                  {/* Admin-only send options */}
                  {isAdmin && (selected || customMode) && channel === 'email' && (
                    <label className="flex items-center gap-2 text-[15px] text-[hsl(var(--muted-foreground))]">
                      <input type="checkbox" checked={bccSelf} onChange={e => setBccSelf(e.target.checked)} className="rounded" />
                      BCC me on this email
                    </label>
                  )}

                  {result && (
                    <p className={`text-[15px] ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>{result.msg}</p>
                  )}

                  {undoSend.pending ? (
                    <button
                      onClick={undoSend.cancel}
                      className="w-full flex items-center justify-center gap-2 text-[15px] font-medium py-2 rounded-xl transition-colors"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                      <Undo2 className="w-4 h-4" />
                      Sending in {undoSend.secondsLeft}s — Undo
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSend}
                        disabled={!canSend || sending || testSending || hasUnresolved}
                        className="flex-1 flex items-center justify-center gap-2 bg-accent text-white text-[15px] font-medium py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                        {sending ? 'Sending…' : `Send ${channel}`}
                      </button>
                      {isAdmin && channel === 'email' && (
                        <button
                          onClick={handleSendTest}
                          disabled={!canSend || sending || testSending || hasUnresolved}
                          title="Send a test copy to yourself only"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-40"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                          {testSending ? 'Sending…' : 'Test'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
