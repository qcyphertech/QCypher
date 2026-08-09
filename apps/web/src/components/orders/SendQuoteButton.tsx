'use client'

import { useState, useTransition } from 'react'
import { Send, Copy, CheckCircle2, X } from 'lucide-react'
import { generateQuoteToken, sendQuoteEmail } from '@/lib/actions/quotes'
// generateQuoteToken is used for the no-email path; sendQuoteEmail returns the url for the email path

type Props = {
  orderId: string
  total: number
  businessName: string
  contactEmail: string | null
  contactName: string | null
  alreadySigned: boolean
  signedBy: string | null
  signedAt: string | null
}

export function SendQuoteButton({
  orderId, total, businessName, contactEmail, contactName,
  alreadySigned, signedBy, signedAt,
}: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(contactEmail ?? '')
  const [name, setName] = useState(contactName ?? '')
  const [pending, startTransition] = useTransition()
  const [quoteUrl, setQuoteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (alreadySigned) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[15px] font-semibold"
        style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
        <CheckCircle2 className="w-4 h-4" />
        Signed by {signedBy}
        {signedAt && (
          <span className="font-normal opacity-70">
            · {new Date(signedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    )
  }

  function handleOpen() {
    setOpen(true)
    setQuoteUrl(null)
    setSent(false)
    setError(null)
  }

  function copyLink() {
    if (!quoteUrl) return
    navigator.clipboard.writeText(quoteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (email.trim()) {
          const result = await sendQuoteEmail({
            orderId,
            recipientEmail: email.trim(),
            recipientName: name.trim() || 'there',
            businessName,
            total,
          })
          if (!result.url) {
            setError(result.emailError ?? 'Failed to generate link')
          } else {
            setQuoteUrl(result.url)
            setSent(result.emailSent)
            if (result.emailError) setError(`Link generated, but email failed: ${result.emailError}`)
          }
        } else {
          // No email — just generate link
          const { url } = await generateQuoteToken(orderId)
          setQuoteUrl(url)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate quote link')
      }
    })
  }

  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <Send className="w-3.5 h-3.5" /> Send quote
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-base font-bold">Send quote for approval</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {sent && quoteUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <p className="text-[15px] font-medium">Quote emailed to {email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Quote link (share manually if needed)</p>
                    <div className="flex gap-2">
                      <input readOnly value={quoteUrl} className={inputCls + ' text-[13px] flex-1'} />
                      <button
                        onClick={copyLink}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors flex-shrink-0"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors">
                    Done
                  </button>
                </div>
              ) : quoteUrl ? (
                // Link-only result — either no email was provided, or email
                // delivery failed (in which case `error` explains why).
                <div className="space-y-3">
                  {error && (
                    <p className="text-[13px] text-red-500 flex items-start gap-1.5">
                      <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                    </p>
                  )}
                  <p className="text-[15px] text-[hsl(var(--muted-foreground))]">Copy this link and send it to your customer:</p>
                  <div className="flex gap-2">
                    <input readOnly value={quoteUrl} className={inputCls + ' text-[13px] flex-1'} />
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors flex-shrink-0"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Link expires in 30 days.</p>
                  <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[15px] font-medium">Customer email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className={inputCls}
                    />
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))]">Leave blank to just generate a link you can share manually.</p>
                  </div>
                  {email && (
                    <div className="space-y-1.5">
                      <label className="text-[15px] font-medium">Customer name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Jane Smith"
                        className={inputCls}
                      />
                    </div>
                  )}
                  {error && <p className="text-[13px] text-red-500">{error}</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setOpen(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold">
                      Cancel
                    </button>
                    <button type="submit" disabled={pending}
                      className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white transition-opacity"
                      style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
                      {pending ? 'Generating…' : email ? 'Send email + copy link' : 'Generate link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
