'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { updateProfile, updateBusinessName } from '@/lib/actions/account'
import { User, Phone, Mail, MapPin, Check, Pencil, Search, Building2, Loader2 } from 'lucide-react'

type Props = {
  initial: {
    legal_name:    string | null
    nickname:      string | null
    phone:         string | null
    street:        string | null
    city:          string | null
    state:         string | null
    zip:           string | null
    email:         string
    business_name: string | null
  }
  readOnly?: boolean
}

type NominatimResult = {
  display_name: string
  address: {
    house_number?: string; road?: string
    city?: string; town?: string; village?: string
    state?: string; postcode?: string
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border text-[15px] outline-none transition-colors'
const inputStyle = {
  background: 'hsl(var(--muted))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
}

export function ProfileForm({ initial, readOnly = false }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    business_name: initial.business_name ?? '',
    legal_name:    initial.legal_name    ?? '',
    phone:         formatPhone(initial.phone ?? ''),
    street:        initial.street        ?? '',
    city:          initial.city          ?? '',
    state:         initial.state         ?? '',
    zip:           initial.zip           ?? '',
  })

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [suggOpen,    setSuggOpen]    = useState(false)
  const [suggLoading, setSuggLoading] = useState(false)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const inputBoxRef  = useRef<HTMLDivElement>(null)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setSuggOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // The suggestion dropdown is portaled to <body> so it can escape the
  // profile card's `overflow: hidden` (needed to clip the card's own
  // rounded corners) — otherwise long results get visually cut off.
  // Position is computed from the input's real screen location instead.
  useEffect(() => {
    if (!suggOpen) return
    function updateRect() {
      const box = inputBoxRef.current?.getBoundingClientRect()
      if (box) setDropdownRect({ top: box.bottom + 4, left: box.left, width: box.width })
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [suggOpen, suggestions])

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 4) { setSuggestions([]); setSuggOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSuggLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=us&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data); setSuggOpen(data.length > 0)
      } catch { setSuggestions([]) }
      finally { setSuggLoading(false) }
    }, 350)
  }, [])

  function pickSuggestion(r: NominatimResult) {
    const a = r.address
    setForm(f => ({
      ...f,
      street: [a.house_number, a.road].filter(Boolean).join(' ') || f.street,
      city:   a.city ?? a.town ?? a.village ?? f.city,
      state:  a.state ?? f.state,
      zip:    a.postcode ?? f.zip,
    }))
    setSuggestions([]); setSuggOpen(false)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const bizResult = await updateBusinessName(form.business_name)
      if (bizResult?.error) { setError(bizResult.error); return }
      const result = await updateProfile({
        legal_name: form.legal_name,
        phone:      form.phone,
        street:     form.street,
        city:       form.city,
        state:      form.state,
        zip:        form.zip,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true); setEditing(false)
        setTimeout(() => setSaved(false), 2500)
        // Force the (app) layout (top bar business-initials avatar) to
        // re-render with fresh server data right now, rather than relying
        // on revalidatePath tag matching or waiting for the next natural
        // navigation to pick up the change.
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm({
      business_name: initial.business_name ?? '',
      legal_name:    initial.legal_name    ?? '',
      phone:         formatPhone(initial.phone ?? ''),
      street:        initial.street        ?? '',
      city:          initial.city          ?? '',
      state:         initial.state         ?? '',
      zip:           initial.zip           ?? '',
    })
    setEditing(false); setError(null)
  }

  const addressDisplay = [form.street, form.city, form.state, form.zip].filter(Boolean).join(', ')

  const FIELDS = [
    { key: 'business_name', label: 'Business name', icon: Building2, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', placeholder: 'Your business name' },
    { key: 'legal_name',    label: 'Legal name',    icon: User,      color: '#2a52a0', bg: 'rgba(42,82,160,0.10)',   placeholder: 'Your full legal name' },
    { key: 'phone',         label: 'Phone',         icon: Phone,     color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)', placeholder: '(555) 000-0000' },
  ] as const

  return (
    <div style={{
      borderRadius: '16px',
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid hsl(var(--border))',
      }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
          {editing ? 'Edit profile' : 'Profile info'}
        </p>
        {editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCancel}
              style={{
                padding: '7px 16px', borderRadius: '10px', border: '1px solid hsl(var(--border))',
                background: 'transparent', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600, color: 'hsl(var(--muted-foreground))',
              }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 18px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
                cursor: saving ? 'wait' : 'pointer',
                fontSize: '14px', fontWeight: 700, color: '#fff',
                opacity: saving ? 0.7 : 1,
              }}>
              {saving
                ? <><Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />Saving…</>
                : <><Check style={{ width: '13px', height: '13px' }} />Save</>}
            </button>
          </div>
        ) : !readOnly ? (
          <button onClick={() => setEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '10px',
              border: '1px solid hsl(var(--border))',
              background: 'transparent', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))',
            }}>
            {saved
              ? <><Check style={{ width: '13px', height: '13px', color: '#10b981' }} /><span style={{ color: '#10b981' }}>Saved</span></>
              : <><Pencil style={{ width: '13px', height: '13px' }} />Edit</>}
          </button>
        ) : null}
      </div>

      {/* Fields */}
      <div style={{ padding: '4px 0' }}>
        {FIELDS.map(({ key, label, icon: Icon, color, bg, placeholder }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid hsl(var(--border))',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon style={{ width: '15px', height: '15px', color }} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '3px' }}>
                {label}
              </p>
              {editing ? (
                <input
                  value={form[key]}
                  onChange={e => {
                    const val = key === 'phone' ? formatPhone(e.target.value) : e.target.value
                    setForm(f => ({ ...f, [key]: val }))
                  }}
                  placeholder={placeholder}
                  className={inputCls}
                  style={inputStyle}
                />
              ) : (
                <p style={{
                  fontSize: '14px',
                  color: form[key] ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  fontStyle: form[key] ? 'normal' : 'italic',
                }}>
                  {form[key] || placeholder}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Email — always read-only */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px',
          borderBottom: '1px solid hsl(var(--border))',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(16,185,129,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail style={{ width: '15px', height: '15px', color: '#10b981' }} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '3px' }}>Email</p>
            <p style={{ fontSize: '14px', color: 'hsl(var(--foreground))' }}>{initial.email}</p>
          </div>
          <span style={{
            fontSize: '14px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', flexShrink: 0,
            background: 'rgba(16,185,129,0.12)', color: '#059669',
          }}>Verified</span>
        </div>

        {/* Address */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: editing ? '12px' : 0 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(249,115,22,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin style={{ width: '15px', height: '15px', color: '#f97316' }} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '3px' }}>Address</p>
              {!editing && (
                <p style={{
                  fontSize: '14px',
                  color: addressDisplay ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  fontStyle: addressDisplay ? 'normal' : 'italic',
                }}>
                  {addressDisplay || 'Business / mailing address'}
                </p>
              )}
            </div>
          </div>

          {editing && (
            <div style={{ paddingLeft: '46px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Street with autocomplete */}
              <div ref={wrapperRef} style={{ position: 'relative' }}>
                <div ref={inputBoxRef} style={{ position: 'relative' }}>
                  <input
                    value={form.street}
                    onChange={e => { setForm(f => ({ ...f, street: e.target.value })); fetchSuggestions(e.target.value) }}
                    onFocus={() => suggestions.length > 0 && setSuggOpen(true)}
                    placeholder="Street address"
                    autoComplete="off"
                    className={inputCls}
                    style={{ ...inputStyle, paddingRight: '36px' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    {suggLoading
                      ? <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid #f97316', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      : <Search style={{ width: '13px', height: '13px', color: 'hsl(var(--muted-foreground))' }} />}
                  </div>
                </div>
                {suggOpen && suggestions.length > 0 && dropdownRect && typeof document !== 'undefined' && createPortal(
                  <div
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      position: 'fixed',
                      top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width,
                      borderRadius: '12px', border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      zIndex: 1000, maxHeight: '280px', overflowY: 'auto',
                    }}>
                    {suggestions.map((r, i) => (
                      <button key={i} type="button"
                        onMouseDown={e => { e.preventDefault(); pickSuggestion(r) }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                        }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))', display: 'block' }}>
                          {[r.address.house_number, r.address.road].filter(Boolean).join(' ') || r.display_name.split(',')[0]}
                        </span>
                        <span style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>
                          {r.display_name}
                        </span>
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '8px' }}>
                {[
                  { key: 'city',  placeholder: 'City'  },
                  { key: 'state', placeholder: 'State' },
                  { key: 'zip',   placeholder: 'Zip'   },
                ].map(f => (
                  <input key={f.key}
                    value={form[f.key as 'city' | 'state' | 'zip']}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    maxLength={f.key === 'zip' ? 10 : undefined}
                    className={inputCls}
                    style={inputStyle}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSave} disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 18px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: '14px', fontWeight: 700, color: '#fff',
                    opacity: saving ? 0.7 : 1,
                  }}>
                  {saving
                    ? <><Loader2 style={{ width: '13px', height: '13px', animation: 'spin 1s linear infinite' }} />Saving…</>
                    : <><Check style={{ width: '13px', height: '13px' }} />Save</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid hsl(var(--border))' }}>
          <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {saved && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border))' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            borderRadius: '12px', padding: '12px 16px',
            fontSize: '14px', fontWeight: 600,
            background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#059669', color: '#fff', fontSize: '12px', fontWeight: 700,
            }}>✓</span>
            Profile saved
          </div>
        </div>
      )}
    </div>
  )
}
