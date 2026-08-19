'use client'

import { useState } from 'react'
import { Mail, MessageSquare } from 'lucide-react'
import { sendPortalMagicLink, sendPortalMagicLinkSms } from '@/lib/actions/portal'

export function SendPortalLinkButton({
  contactId,
  tenantId,
  tenantSlug,
  businessName,
  hasEmail,
  hasPhone,
  iconOnly = false,
}: {
  contactId: string
  tenantId: string
  tenantSlug: string
  businessName: string
  hasEmail: boolean
  hasPhone: boolean
  iconOnly?: boolean
}) {
  const [busy, setBusy] = useState<'email' | 'sms' | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (!hasEmail && !hasPhone) return null

  async function handleEmail() {
    setBusy('email')
    setResult(null)
    const res = await sendPortalMagicLink({ contactId, tenantId, tenantSlug, businessName })
    setResult(res.ok ? { ok: true, message: 'Portal link sent via email' } : { ok: false, message: res.error ?? 'Something went wrong' })
    setBusy(null)
    if (res.ok) setTimeout(() => setResult(null), 3000)
  }

  async function handleSms() {
    setBusy('sms')
    setResult(null)
    const res = await sendPortalMagicLinkSms({ contactId, tenantId, tenantSlug, businessName })
    setResult(res.ok ? { ok: true, message: 'Portal link sent via SMS' } : { ok: false, message: res.error ?? 'Something went wrong' })
    setBusy(null)
    if (res.ok) setTimeout(() => setResult(null), 3000)
  }

  if (iconOnly) {
    if (!hasEmail) return null
    return (
      <div className="flex items-center gap-1.5 flex-wrap relative">
        <button
          onClick={handleEmail}
          disabled={busy !== null}
          title="Send client portal link via email"
          className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[12.5px] font-semibold hover:bg-accent/10 hover:text-accent transition-colors disabled:opacity-50"
        >
          <Mail className="w-3.5 h-3.5" />
          {busy === 'email' ? 'Sending…' : 'Send portal link'}
        </button>
        {result && (
          <p className={`absolute top-full left-0 mt-1 text-[12.5px] font-medium whitespace-nowrap ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {result.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasEmail && (
        <button
          onClick={handleEmail}
          disabled={busy !== null}
          title="Send client portal link via email"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
        >
          <Mail className="w-3.5 h-3.5" />
          {busy === 'email' ? 'Sending…' : 'Send portal link'}
        </button>
      )}
      {hasPhone && (
        <button
          onClick={handleSms}
          disabled={busy !== null}
          title="Send client portal link via SMS"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {busy === 'sms' ? 'Sending…' : hasEmail ? 'Via SMS' : 'Send portal link via SMS'}
        </button>
      )}
      {result && (
        <p className={`text-[13px] font-medium w-full ${result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
