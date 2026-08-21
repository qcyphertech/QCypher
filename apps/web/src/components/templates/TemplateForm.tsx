'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'
import { MergeTagPicker } from './MergeTagPicker'
import type { Tables } from '@/types/database'

type Template = Tables<'templates'>

export function TemplateForm({ template }: { template?: Template }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)
  const supabase = createClient()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name:         template?.name         ?? '',
    channel:      template?.channel      ?? 'email',
    subject:      template?.subject      ?? '',
    body:         template?.body         ?? '',
    category:     (template as any)?.category     ?? 'General',
    is_marketing: (template as any)?.is_marketing ?? false,
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name:         form.name.trim(),
      channel:      form.channel as Template['channel'],
      subject:      form.channel === 'email' ? (form.subject.trim() || null) : null,
      body:         form.body.trim(),
      category:     form.category,
      is_marketing: form.is_marketing,
    }
    startTransition(async () => {
      if (template) {
        const { error } = await supabase.from('templates').update(payload).eq('id', template.id)
        if (error) { setError(error.message); return }
        logAudit({ action: 'template_updated', resource_type: 'template', resource_id: template.id, resource_name: payload.name })
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const tenantId = user?.app_metadata?.tenant_id
        if (!tenantId) { setError('Could not determine tenant — please refresh and try again'); return }
        const { error } = await supabase.from('templates').insert({ ...payload, tenant_id: tenantId })
        if (error) { setError(error.message); return }
        logAudit({ action: 'template_created', resource_type: 'template', resource_name: payload.name })
      }
      router.push('/templates')
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!template || !confirm('Delete this template?')) return
    // Soft delete
    await supabase
      .from('templates')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', template.id)
    logAudit({ action: 'template_deleted', resource_type: 'template', resource_id: template.id, resource_name: template.name })
    router.push('/templates')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[hsl(var(--card))] rounded-2xl shadow-soft border border-[hsl(var(--border))] p-6 space-y-4">
      <div className="space-y-1.5">
        <label className="text-[15px] font-medium">Name *</label>
        <input required value={form.name} onChange={set('name')} placeholder="Follow-up after visit" className={input} />
      </div>

      <div className="space-y-1.5">
        <label className="text-[15px] font-medium">Category</label>
        <select value={form.category} onChange={set('category')} className={input}>
          <option value="Lead & Inquiry">Lead &amp; Inquiry</option>
          <option value="Booking & Scheduling">Booking &amp; Scheduling</option>
          <option value="Service & Fulfillment">Service &amp; Fulfillment</option>
          <option value="Payment">Payment</option>
          <option value="Follow-Up & Retention">Follow-Up &amp; Retention</option>
          <option value="General">General</option>
        </select>
      </div>

      {form.channel === 'email' && (
        <div className="space-y-1.5">
          <label className="text-[15px] font-medium">Subject</label>
          <MergeTagPicker targetRef={subjectRef} />
          <input ref={subjectRef} value={form.subject} onChange={set('subject')} placeholder="Following up on your quote" className={input} />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[15px] font-medium">Body *</label>
        <MergeTagPicker targetRef={bodyRef} />
        <textarea ref={bodyRef} required value={form.body} onChange={set('body')} rows={6} className={`${input} resize-none`}
          placeholder="Hi {{first_name}}, thanks for…" />
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed">
          Click a tag above to insert it, or type <code>{'{{variable|"fallback text"}}'}</code> to set what shows when it's not available.
        </p>
      </div>

      {error && <p className="text-[15px] text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={isPending}
          className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : template ? 'Save changes' : 'Create template'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors">
          Cancel
        </button>
        {template && (
          <button type="button" onClick={handleDelete}
            className="ml-auto text-[15px] text-red-500 hover:text-red-600 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

const input = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'
