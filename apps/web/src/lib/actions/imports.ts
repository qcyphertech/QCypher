'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ImportRow = {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
  tags?: string
  source?: string
}

export type ParsedContact = ImportRow & {
  _row: number
  _errors: string[]
  _duplicate?: { id: string; first_name: string; last_name: string | null }
}

export async function checkDuplicates(rows: ImportRow[]): Promise<ParsedContact[]> {
  const supabase = await createClient()

  const emails = rows.map(r => r.email).filter(Boolean) as string[]
  const phones = rows.map(r => r.phone).filter(Boolean) as string[]

  const [{ data: byEmail }, { data: byPhone }] = await Promise.all([
    emails.length
      ? supabase.from('contacts').select('id, first_name, last_name, email').in('email', emails)
      : Promise.resolve({ data: [] }),
    phones.length
      ? supabase.from('contacts').select('id, first_name, last_name, phone').in('phone', phones)
      : Promise.resolve({ data: [] }),
  ])

  const emailMap = new Map<string, { id: string; first_name: string; last_name: string | null }>()
  const phoneMap = new Map<string, { id: string; first_name: string; last_name: string | null }>()

  for (const c of (byEmail ?? []) as { id: string; first_name: string; last_name: string | null; email: string | null }[]) {
    if (c.email) emailMap.set(c.email.toLowerCase(), c)
  }
  for (const c of (byPhone ?? []) as { id: string; first_name: string; last_name: string | null; phone: string | null }[]) {
    if (c.phone) phoneMap.set(c.phone, c)
  }

  return rows.map((row, i) => {
    const errors: string[] = []
    if (!row.first_name?.trim()) errors.push('Missing first name')

    const dup =
      (row.email && emailMap.get(row.email.toLowerCase())) ||
      (row.phone && phoneMap.get(row.phone)) ||
      undefined

    return {
      ...row,
      _row: i + 1,
      _errors: errors,
      _duplicate: dup ?? undefined,
    }
  })
}

export async function commitImport(
  filename: string,
  rows: ParsedContact[],
): Promise<{ importId: string; imported: number; skipped: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const jwtTenantId = user.app_metadata?.tenant_id
  if (!jwtTenantId) throw new Error('No tenant')
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', jwtTenantId).single()
  if (!tenant) throw new Error('Tenant not found')
  const tenantId = (tenant as { id: string }).id

  const valid = rows.filter(r => r._errors.length === 0)
  const skipped = rows.length - valid.length

  const { data: imp, error: impErr } = await supabase
    .from('imports')
    .insert({
      tenant_id: tenantId,
      filename,
      imported_count: valid.length,
      skipped_count: skipped,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (impErr || !imp) throw new Error(impErr?.message ?? 'Failed to create import record')
  const importId = (imp as { id: string }).id

  if (valid.length > 0) {
    const inserts = valid.map(row => ({
      tenant_id: tenantId,
      import_id: importId,
      first_name: row.first_name.trim(),
      last_name: row.last_name?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      company: row.company?.trim() || null,
      address: row.address?.trim() || null,
      notes: row.notes?.trim() || null,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      source: row.source?.trim() || 'import',
      status: 'active' as const,
    }))

    const { error: insertErr } = await supabase.from('contacts').insert(inserts)
    if (insertErr) throw new Error(insertErr.message)
  }

  revalidatePath('/contacts')
  revalidatePath('/contacts/import')
  return { importId, imported: valid.length, skipped }
}

export async function listImports() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('imports')
    .select('id, filename, imported_count, skipped_count, created_at')
    .order('created_at', { ascending: false })
  return (data ?? []) as { id: string; filename: string; imported_count: number; skipped_count: number; created_at: string }[]
}

export async function undoImport(importId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('contacts')
    .update({ status: 'inactive' as const })
    .eq('import_id', importId)

  if (error) throw new Error(error.message)

  await supabase.from('imports').delete().eq('id', importId)

  revalidatePath('/contacts')
  revalidatePath('/contacts/import')
}
