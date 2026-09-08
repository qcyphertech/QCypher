import { notFound } from 'next/navigation'
import { getClinicalTemplateInstance } from '@/lib/actions/clinical-templates'
import { CLINICAL_TEMPLATES } from '@/lib/clinical-template-defs'
import { PrintButton } from '@/components/clinical/PrintButton'

export default async function ClinicalTemplatePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getClinicalTemplateInstance(id)
  if (!result) notFound()
  const { instance } = result
  const def = CLINICAL_TEMPLATES[instance.template_type]

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px', fontFamily: 'system-ui, sans-serif', color: '#171a2b' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
        }
      `}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <PrintButton />
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '4px' }}>{def.label}</h1>
      <p style={{ fontSize: '14px', color: '#5b6072', marginBottom: '4px' }}>Patient: {instance.contact_name ?? 'Unknown'}</p>
      <p style={{ fontSize: '13px', color: '#5b6072', marginBottom: '24px' }}>
        {instance.status === 'finalized' ? `Finalized ${instance.finalized_at ? new Date(instance.finalized_at).toLocaleString() : ''}` : `Draft — version ${instance.version}`}
      </p>

      <div style={{ borderTop: '1px solid #dde2ea' }}>
        {def.fields.map(f => (
          <div key={f.key} style={{ padding: '14px 0', borderBottom: '1px solid #dde2ea' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: f.highlight ? '#dc2626' : '#5b6072', marginBottom: '4px' }}>
              {f.label}
            </p>
            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', color: '#171a2b' }}>
              {instance.form_data[f.key] || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
