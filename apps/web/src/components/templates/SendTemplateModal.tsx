'use client'

import { useEffect, useState } from 'react'
import { X, Send, Mail, MessageSquare, AlertTriangle } from 'lucide-react'
import { interpolate, hasBlockingUnresolved } from '@/lib/template-interpolate'
import { getContactSendContext, type SendContext } from '@/lib/actions/send-context'
import type { Tables } from '@/types/database'

type Template = Tables<'templates'>
type ContactLite = { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null }

// The template-first counterpart to QuickSendButton (which is
// contact-first: pick a template for a contact you're already on). This
// starts from a template and lets you pick who to send it to — same
// interpolation, same /api/send call, just the other way around.
export function SendTemplateModal({ template, contacts, onClose }: {
  template: Template
  contacts: ContactLite[]
  onClose: () => void
}) {
  const [contactId, setContactId] = useState('')
  const [ctx,        setCtx]        = useState<SendContext>({})
  const [loadingCtx, setLoadingCtx] = useState(false)
  const [sending,    setSending]    = useState(false)
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
      company:          undefined,
      phone:            contact?.phone,
      business_name:    ctx.businessName,
      appointment_date: ctx.appointmentDate,
      amount_due:       ctx.amountDue,
    }
  }

  const preview = contact ? interpolate(template.body, interpolateContext()) : ''
  const subjectPreview = contact && template.subject ? interpolate(template.subject, interpolateContext()) : undefined
  const hasUnresolved = hasBlockingUnresolved(preview)
  const recipient = template.channel === 'sms' ? contact?.phone : contact?.email

  async function handleSend() {
    if (!contact || !recipient) return
    setSending(true)
    setResult(null)
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, contactId: contact.id, preview, subject: subjectPreview, channel: template.channel }),
    })
    const json = await res.json()
    setSending(false)
    setResult({ ok: res.ok, msg: res.ok ? 'Sent!' : (json.error ?? 'Send failed') })
    if (res.ok) setTimeout(onClose, 1200)
  }

  const Icon = template.channel === 'sms' ? MessageSquare : Mail

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
            <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Send &ldquo;{template.name}&rdquo;</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Send to
            </label>
            <select value={contactId} onChange={e => setContactId(e.target.value)}
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
              This contact has no {template.channel === 'sms' ? 'phone number' : 'email address'} on file.
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

              <div className="space-y-1.5">
                <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Preview
                </label>
                {subjectPreview && (
                  <p className="text-[15px] font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{subjectPreview}</p>
                )}
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-[15px] whitespace-pre-wrap"
                  style={{ color: 'hsl(var(--foreground))' }}>
                  {preview}
                </div>
              </div>
            </>
          )}

          {result && (
            <p className="text-[15px] font-semibold" style={{ color: result.ok ? '#059669' : '#dc2626' }}>{result.msg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSend} disabled={!contact || !recipient || sending || hasUnresolved}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: (!contact || !recipient || sending || hasUnresolved) ? 0.5 : 1 }}>
              <Send className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
