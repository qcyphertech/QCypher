'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'

const TYPES = ['note', 'call', 'email', 'visit'] as const
type InteractionType = typeof TYPES[number]

export function AddInteractionForm({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<InteractionType>('note')
  const [body, setBody] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
      if (!tenantId) return
      const { error } = await supabase.from('interactions').insert({ tenant_id: tenantId, contact_id: contactId, type, body: body.trim() } as never)
      if (error) return
      logAudit({ action: 'note_created', resource_type: 'note', resource_id: contactId, details: { type } })
      setBody('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft p-4 space-y-3">
      <div className="flex gap-1.5">
        {TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`text-[15px] px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
              type === t
                ? 'bg-accent text-white'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={2}
        placeholder={`Log a ${type}…`}
        className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="bg-accent text-white text-[15px] font-medium px-4 py-1.5 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {isPending ? 'Saving…' : 'Log'}
        </button>
      </div>
    </form>
  )
}
