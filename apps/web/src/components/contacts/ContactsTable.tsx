'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Filter, Users } from 'lucide-react'

type Contact = {
  id: string; first_name: string; last_name: string | null
  email: string | null; phone: string | null
  tags: string[] | null; status?: string | null; created_at: string
  location_id?: string | null
  tenant_locations?: { location_name: string } | { location_name: string }[] | null
}

function locationName(c: Contact): string | null {
  const rel = c.tenant_locations
  if (!rel) return null
  return Array.isArray(rel) ? rel[0]?.location_name ?? null : rel.location_name
}

const STATUS_STYLE: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  lead:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b', label: 'Lead'     },
  active:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981', label: 'Active'   },
  inactive: { color: '#2a52a0', bg: 'rgba(42,82,160,0.12)',  dot: '#2a52a0', label: 'Inactive' },
}

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'lead',     label: 'Lead' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#2a52a0,#4a9db5)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f97316,#ea580c)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
  'linear-gradient(135deg,#ec4899,#be185d)',
]

function initials(c: Contact) {
  return `${c.first_name[0]}${c.last_name?.[0] ?? ''}`.toUpperCase()
}

export function ContactsTable({ contacts, locations = [] }: { contacts: Contact[]; locations?: { id: string; location_name: string }[] }) {
  const [nameQuery, setNameQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')
  const [phoneQuery, setPhoneQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [location, setLocation] = useState('all')

  const LOCATION_OPTIONS = [{ value: 'all', label: 'All locations' }, ...locations.map(l => ({ value: l.id, label: l.location_name }))]

  const hasFilters = !!(nameQuery || emailQuery || phoneQuery || status !== 'all' || location !== 'all')

  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase()
    const eq = emailQuery.trim().toLowerCase()
    const pq = phoneQuery.trim().toLowerCase()
    return contacts.filter(c => {
      if (status !== 'all' && c.status !== status) return false
      if (location !== 'all' && c.location_id !== location) return false
      const name = `${c.first_name} ${c.last_name ?? ''}`.toLowerCase()
      if (nq && !name.includes(nq)) return false
      if (eq && !(c.email ?? '').toLowerCase().includes(eq)) return false
      if (pq && !(c.phone ?? '').toLowerCase().includes(pq)) return false
      return true
    })
  }, [contacts, nameQuery, emailQuery, phoneQuery, status, location])

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'
  const headerColor = 'hsl(var(--muted-foreground))'

  if (contacts.length === 0) {
    return (
      <div style={{ background: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))', padding: '48px 24px', textAlign: 'center' }}>
        <Users style={{ width: '32px', height: '32px', marginBottom: '12px' }} fill="currentColor" strokeWidth={1} />
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '4px' }}>No contacts yet</p>
        <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>Add your first contact to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {filtered.length} of {contacts.length} contact{contacts.length === 1 ? '' : 's'}
          </p>
          <button
            onClick={() => { setNameQuery(''); setEmailQuery(''); setPhoneQuery(''); setStatus('all'); setLocation('all') }}
            className="text-[15px] font-semibold px-3 py-1.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div style={{ background: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '170px' }}>
                  <span className={headerLabelCls}>Name</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: headerColor, minWidth: '170px' }}>
                  <span className={headerLabelCls}>Email</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={emailQuery} onChange={e => setEmailQuery(e.target.value)} placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: headerColor, minWidth: '150px' }}>
                  <span className={headerLabelCls}>Phone</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <input value={phoneQuery} onChange={e => setPhoneQuery(e.target.value)} placeholder="Filter…"
                      className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: headerColor, minWidth: '150px' }}>
                  <span className={headerLabelCls}>Status</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <select value={status} onChange={e => setStatus(e.target.value)}
                      className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </th>
                <th className="px-5 py-3 text-left align-top hidden sm:table-cell" style={{ color: headerColor, minWidth: '150px' }}>
                  <span className={headerLabelCls}>Location</span>
                  <div className="relative">
                    <Filter className={filterIconCls} />
                    <select value={location} onChange={e => setLocation(e.target.value)}
                      className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                      {LOCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </th>
                <th className="px-5 py-3 hidden sm:table-cell" style={{ width: '20px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    No contacts match your filters.
                  </td>
                </tr>
              ) : filtered.map((contact, i) => {
                const st = STATUS_STYLE[contact.status ?? ''] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8', label: contact.status ?? '' }
                const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                return (
                  <tr key={contact.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 no-underline">
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 900, color: '#fff', background: grad,
                        }}>
                          {initials(contact)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold truncate" style={{ color: 'hsl(var(--foreground))' }}>
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-[15px] sm:hidden truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                            {contact.email}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[15px] hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {contact.email || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] hidden sm:table-cell" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {contact.phone || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {contact.status && (
                        <span className="inline-flex items-center gap-1.5 text-[15px] font-bold px-2.5 py-1 rounded-full capitalize"
                          style={{ background: st.bg, color: st.color }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: st.dot }} />
                          {st.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {locationName(contact) || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
