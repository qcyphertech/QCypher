'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CLINICAL_TEMPLATE_LIST, type ClinicalTemplateType } from '@/lib/clinical-template-defs'
import type { ClinicalTemplateInstance } from '@/lib/actions/clinical-templates'
import { ClinicalTemplateModal } from './ClinicalTemplateModal'
import { FileText, Filter, ClipboardList, Printer } from 'lucide-react'

type ContactLite = { id: string; first_name: string; last_name: string | null }

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...CLINICAL_TEMPLATE_LIST.map(t => ({ value: t.type, label: t.label })),
]

const STATUS_META: Record<'draft' | 'finalized', { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)' },
  finalized: { label: 'Finalized', bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
}

export function ClinicalTemplatesList({ contacts, initialInstances }: {
  contacts: ContactLite[]
  initialInstances: ClinicalTemplateInstance[]
}) {
  const [instances, setInstances] = useState(initialInstances)
  const [modalTemplate, setModalTemplate] = useState<ClinicalTemplateType | null>(null)
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null)
  const [nameQuery, setNameQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  function refresh(next: ClinicalTemplateInstance) {
    setInstances(prev => {
      const idx = prev.findIndex(i => i.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
  }

  const filtered = useMemo(() => {
    const nq = nameQuery.trim().toLowerCase()
    return instances.filter(i => {
      if (typeFilter !== 'all' && i.template_type !== typeFilter) return false
      if (nq && !(i.contact_name ?? '').toLowerCase().includes(nq)) return false
      return true
    })
  }, [instances, nameQuery, typeFilter])

  const headerLabelCls = 'text-[15px] font-bold uppercase tracking-wide'
  const headerFilterCls = 'mt-1.5 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-6 pr-2 py-1 text-[13px] font-normal normal-case tracking-normal'
  const filterIconCls = 'w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none'
  const headerColor = 'hsl(var(--muted-foreground))'

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Template library
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CLINICAL_TEMPLATE_LIST.map(t => (
            <div key={t.type} className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4 flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.1)' }}>
                <ClipboardList className="w-4 h-4" style={{ color: '#0891b2' }} />
              </div>
              <div>
                <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{t.label}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{t.description}</p>
              </div>
              <button
                onClick={() => { setEditInstanceId(null); setModalTemplate(t.type) }}
                className="mt-auto text-[15px] font-bold px-3 py-2 rounded-xl text-white text-center"
                style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
              >
                Start new {t.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
          History
        </p>
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                  <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '180px' }}>
                    <span className={headerLabelCls}>Patient</span>
                    <div className="relative">
                      <Filter className={filterIconCls} />
                      <input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="Filter…"
                        className={headerFilterCls} style={{ color: 'hsl(var(--foreground))' }} />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left align-top" style={{ color: headerColor, minWidth: '180px' }}>
                    <span className={headerLabelCls}>Type</span>
                    <div className="relative">
                      <Filter className={filterIconCls} />
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className={`${headerFilterCls} appearance-none`} style={{ color: 'hsl(var(--foreground))' }}>
                        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left align-top" style={{ color: headerColor }}>
                    <span className={headerLabelCls}>Date</span>
                  </th>
                  <th className="px-5 py-3 text-left align-top" style={{ color: headerColor }}>
                    <span className={headerLabelCls}>Status</span>
                  </th>
                  <th className="px-5 py-3 align-top" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const def = CLINICAL_TEMPLATE_LIST.find(t => t.type === i.template_type)
                  const meta = STATUS_META[i.status]
                  return (
                    <tr key={i.id} className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{i.contact_name ?? 'Unknown patient'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>{def?.label ?? i.template_type}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[15px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setEditInstanceId(i.id); setModalTemplate(i.template_type) }}
                            className="text-[15px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                            {i.status === 'finalized' ? 'View' : 'Continue'}
                          </button>
                          <Link href={`/clinical-templates/${i.id}/print`} target="_blank"
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]" title="Print / Save as PDF">
                            <Printer className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-14 flex flex-col items-center gap-2 text-center">
              <FileText className="w-6 h-6" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No clinical notes yet</p>
            </div>
          )}
        </div>
      </div>

      {modalTemplate && (
        <ClinicalTemplateModal
          templateType={modalTemplate}
          contacts={contacts}
          instance={editInstanceId ? instances.find(i => i.id === editInstanceId) ?? null : null}
          onClose={() => { setModalTemplate(null); setEditInstanceId(null) }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
