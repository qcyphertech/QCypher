import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'

export const metadata: Metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  const supabase = await createClient()

  const [{ data: stages }, { data: deals }, { data: contacts }] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('position'),
    supabase.from('pipeline_deals').select('*, contact:contacts(id, first_name, last_name, company)').order('position'),
    supabase.from('contacts').select('id, first_name, last_name, company').order('first_name'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Pipeline
        </h1>
        <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginTop: '3px' }}>
          Track deals through your sales stages
        </p>
      </div>
      <PipelineBoard
        initialStages={stages ?? []}
        initialDeals={deals ?? []}
        contacts={contacts ?? []}
      />
    </div>
  )
}
