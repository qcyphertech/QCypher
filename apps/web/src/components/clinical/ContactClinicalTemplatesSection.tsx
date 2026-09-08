'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CLINICAL_TEMPLATE_LIST, type ClinicalTemplateType } from '@/lib/clinical-template-defs'
import type { ClinicalTemplateInstance } from '@/lib/actions/clinical-templates'
import { ClinicalTemplateModal } from './ClinicalTemplateModal'
import { ClipboardList, Printer } from 'lucide-react'

type ContactLite = { id: string; first_name: string; last_name: string | null; phone?: string | null }

const STATUS_META: Record<'draft' | 'finalized', { label: string; bg: string; color: string }> = {
  draft:     { label: 'Draft',     bg: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)' },
  finalized: { label: 'Finalized', bg: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' },
}

export function ContactClinicalTemplatesSection({ contact, initialInstances }: {
  contact: ContactLite
  initialInstances: ClinicalTemplateInstance[]
}) {
  const [instances, setInstances] = useState(initialInstances)
  const [modalTemplate, setModalTemplate] = useState<ClinicalTemplateType | null>(null)
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null)

  function refresh(next: ClinicalTemplateInstance) {
    setInstances(prev => {
      const idx = prev.findIndex(i => i.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CLINICAL_TEMPLATE_LIST.map(t => (
          <button
            key={t.type}
            onClick={() => { setEditInstanceId(null); setModalTemplate(t.type) }}
            className="text-[13px] font-bold px-3 py-2.5 rounded-xl text-white text-center"
            style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
          >
            + {t.label}
          </button>
        ))}
      </div>

      {instances.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center rounded-2xl border border-[hsl(var(--border))]">
          <ClipboardList className="w-6 h-6" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No clinical notes for this patient yet</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden divide-y divide-[hsl(var(--border))]">
          {instances.map(i => {
            const def = CLINICAL_TEMPLATE_LIST.find(t => t.type === i.template_type)
            const meta = STATUS_META[i.status]
            return (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>{def?.label ?? i.template_type}</p>
                  <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                <button onClick={() => { setEditInstanceId(i.id); setModalTemplate(i.template_type) }}
                  className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">
                  {i.status === 'finalized' ? 'View' : 'Continue'}
                </button>
                <Link href={`/clinical-templates/${i.id}/print`} target="_blank"
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]" title="Print / Save as PDF">
                  <Printer className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {modalTemplate && (
        <ClinicalTemplateModal
          templateType={modalTemplate}
          contacts={[contact]}
          defaultContactId={contact.id}
          instance={editInstanceId ? instances.find(i => i.id === editInstanceId) ?? null : null}
          onClose={() => { setModalTemplate(null); setEditInstanceId(null) }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
