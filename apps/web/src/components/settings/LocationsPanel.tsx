'use client'

import { useState, useTransition } from 'react'
import { createLocation, updateLocation, toggleLocationActive, type TenantLocation } from '@/lib/actions/locations'

const card: React.CSSProperties = { borderRadius: '16px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }
const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-[15px] outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent'
const labelCls = 'text-[12px] font-bold uppercase tracking-wider'

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']

function nextCode(existing: TenantLocation[]) {
  return `LOC-${String(existing.length + 1).padStart(2, '0')}`
}

const emptyForm = (existing: TenantLocation[]) => ({
  location_name: '', location_code: nextCode(existing), address: '', phone: '',
  timezone: 'America/New_York', is_active: true,
})

function LocationForm({ initial, existing, onSaved, onCancel }: {
  initial?: TenantLocation
  existing: TenantLocation[]
  onSaved: () => void
  onCancel: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState(initial ? {
    location_name: initial.location_name,
    location_code: initial.location_code,
    address: initial.address ?? '',
    phone: initial.phone ?? '',
    timezone: initial.timezone,
    is_active: initial.is_active,
  } : emptyForm(existing))

  function handleSave() {
    setError(null)
    if (!form.location_name.trim() || !form.location_code.trim()) {
      setError('Location name and code are required.')
      return
    }
    startTransition(async () => {
      const payload = {
        location_name: form.location_name.trim(),
        location_code: form.location_code.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        timezone: form.timezone,
        is_active: form.is_active,
      }
      const result = initial ? await updateLocation(initial.id, payload) : await createLocation(payload)
      if (!result.ok) { setError(result.error); return }
      setSaved(true)
      setTimeout(onSaved, 700)
    })
  }

  return (
    <div style={card} className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Location name</label>
          <input value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} placeholder="Downtown Office" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Location code</label>
          <input value={form.location_code} onChange={e => setForm(f => ({ ...f, location_code: e.target.value }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </div>

      <div className="space-y-1">
        <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Address</label>
        <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Springfield" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className={inputCls} style={{ color: 'hsl(var(--foreground))' }} />
        </div>
        <div className="space-y-1">
          <label className={labelCls} style={{ color: 'hsl(var(--muted-foreground))' }}>Timezone</label>
          <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className={inputCls} style={{ color: 'hsl(var(--foreground))' }}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-[14px] text-red-500">{error}</p>}

      {saved && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[14px] font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[12px] font-bold" style={{ background: '#059669' }}>✓</span>
          Location saved
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={pending || saved} className="px-4 py-2 rounded-xl font-bold text-[14px] text-white disabled:opacity-50" style={{ background: saved ? '#059669' : 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))' }}>
          {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save Location'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl font-bold text-[14px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
      </div>
    </div>
  )
}

export function LocationsPanel({ initial }: { initial: TenantLocation[] }) {
  const [locations, setLocations] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handlePause(loc: TenantLocation) {
    startTransition(async () => {
      const result = await toggleLocationActive(loc.id, !loc.is_active)
      if (result.ok) setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, is_active: !l.is_active } : l))
    })
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {locations.length === 0 && !creating && (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center text-[14px] mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          No locations yet.
        </div>
      )}

      {locations.length > 0 && (
        <div style={card} className="mb-4 divide-y divide-[hsl(var(--border))] overflow-x-auto">
          {locations.map(loc => (
            editingId === loc.id ? (
              <div key={loc.id} className="p-3">
                <LocationForm
                  initial={loc}
                  existing={locations}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => { setEditingId(null); window.location.reload() }}
                />
              </div>
            ) : (
              <div key={loc.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                    {loc.location_name} <span className="font-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>({loc.location_code})</span>
                  </p>
                  <p className="text-[13px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {[loc.address, loc.phone].filter(Boolean).join(' · ') || 'No address or phone set'}
                    {!loc.is_active && ' · Paused'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditingId(loc.id)} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Edit</button>
                  <button onClick={() => handlePause(loc)} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                    {loc.is_active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {creating ? (
        <LocationForm
          existing={locations}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); window.location.reload() }}
        />
      ) : (
        <button onClick={() => setCreating(true)} className="px-4 py-2 rounded-xl font-bold text-[14px] text-white" style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))' }}>
          + New Location
        </button>
      )}
    </div>
  )
}
