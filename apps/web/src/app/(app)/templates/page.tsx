import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TemplateList } from '@/components/templates/TemplateList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Templates' }

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id ?? ''

  const [{ data: templates }, { data: contacts }, { data: tenant }] = await Promise.all([
    supabase.from('templates').select('*').order('name', { ascending: true }),
    // Send-target picker for the template-first "Send" flow.
    supabase.from('contacts').select('id, first_name, last_name, email, phone, company').order('first_name', { ascending: true }),
    // Real sender name for the sample-message preview on each card.
    supabase.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">Templates</h1>
          <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">Quick-reply snippets for email and SMS</p>
        </div>
        <Link href="/templates/new" className="bg-accent text-white text-[15px] font-medium px-4 py-2 rounded-xl hover:bg-accent-hover transition-colors">
          New template
        </Link>
      </div>
      <TemplateList templates={templates ?? []} contacts={contacts ?? []} businessName={tenant?.name ?? ''} />
    </div>
  )
}
