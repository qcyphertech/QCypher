'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Stage = {
  id: string; name: string; position: number; color: string
}

type Deal = {
  id: string; stage_id: string; contact_id: string | null
  title: string; value: number | null; notes: string | null; position: number
  contact: { id: string; first_name: string; last_name: string | null; company: string | null } | null
}

type Contact = { id: string; first_name: string; last_name: string | null; company: string | null }

type ModalState =
  | { mode: 'new'; stage_id: string }
  | { mode: 'edit'; deal: Deal }
  | null

function fmt(v: number | null) {
  if (!v) return null
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Deal card ────────────────────────────────────────────────────────────────
function DealCard({ deal, stage, onEdit, onMove, stages }: {
  deal: Deal
  stage: Stage
  onEdit: () => void
  onMove: (stageId: string) => void
  stages: Stage[]
}) {
  const [showMove, setShowMove] = useState(false)
  const others = stages.filter(s => s.id !== deal.stage_id)
  const bg  = hexToRgba(stage.color, 0.07)
  const border = hexToRgba(stage.color, 0.25)

  return (
    <div
      className="rounded-xl border overflow-hidden group transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: 'hsl(var(--card))', borderColor: border }}
    >
      <div className="p-3.5 cursor-pointer" onClick={onEdit}>
        {/* Value badge */}
        {deal.value && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[15px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5"
              style={{ background: bg, color: stage.color }}>
              <DollarSign size={9} />{fmt(deal.value)}
            </span>
          </div>
        )}

        <p className="text-[15px] font-bold leading-snug" style={{ color: 'hsl(var(--foreground))' }}>
          {deal.title}
        </p>

        {deal.contact && (
          <p className="text-[15px] mt-1 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {deal.contact.first_name} {deal.contact.last_name ?? ''}
            {deal.contact.company ? ` · ${deal.contact.company}` : ''}
          </p>
        )}

        {deal.notes && (
          <p className="text-[15px] mt-1.5 line-clamp-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {deal.notes}
          </p>
        )}
      </div>

      {/* Move strip */}
      {others.length > 0 && (
        <div className="border-t" style={{ borderColor: border, background: bg }}>
          {!showMove ? (
            <button
              onClick={() => setShowMove(true)}
              className="w-full text-[15px] font-bold py-1.5 transition-opacity hover:opacity-80"
              style={{ color: stage.color }}
            >
              Move →
            </button>
          ) : (
            <div className="flex flex-wrap gap-px p-1">
              {others.map(s => (
                <button key={s.id}
                  onClick={() => { onMove(s.id); setShowMove(false) }}
                  className="flex-1 text-[15px] font-bold py-1 px-2 rounded-lg transition-opacity hover:opacity-80 whitespace-nowrap"
                  style={{ color: s.color, background: hexToRgba(s.color, 0.1) }}>
                  {s.name}
                </button>
              ))}
              <button onClick={() => setShowMove(false)}
                className="p-1 rounded-lg hover:bg-black/10">
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Deal modal ───────────────────────────────────────────────────────────────
function DealModal({ state, stages, contacts, onClose }: {
  state: ModalState
  stages: Stage[]
  contacts: Contact[]
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deal = state?.mode === 'edit' ? state.deal : null

  const [form, setForm] = useState({
    title:      deal?.title ?? '',
    stage_id:   deal?.stage_id ?? (state?.mode === 'new' ? state.stage_id : stages[0]?.id ?? ''),
    contact_id: deal?.contact_id ?? '',
    value:      deal?.value?.toString() ?? '',
    notes:      deal?.notes ?? '',
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const payload = {
      title:      form.title.trim(),
      stage_id:   form.stage_id,
      contact_id: form.contact_id || null,
      value:      form.value ? Number(form.value) : null,
      notes:      form.notes.trim() || null,
    }
    if (deal) {
      const { error } = await supabase.from('pipeline_deals').update(payload).eq('id', deal.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
      if (!tenantId) { setError('Session error — please refresh and try again.'); setSaving(false); return }
      const { error } = await supabase.from('pipeline_deals').insert({ ...payload, tenant_id: tenantId } as never)
      if (error) { setError(error.message); setSaving(false); return }
    }
    router.refresh(); onClose()
  }

  async function handleDelete() {
    if (!deal) return
    setSaving(true)
    await supabase.from('pipeline_deals').delete().eq('id', deal.id)
    router.refresh(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '92svh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <h2 className="text-[15px] font-bold">{deal ? 'Edit deal' : 'New deal'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[15px] font-semibold">Deal title *</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Website redesign"
              className={input} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-semibold">Stage</label>
            <select value={form.stage_id} onChange={set('stage_id')} className={input}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-semibold">Contact</label>
            <select value={form.contact_id} onChange={set('contact_id')} className={input}>
              <option value="">— No contact —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name ?? ''}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-semibold">Deal value ($)</label>
            <input type="number" min="0" step="0.01" value={form.value} onChange={set('value')}
              placeholder="0.00" className={input} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-semibold">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3}
              className={`${input} resize-none`} placeholder="Any context about this deal…" />
          </div>

          {error && <p className="text-[15px] text-red-500">{error}</p>}

          <div className="flex items-center gap-3 pt-1 pb-2">
            <button type="submit" disabled={saving}
              className="flex-1 sm:flex-none bg-accent text-white text-[15px] font-semibold px-5 py-2.5 rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : deal ? 'Save changes' : 'Create deal'}
            </button>
            {deal && (
              <button type="button" onClick={handleDelete} disabled={saving}
                className="ml-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[15px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Board ────────────────────────────────────────────────────────────────────
export function PipelineBoard({ initialStages, initialDeals, contacts }: {
  initialStages: Stage[]
  initialDeals: Deal[]
  contacts: Contact[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [modal, setModal] = useState<ModalState>(null)

  async function moveDeal(dealId: string, stageId: string) {
    await supabase.from('pipeline_deals').update({ stage_id: stageId }).eq('id', dealId)
    router.refresh()
  }

  if (initialStages.length === 0) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-16 text-center">
        <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>No pipeline stages</p>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Run migration 00013 in Supabase to set up the pipeline.
        </p>
      </div>
    )
  }

  const totalValue = initialDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)

  return (
    <>
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap mb-1">
        <span className="text-[15px] font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {initialDeals.length} deal{initialDeals.length !== 1 ? 's' : ''}
        </span>
        {totalValue > 0 && (
          <span className="text-[15px] font-black" style={{ color: 'hsl(var(--foreground))' }}>
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total pipeline
          </span>
        )}
      </div>

      {/* Stages — vertical scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {initialStages.map(stage => {
          const deals = initialDeals.filter(d => d.stage_id === stage.id)
          const colValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)
          const border = hexToRgba(stage.color, 0.25)

          return (
            <div key={stage.id} style={{ border: '1px solid hsl(var(--border))', borderRadius: '16px', overflow: 'hidden', background: 'hsl(var(--card))' }}>
              {/* Stage header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: deals.length > 0 ? '1px solid hsl(var(--border))' : 'none', background: hexToRgba(stage.color, 0.06) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color, flexShrink: 0, boxShadow: `0 0 6px ${stage.color}88` }} />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'hsl(var(--foreground))' }}>{stage.name}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: hexToRgba(stage.color, 0.12), color: stage.color, border: `1px solid ${border}` }}>
                    {deals.length}
                  </span>
                  {colValue > 0 && (
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                      · ${colValue.toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setModal({ mode: 'new', stage_id: stage.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, color: stage.color, background: hexToRgba(stage.color, 0.1), border: `1px solid ${border}`, cursor: 'pointer', transition: 'opacity .15s' }}
                >
                  <Plus size={13} /> Add deal
                </button>
              </div>

              {/* Deal rows */}
              {deals.length > 0 && (
                <div>
                  {deals.map((deal, i) => (
                    <div
                      key={deal.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < deals.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                      className="hover:bg-[hsl(var(--muted))]"
                      onClick={() => setModal({ mode: 'edit', deal })}
                    >
                      {/* Color dot */}
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color, flexShrink: 0 }} />

                      {/* Title + contact */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {deal.title}
                        </p>
                        {deal.contact && (
                          <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>
                            {deal.contact.first_name} {deal.contact.last_name ?? ''}{deal.contact.company ? ` · ${deal.contact.company}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Value + move */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {deal.value && (
                          <span style={{ fontSize: '15px', fontWeight: 800, color: stage.color }}>
                            {fmt(deal.value)}
                          </span>
                        )}
                        {/* Move to stage buttons */}
                        {initialStages.filter(s => s.id !== stage.id).map(s => (
                          <button
                            key={s.id}
                            onClick={e => { e.stopPropagation(); moveDeal(deal.id, s.id) }}
                            style={{ fontSize: '15px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', color: s.color, background: hexToRgba(s.color, 0.1), border: `1px solid ${hexToRgba(s.color, 0.25)}`, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            → {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {deals.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>No deals in this stage</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <DealModal
          state={modal}
          stages={initialStages}
          contacts={contacts}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

const input = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'
