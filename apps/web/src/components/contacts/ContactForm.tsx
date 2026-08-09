'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'
import type { Tables } from '@/types/database'

type Contact = Tables<'contacts'>

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export function ContactForm({ contact }: { contact?: Contact }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [form, setForm] = useState({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    company: contact?.company ?? '',
    address: contact?.address ?? '',
    notes: contact?.notes ?? '',
    tags: contact?.tags?.join(', ') ?? '',
    source: contact?.source ?? '',
    status: contact?.status ?? 'lead',
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      source: form.source.trim() || null,
      status: form.status as Contact['status'],
    }

    startTransition(async () => {
      const contactName = `${payload.first_name} ${payload.last_name ?? ''}`.trim()
      if (contact) {
        const { error } = await supabase.from('contacts').update(payload).eq('id', contact.id)
        if (error) { setError(error.message); return }
        logAudit({ action: 'contact_updated', resource_type: 'contact', resource_id: contact.id, resource_name: contactName })
        router.push(`/contacts/${contact.id}`)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
        if (!tenantId) { setError('Session error — please refresh and try again.'); return }
        const { data, error } = await supabase.from('contacts').insert({ ...payload, tenant_id: tenantId }).select('id').single()
        if (error) { setError(error.message); return }
        logAudit({ action: 'contact_created', resource_type: 'contact', resource_id: data.id, resource_name: contactName })
        router.push(`/contacts/${data.id}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[hsl(var(--card))] rounded-2xl shadow-soft border border-[hsl(var(--border))] p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name *">
          <input required value={form.first_name} onChange={set('first_name')} className={input} />
        </Field>
        <Field label="Last name">
          <input value={form.last_name} onChange={set('last_name')} className={input} />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" value={form.email} onChange={set('email')} className={input} />
      </Field>
      <Field label="Phone">
        <input type="tel" value={form.phone} onChange={set('phone')} className={input} />
      </Field>
      <Field label="Company">
        <input value={form.company} onChange={set('company')} className={input} />
      </Field>
      <Field label="Address">
        <input value={form.address} onChange={set('address')} className={input} />
      </Field>
      <Field label="Tags (comma-separated)">
        <input value={form.tags} onChange={set('tags')} placeholder="plumbing, vip" className={input} />
      </Field>
      <Field label="Source">
        <input value={form.source} onChange={set('source')} placeholder="referral, website…" className={input} />
      </Field>
      <Field label="Status">
        <select value={form.status} onChange={set('status')} className={input}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Notes">
        <textarea value={form.notes} onChange={set('notes')} rows={3} className={`${input} resize-none`} />
      </Field>
      {error && <p className="text-[15px] text-red-500">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : contact ? 'Save changes' : 'Create contact'}
        </button>
        <button type="button" onClick={() => router.back()} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[15px] font-medium text-[hsl(var(--foreground))]">{label}</label>
      {children}
    </div>
  )
}

const input = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-shadow'
