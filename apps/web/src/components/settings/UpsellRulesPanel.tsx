'use client'

import { useState, useTransition } from 'react'
import { createUpsellRule, updateUpsellRule, toggleUpsellRule, type UpsellRule } from '@/lib/actions/upsells'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }
const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent'
const labelCls = 'text-[12px] font-bold uppercase tracking-wider'

type CatalogItem = { id: string; name: string; base_price: number }

const EMPTY_FORM = {
  rule_name: '', description: '', trigger_catalog_item_id: '', trigger_keywords: '',
  suggested_catalog_item_id: '', bundle_discount_percent: 5, bundle_description: '',
  bundle_emoji_icon: '', show_every_x_bookings: 1, is_active: true,
}

function RuleForm({ initial, catalogItems, onSaved, onCancel }: {
  initial?: UpsellRule
  catalogItems: CatalogItem[]
  onSaved: () => void
  onCancel: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(initial ? {
    rule_name: initial.rule_name,
    description: initial.description ?? '',
    trigger_catalog_item_id: initial.trigger_catalog_item_id ?? '',
    trigger_keywords: initial.trigger_keywords?.join(', ') ?? '',
    suggested_catalog_item_id: initial.suggested_catalog_item_id,
    bundle_discount_percent: initial.bundle_discount_percent,
    bundle_description: initial.bundle_description ?? '',
    bundle_emoji_icon: initial.bundle_emoji_icon ?? '',
    show_every_x_bookings: initial.show_every_x_bookings,
    is_active: initial.is_active,
  } : EMPTY_FORM)

  function handleSave() {
    setError(null)
    if (!form.rule_name.trim() || !form.suggested_catalog_item_id) {
      setError('Rule name and suggested item are required.')
      return
    }
    if (!form.trigger_catalog_item_id && !form.trigger_keywords.trim()) {
      setError('Set a trigger item or trigger keywords.')
      return
    }
    startTransition(async () => {
      const payload = {
        rule_name: form.rule_name.trim(),
        description: form.description.trim() || null,
        trigger_catalog_item_id: form.trigger_catalog_item_id || null,
        trigger_keywords: form.trigger_keywords.trim() ? form.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean) : null,
        suggested_catalog_item_id: form.suggested_catalog_item_id,
        bundle_discount_percent: Number(form.bundle_discount_percent),
        bundle_description: form.bundle_description.trim() || null,
        bundle_emoji_icon: form.bundle_emoji_icon.trim() || null,
        show_every_x_bookings: Number(form.show_every_x_bookings),
        is_active: form.is_active,
      }
      const result = initial ? await updateUpsellRule(initial.id, payload) : await createUpsellRule(payload)
      if (!result.ok) { setError(result.error); return }
      onSaved()
    })
  }

  return (
    <div style={card} className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Rule name</label>
          <input value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} placeholder="HVAC: Suggest Air Filter" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Internal note</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>When this item is on the order</label>
          <select value={form.trigger_catalog_item_id} onChange={e => setForm(f => ({ ...f, trigger_catalog_item_id: e.target.value }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
            <option value="">— Any (use keywords) —</option>
            {catalogItems.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Or trigger keywords (comma-separated)</label>
          <input value={form.trigger_keywords} onChange={e => setForm(f => ({ ...f, trigger_keywords: e.target.value }))} placeholder="HVAC, maintenance, seasonal" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Suggest this add-on</label>
        <select value={form.suggested_catalog_item_id} onChange={e => setForm(f => ({ ...f, suggested_catalog_item_id: e.target.value }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
          <option value="">— Select an item —</option>
          {catalogItems.map(c => <option key={c.id} value={c.id}>{c.name} (${Number(c.base_price).toFixed(2)})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Bundle discount</label>
          <div className="relative">
            <input type="number" min="0" max="100" value={form.bundle_discount_percent} onChange={e => setForm(f => ({ ...f, bundle_discount_percent: Number(e.target.value) }))} className={`${inputCls} pr-7`} style={{ color: 'hsl(var(--foreground))' }} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>%</span>
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Show every</label>
          <select value={form.show_every_x_bookings} onChange={e => setForm(f => ({ ...f, show_every_x_bookings: Number(e.target.value) }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
            <option value={1}>Every booking</option>
            <option value={2}>Every 2nd booking</option>
            <option value={3}>Every 3rd booking</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Emoji (optional)</label>
          <input value={form.bundle_emoji_icon} onChange={e => setForm(f => ({ ...f, bundle_emoji_icon: e.target.value }))} placeholder="🔧" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>What the customer sees</label>
        <input value={form.bundle_description} onChange={e => setForm(f => ({ ...f, bundle_description: e.target.value }))} placeholder="Monthly filter + inspection (all-in-one)" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
      </div>

      {error && <p className="text-[14px] text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={pending} className="px-4 py-2 rounded-xl font-bold text-[14px] text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))' }}>
          {pending ? 'Saving…' : 'Save Rule'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl font-bold text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
      </div>
    </div>
  )
}

export function UpsellRulesPanel({ initial, catalogItems }: { initial: UpsellRule[]; catalogItems: CatalogItem[] }) {
  const [rules, setRules] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function itemName(id: string) {
    return catalogItems.find(c => c.id === id)?.name ?? '—'
  }

  function handlePause(rule: UpsellRule) {
    startTransition(async () => {
      const result = await toggleUpsellRule(rule.id, !rule.is_active)
      if (result.ok) setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    })
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {rules.length === 0 && !creating && (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center text-[14px] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No upsell rules yet.
        </div>
      )}

      {rules.length > 0 && (
        <div style={card} className="mb-4 divide-y divide-[hsl(var(--border))] overflow-x-auto">
          {rules.map(rule => (
            editingId === rule.id ? (
              <div key={rule.id} className="p-3">
                <RuleForm
                  initial={rule}
                  catalogItems={catalogItems}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null)
                    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ...rule } : r))
                  }}
                />
              </div>
            ) : (
              <div key={rule.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {rule.bundle_emoji_icon ? `${rule.bundle_emoji_icon} ` : ''}{rule.rule_name}
                  </p>
                  <p className="text-[13px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Suggests {itemName(rule.suggested_catalog_item_id)} · {rule.bundle_discount_percent}% off
                    {!rule.is_active && ' · Paused'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditingId(rule.id)} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Edit</button>
                  <button onClick={() => handlePause(rule)} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                    {rule.is_active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {creating ? (
        <RuleForm
          catalogItems={catalogItems}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); window.location.reload() }}
        />
      ) : (
        <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl font-bold text-[14px] text-white" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))' }}>
          + New Rule
        </button>
      )}
    </div>
  )
}
