'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { X, AlertTriangle, Lock } from 'lucide-react'
import { CLINICAL_TEMPLATES, type ClinicalTemplateType } from '@/lib/clinical-template-defs'
import {
  createClinicalTemplateInstance, updateClinicalTemplateInstance, finalizeClinicalTemplateInstance,
  autosaveClinicalTemplateInstance,
  type ClinicalTemplateInstance,
} from '@/lib/actions/clinical-templates'

const AUTOSAVE_DELAY_MS = 1500

type ContactLite = { id: string; first_name: string; last_name: string | null; phone?: string | null }

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function ClinicalTemplateModal({ templateType, contacts, instance, defaultContactId, onClose, onSaved }: {
  templateType: ClinicalTemplateType
  contacts: ContactLite[]
  instance: ClinicalTemplateInstance | null
  defaultContactId?: string
  onClose: () => void
  onSaved: (instance: ClinicalTemplateInstance) => void
}) {
  const def = CLINICAL_TEMPLATES[templateType]
  const [pending, startTransition] = useTransition()
  const [, startAutosaveTransition] = useTransition()
  const [contactId, setContactId] = useState(instance?.contact_id ?? defaultContactId ?? '')
  const [instanceId, setInstanceId] = useState(instance?.id)
  const [error, setError] = useState<string | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const isFinalized = instance?.status === 'finalized'
  const contact = contacts.find(c => c.id === contactId) ?? null

  const skipFirstAutosave = useRef(true)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [values, setValues] = useState<Record<string, string>>(() => {
    if (instance) return instance.form_data
    const initial: Record<string, string> = {}
    const preselected = defaultContactId ? contacts.find(c => c.id === defaultContactId) ?? null : null
    for (const f of def.fields) {
      if (f.autofill === 'today') initial[f.key] = today()
      if (f.autofill === 'contact_name' && preselected) initial[f.key] = `${preselected.first_name} ${preselected.last_name ?? ''}`.trim()
      if (f.autofill === 'contact_phone' && preselected) initial[f.key] = preselected.phone ?? ''
    }
    return initial
  })

  function applyAutofill(nextContact: ContactLite | null) {
    setValues(prev => {
      const next = { ...prev }
      for (const f of def.fields) {
        if (f.autofill === 'contact_name') next[f.key] = nextContact ? `${nextContact.first_name} ${nextContact.last_name ?? ''}`.trim() : ''
        if (f.autofill === 'contact_phone') next[f.key] = nextContact?.phone ?? ''
      }
      return next
    })
  }

  function handleContactChange(id: string) {
    setContactId(id)
    applyAutofill(contacts.find(c => c.id === id) ?? null)
  }

  function buildInstance(id: string, andFinalize: boolean): ClinicalTemplateInstance {
    return {
      id, tenant_id: '', contact_id: contactId, template_type: templateType,
      form_data: values, status: andFinalize ? 'finalized' : 'draft', version: (instance?.version ?? 0) + 1,
      created_by: '', finalized_by: null, finalized_at: null,
      created_at: instance?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString(),
      contact_name: contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : undefined,
    }
  }

  // Silent background persistence — doesn't touch version history or the
  // audit log (see autosaveClinicalTemplateInstance's own comment). Only
  // runs once a patient is picked, skips the initial mount (so opening an
  // existing draft doesn't immediately "autosave" unchanged data), and
  // never runs once finalized.
  useEffect(() => {
    if (isFinalized) return
    if (skipFirstAutosave.current) { skipFirstAutosave.current = false; return }
    if (!contactId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      setAutosaveStatus('saving')
      startAutosaveTransition(async () => {
        try {
          if (!instanceId) {
            const result = await createClinicalTemplateInstance({ contactId, templateType, formData: values })
            setInstanceId(result.id)
            onSaved(buildInstance(result.id, false))
          } else {
            const result = await autosaveClinicalTemplateInstance(instanceId, values)
            if (!result.ok) { setAutosaveStatus('error'); return }
            onSaved(buildInstance(instanceId, false))
          }
          setAutosaveStatus('saved')
        } catch {
          setAutosaveStatus('error')
        }
      })
    }, AUTOSAVE_DELAY_MS)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, contactId])

  function handleSave(andFinalize: boolean) {
    if (!contactId) { setError('Select a patient first'); return }
    const missing = def.fields.find(f => !f.optional && !(values[f.key] ?? '').trim())
    if (missing) { setError(`${missing.label} is required`); return }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setError(null)
    startTransition(async () => {
      try {
        let id = instanceId
        if (!id) {
          const result = await createClinicalTemplateInstance({ contactId, templateType, formData: values })
          id = result.id
          setInstanceId(id)
        } else {
          const result = await updateClinicalTemplateInstance(id, values)
          if (!result.ok) { setError(result.error); return }
        }
        if (andFinalize) {
          const result = await finalizeClinicalTemplateInstance(id)
          if (!result.ok) { setError(result.error); return }
        }
        onSaved(buildInstance(id, andFinalize))
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-2xl border border-[hsl(var(--border))] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>{def.label}</h2>
            {isFinalized ? (
              <p className="flex items-center gap-1.5 text-[13px] font-semibold mt-1" style={{ color: 'var(--badge-green-text)' }}>
                <Lock className="w-3 h-3" /> Finalized — read only
              </p>
            ) : autosaveStatus !== 'idle' && (
              <p className="text-[13px] mt-1" style={{ color: autosaveStatus === 'error' ? '#dc2626' : 'hsl(var(--muted-foreground))' }}>
                {autosaveStatus === 'saving' ? 'Saving draft…' : autosaveStatus === 'saved' ? 'Draft saved' : "Couldn't save draft"}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Patient *
            </label>
            <select value={contactId} onChange={e => handleContactChange(e.target.value)} disabled={!!instanceId || isFinalized}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px] disabled:opacity-60"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="">— Choose a patient —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>
              ))}
            </select>
          </div>

          {def.fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-[15px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: f.highlight ? '#dc2626' : 'hsl(var(--muted-foreground))' }}>
                {f.highlight && <AlertTriangle className="w-3.5 h-3.5" />}
                {f.label}{!f.optional && ' *'}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={f.highlight ? 3 : 3}
                  value={values[f.key] ?? ''}
                  disabled={isFinalized}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2 text-[15px] resize-none disabled:opacity-70"
                  style={{
                    color: 'hsl(var(--foreground))',
                    background: f.highlight ? 'var(--badge-red-bg)' : 'hsl(var(--muted))',
                    borderColor: f.highlight ? 'var(--badge-red-text)' : 'hsl(var(--border))',
                  }}
                />
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={values[f.key] ?? ''}
                  disabled={isFinalized}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px] disabled:opacity-70"
                  style={{ color: 'hsl(var(--foreground))' }}
                />
              )}
            </div>
          ))}

          {error && <p className="text-[15px] text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              {isFinalized ? 'Close' : 'Cancel'}
            </button>
            {!isFinalized && (
              <>
                <button type="button" disabled={pending} onClick={() => handleSave(false)}
                  className="flex-1 py-2.5 rounded-xl border text-[15px] font-bold disabled:opacity-50"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Save draft
                </button>
                <button type="button" disabled={pending} onClick={() => handleSave(true)}
                  className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
                  {pending ? 'Saving…' : 'Save & finalize'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
