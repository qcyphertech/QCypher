'use server'

// Phase 43 — Clinical Templates. See the compliance note on the
// clinical_template_instances migration (20260908000003_clinical_templates.sql)
// before wiring this up for a real clinical tenant: this can hold genuine
// PHI, and the project currently has no signed Supabase HIPAA BAA.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { getAvailableModuleKeys } from './platform-modules'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import type { ClinicalTemplateType } from '@/lib/clinical-template-defs'

// The nav link hiding when `show_clinical_templates` isn't granted is
// cosmetic only — this is the actual enforcement point. Every read/write
// path below goes through one of the two guards, both of which call this
// first, so a tenant that hasn't been explicitly granted the module can't
// reach clinical data by hitting the route or action directly.
async function requireClinicalModuleEnabled() {
  const available = await getAvailableModuleKeys()
  if (available && !available.has('show_clinical_templates')) {
    throw new Error('Clinical Templates is not enabled for this account')
  }
}

export type ClinicalTemplateInstance = {
  id: string
  tenant_id: string
  contact_id: string
  template_type: ClinicalTemplateType
  form_data: Record<string, string>
  status: 'draft' | 'finalized'
  version: number
  created_by: string
  finalized_by: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string
  contact_name?: string
}

export type ClinicalTemplateVersion = {
  id: string
  instance_id: string
  version: number
  form_data: Record<string, string>
  edited_by: string
  edited_by_email?: string
  edited_at: string
}

async function requireClinicalWriter() {
  await requireClinicalModuleEnabled()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as 'owner' | 'member' | 'read_only'
  if (role === 'read_only') throw new Error('Read-only accounts cannot create or edit clinical documentation')

  const tenantId = await getTenantId(user.id, fresh?.app_metadata)
  return { user, admin, tenantId }
}

async function requireClinicalReader() {
  await requireClinicalModuleEnabled()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { user, admin, tenantId }
}

export async function listClinicalTemplateInstances(opts: { contactId?: string; templateType?: ClinicalTemplateType; search?: string } = {}): Promise<ClinicalTemplateInstance[]> {
  const { admin, tenantId } = await requireClinicalReader()
  let query = admin
    .from('clinical_template_instances')
    .select('*, contacts(first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (opts.contactId) query = query.eq('contact_id', opts.contactId)
  if (opts.templateType) query = query.eq('template_type', opts.templateType)

  const { data, error } = await query.limit(200)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as Array<ClinicalTemplateInstance & { contacts: { first_name: string; last_name: string | null } | null }>
  const mapped = rows.map(r => ({ ...r, contact_name: r.contacts ? `${r.contacts.first_name} ${r.contacts.last_name ?? ''}`.trim() : undefined }))

  if (opts.search) {
    const q = opts.search.trim().toLowerCase()
    return mapped.filter(r => (r.contact_name ?? '').toLowerCase().includes(q))
  }
  return mapped
}

export async function getClinicalTemplateInstance(id: string): Promise<{ instance: ClinicalTemplateInstance; versions: ClinicalTemplateVersion[] } | null> {
  const { admin, tenantId } = await requireClinicalReader()
  const { data: instance } = await admin
    .from('clinical_template_instances')
    .select('*, contacts(first_name, last_name)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!instance) return null

  const { data: versionRows } = await admin
    .from('clinical_template_instance_versions')
    .select('*')
    .eq('instance_id', id)
    .eq('tenant_id', tenantId)
    .order('version', { ascending: false })

  // Resolve editor emails for display — auth.users isn't a normal
  // PostgREST-joinable table, so this is a separate lookup + in-memory
  // map, same pattern used for tenant-referral/team-member displays
  // elsewhere in this app.
  const editorIds = Array.from(new Set((versionRows ?? []).map(v => v.edited_by)))
  const emailById = new Map<string, string>()
  if (editorIds.length) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of users) if (editorIds.includes(u.id)) emailById.set(u.id, u.email ?? '')
  }

  const contact = (instance as unknown as { contacts: { first_name: string; last_name: string | null } | null }).contacts
  return {
    instance: { ...(instance as unknown as ClinicalTemplateInstance), contact_name: contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : undefined },
    versions: (versionRows ?? []).map(v => ({ ...v, edited_by_email: emailById.get(v.edited_by) })) as unknown as ClinicalTemplateVersion[],
  }
}

export async function createClinicalTemplateInstance(input: {
  contactId: string
  templateType: ClinicalTemplateType
  formData: Record<string, string>
}): Promise<{ id: string }> {
  const { user, admin, tenantId } = await requireClinicalWriter()

  const { data, error } = await admin
    .from('clinical_template_instances')
    .insert({
      tenant_id: tenantId,
      contact_id: input.contactId,
      template_type: input.templateType,
      form_data: input.formData,
      status: 'draft',
      version: 1,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create clinical note')

  await logAudit({ action: 'clinical_template_created', resource_type: 'clinical_template', resource_id: data.id, details: { template_type: input.templateType } })
  revalidatePath('/clinical-templates')
  return { id: data.id }
}

// Every edit after creation appends the PREVIOUS state to the versions
// table before overwriting — an immutable trail of what the record looked
// like at each prior version, not just a last-updated timestamp.
export async function updateClinicalTemplateInstance(id: string, formData: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, admin, tenantId } = await requireClinicalWriter()

  const { data: existing } = await admin
    .from('clinical_template_instances')
    .select('id, tenant_id, status, version, form_data')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!existing) return { ok: false, error: 'Not found' }
  if (existing.status === 'finalized') return { ok: false, error: 'This note is finalized and can no longer be edited' }

  const { error: versionError } = await admin.from('clinical_template_instance_versions').insert({
    instance_id: id,
    tenant_id: tenantId,
    version: existing.version,
    form_data: existing.form_data,
    edited_by: user.id,
  })
  if (versionError) return { ok: false, error: versionError.message }

  const { error } = await admin
    .from('clinical_template_instances')
    .update({ form_data: formData, version: existing.version + 1, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ action: 'clinical_template_updated', resource_type: 'clinical_template', resource_id: id, details: { new_version: existing.version + 1 } })
  revalidatePath('/clinical-templates')
  return { ok: true }
}

// Silent background persistence while a clinician is still typing — does
// NOT append a version-history row or write an audit log entry. Doing
// either on every autosave tick would turn "version history" into a
// keystroke log instead of a meaningful clinical-edit trail, and would
// flood audit_logs. The real version checkpoint still only happens on an
// explicit "Save draft" / "Save & finalize" click (updateClinicalTemplateInstance).
export async function autosaveClinicalTemplateInstance(id: string, formData: Record<string, string>): Promise<{ ok: true } | { ok: false; error: string }> {
  const { admin, tenantId } = await requireClinicalWriter()

  const { data, error } = await admin
    .from('clinical_template_instances')
    .update({ form_data: formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Not found, or already finalized' }
  return { ok: true }
}

// One-way — no unfinalize action. Re-opening a finalized clinical record
// is a clinical/legal decision, not a UI convenience; if that's ever
// needed it should be its own explicit, audited action, not a toggle.
export async function finalizeClinicalTemplateInstance(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, admin, tenantId } = await requireClinicalWriter()

  const { data, error } = await admin
    .from('clinical_template_instances')
    .update({ status: 'finalized', finalized_by: user.id, finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Already finalized, or not found' }

  await logAudit({ action: 'clinical_template_finalized', resource_type: 'clinical_template', resource_id: id })
  revalidatePath('/clinical-templates')
  return { ok: true }
}
