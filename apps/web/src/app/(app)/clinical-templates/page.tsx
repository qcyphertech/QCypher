import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { getAvailableModuleKeys } from '@/lib/actions/platform-modules'
import type { Metadata } from 'next'
import { ClinicalTemplatesList } from '@/components/clinical/ClinicalTemplatesList'
import { listClinicalTemplateInstances } from '@/lib/actions/clinical-templates'
import { Lock } from 'lucide-react'

export const metadata: Metadata = { title: 'Clinical Templates' }

export default async function ClinicalTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenant_id = user ? await getTenantId(user.id, user.app_metadata).catch(() => null) : null

  // The nav link hiding this page is cosmetic — this is the real gate.
  // Matches the check inside every clinical-templates server action, so
  // a tenant with direct knowledge of the URL still can't reach it.
  const available = await getAvailableModuleKeys()
  if (available && !available.has('show_clinical_templates')) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Lock className="w-8 h-8" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <p className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>Clinical Templates isn&apos;t enabled for this account</p>
        <p className="text-[15px] max-w-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          This is a specialty feature enabled per account. Contact QCypher support if your practice needs it turned on.
        </p>
      </div>
    )
  }

  const admin = createAdminClient()
  const [{ data: contacts }, instances] = await Promise.all([
    tenant_id
      ? admin.from('contacts').select('id, first_name, last_name, phone').eq('tenant_id', tenant_id).order('first_name')
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string | null; phone: string | null }[] }),
    listClinicalTemplateInstances().catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Clinical Templates</h1>
        <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Intake, progress notes, treatment plans & discharge summaries
        </p>
      </div>
      <ClinicalTemplatesList contacts={contacts ?? []} initialInstances={instances} />
    </div>
  )
}
