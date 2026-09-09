'use client'

import { useEffect, useState } from 'react'
import { X, Send, Mail, MessageSquare, AlertTriangle, FlaskConical, Undo2 } from 'lucide-react'
import { interpolate, hasBlockingUnresolved } from '@/lib/template-interpolate'
import { getContactSendContext, type SendContext } from '@/lib/actions/send-context'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { useUndoSend } from '@/lib/hooks/useUndoSend'
import type { Tables } from '@/types/database'

type Template = Tables<'templates'>
type ContactLite = { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; company: string | null }
type Channel = 'email' | 'sms'

// The template-first counterpart to QuickSendButton (which is
// contact-first: pick a template for a contact you're already on). This
// starts from a template and lets you pick who to send it to — same
// interpolation, same /api/send call, just the other way around.
//
// A template's stored `channel` is just its authoring default (whether it
// has a subject line, which filter tab it shows under) — the body text
// itself works as either an email or a text, so the send channel here is
// a toggle, not locked to that default.
//
// Subject/body start out as the interpolated template but are editable —
// an account owner can rewrite either in their own words before sending.
// BCC-self and "send a test to myself" are owner-only (see /api/send).
export function SendTemplateModal({ template, contacts, onClose }: {
  template: Template
  contacts: ContactLite[]
  onClose: () => void
}) {
  const { isAdmin } = useUserRole()
  const [contactId, setContactId] = useState('')
  const [channel,    setChannel]    = useState<Channel>(template.channel as Channel)
  const [ctx,        setCtx]        = useState<SendContext>({})
  const [loadingCtx, setLoadingCtx] = useState(false)
  const [subject,    setSubject]    = useState('')
  const [body,       setBody]       = useState('')
  const [touched,    setTouched]    = useState(false)
  const [bccSelf,    setBccSelf]    = useState(false)
  const [sending,    setSending]    = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [result,     setResult]     = useState<{ ok: boolean; msg: string } | null>(null)

  const contact = contacts.find(c => c.id === contactId) ?? null

  useEffect(() => {
    if (!contactId) { setCtx({}); return }
    setLoadingCtx(true)
    getContactSendContext(contactId).then(c => { setCtx(c); setLoadingCtx(false) })
  }, [contactId])

  function interpolateContext() {
    return {
      first_name:       contact?.first_name,
      last_name:        contact?.last_name,
      company:          contact?.company,
      phone:            contact?.phone,
      business_name:    ctx.businessName,
      appointment_date: ctx.appointmentDate,
      amount_due:       ctx.amountDue,
    }
  }

  // Re-derive the interpolated subject/body whenever the contact, channel,
  // or the {{vars}} they resolve to (ctx) change — but only while the
  // tenant hasn't started editing, so we never clobber their own words.
  useEffect(() => {
    if (touched) return
    if (!contact) { setSubject(''); setBody(''); return }
    setBody(interpolate(template.body, interpolateContext()))
    // A template authored for SMS has no subject at all — fall back to its
    // name so switching one to Email still has something in the subject
    // line, instead of silently sending "(no subject)".
    const rawSubject = template.subject || (channel === 'email' ? template.name : null)
    setSubject(channel === 'email' && rawSubject ? interpolate(rawSubject, interpolateContext()) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact, channel, ctx, touched])

  const hasUnresolved = hasBlockingUnresolved(body)
  const recipient = channel === 'sms' ? contact?.phone : contact?.email
  const canEmail = !!contact?.email
  const canSms = !!contact?.phone
  const canSend = !!contact && !!recipient && body.trim().length > 0

  async function doSend(opts: { testOnly?: boolean } = {}) {
    return fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        contactId: contact!.id,
        preview: body,
        subject: channel === 'email' ? subject : undefined,
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
    if (res.ok) setTimeout(onClose, 1200)
  }

  // No real "recall" exists once mail has left the server — this is the
  // practical equivalent, same idea as Gmail's Undo Send: hold the send
  // for a few seconds so a mis-send can be caught first.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Send &ldquo;{template.name}&rdquo;</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Channel toggle — the body works as either, this just picks how it goes out */}
          <div className="flex rounded-xl border border-[hsl(var(--border))] p-1" style={{ background: 'hsl(var(--muted))' }}>
            {([
              { key: 'email' as const, label: 'Email', icon: Mail,         disabled: !!contact && !canEmail },
              { key: 'sms'   as const, label: 'Text',  icon: MessageSquare, disabled: !!contact && !canSms },
            ]).map(opt => {
              const active = channel === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => { setChannel(opt.key); setTouched(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[14px] font-bold transition-colors"
                  style={{
                    background: active ? 'linear-gradient(135deg,#2a52a0,#4a9db5)' : 'transparent',
                    color: active ? '#fff' : opt.disabled ? 'hsl(var(--muted-foreground) / 0.5)' : 'hsl(var(--muted-foreground))',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Send to
            </label>
            <select value={contactId} onChange={e => { setContactId(e.target.value); setTouched(false) }}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="">— Choose a contact —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>
              ))}
            </select>
          </div>

          {contact && !recipient && (
            <p className="text-[15px] text-red-600">
              This contact has no {channel === 'sms' ? 'phone number' : 'email address'} on file.
            </p>
          )}

          {contact && recipient && (
            <>
              {hasUnresolved && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[15px]"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Some variables couldn&apos;t be filled (marked ⚠). Edit before sending.</span>
                </div>
              )}

              {loadingCtx && (
                <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading contact details…</p>
              )}

              {channel === 'email' && (
                <div className="space-y-1.5">
                  <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => { setTouched(true); setSubject(e.target.value) }}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                    style={{ color: 'hsl(var(--foreground))' }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Message (editable)
                </label>
                <textarea
                  value={body}
                  onChange={e => { setTouched(true); setBody(e.target.value) }}
                  rows={5}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-[15px] resize-none"
                  style={{ color: 'hsl(var(--foreground))' }}
                />
              </div>

              {isAdmin && channel === 'email' && (
                <label className="flex items-center gap-2 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <input type="checkbox" checked={bccSelf} onChange={e => setBccSelf(e.target.checked)} className="rounded" />
                  BCC me on this email
                </label>
              )}
            </>
          )}

          {result && (
            <p className="text-[15px] font-semibold" style={{ color: result.ok ? '#059669' : '#dc2626' }}>{result.msg}</p>
          )}

          {undoSend.pending ? (
            <button type="button" onClick={undoSend.cancel}
              className="w-full flex items-center justify-center gap-2 text-[15px] font-bold py-2.5 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Undo2 className="w-4 h-4" />
              Sending in {undoSend.secondsLeft}s — Undo
            </button>
          ) : (
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
                style={{ color: 'hsl(var(--muted-foreground))' }}>
                Cancel
              </button>
              {isAdmin && channel === 'email' && (
                <button type="button" onClick={handleSendTest} disabled={!canSend || sending || testSending || hasUnresolved}
                  title="Send a test copy to yourself only"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-bold"
                  style={{ color: 'hsl(var(--muted-foreground))', opacity: (!canSend || sending || testSending || hasUnresolved) ? 0.5 : 1 }}>
                  <FlaskConical className="w-4 h-4" />
                  {testSending ? 'Sending…' : 'Test'}
                </button>
              )}
              <button type="button" onClick={handleSend} disabled={!canSend || sending || testSending || hasUnresolved}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: (!canSend || sending || testSending || hasUnresolved) ? 0.5 : 1 }}>
                <Send className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
