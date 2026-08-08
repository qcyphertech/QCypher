/**
 * GET /api/export/csv
 * Customer-facing data export (Phase 25) — contacts, with optional detail
 * fields, notes (interactions of type 'note'), and calendar event counts,
 * as CSV. Admin/owner only. Excludes audit logs and soft-deleted records.
 *
 * Query params (all default to included when omitted, for backward-compat
 * with a plain /api/export/csv link): details=0, notes=0, events=0 to
 * exclude that category.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/actions/audit'

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only account admins can export account data' }, { status: 403 })
  }

  let tenantId: string
  try {
    tenantId = await getTenantId(user.id, user.app_metadata)
  } catch {
    return NextResponse.json({ error: 'No tenant configured for this account' }, { status: 400 })
  }

  const params = request.nextUrl.searchParams
  const includeDetails = params.get('details') !== '0'
  const includeNotes = params.get('notes') !== '0'
  const includeEvents = params.get('events') !== '0'

  const [{ data: contacts }, { data: interactions }, { data: events }] = await Promise.all([
    admin
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company, address, notes, tags, source, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    includeNotes
      ? admin.from('interactions').select('contact_id, body').eq('tenant_id', tenantId).eq('type', 'note').order('occurred_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    includeEvents
      ? admin.from('events').select('contact_id').eq('tenant_id', tenantId)
      : Promise.resolve({ data: [] }),
  ])

  const notesByContact = new Map<string, string[]>()
  for (const row of (interactions ?? []) as { contact_id: string; body: string }[]) {
    const list = notesByContact.get(row.contact_id) ?? []
    list.push(row.body)
    notesByContact.set(row.contact_id, list)
  }

  const eventCountByContact = new Map<string, number>()
  for (const row of (events ?? []) as { contact_id: string | null }[]) {
    if (!row.contact_id) continue
    eventCountByContact.set(row.contact_id, (eventCountByContact.get(row.contact_id) ?? 0) + 1)
  }

  const headers = ['id', 'first_name', 'last_name']
  if (includeDetails) headers.push('email', 'phone', 'company', 'address', 'tags', 'source', 'status', 'created_at')
  if (includeNotes) headers.push('notes')
  if (includeEvents) headers.push('event_count')

  type ContactRow = {
    id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null
    company: string | null; address: string | null; notes: string | null; tags: string[] | null
    source: string | null; status: string; created_at: string
  }
  const rows = ((contacts ?? []) as ContactRow[]).map(c => {
    const row: (string | number)[] = [c.id, c.first_name, c.last_name ?? '']
    if (includeDetails) row.push(c.email ?? '', c.phone ?? '', c.company ?? '', c.address ?? '', (c.tags ?? []).join('; '), c.source ?? '', c.status, c.created_at)
    if (includeNotes) row.push((notesByContact.get(c.id) ?? []).join(' | '))
    if (includeEvents) row.push(eventCountByContact.get(c.id) ?? 0)
    return row
  })

  const csv = [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n')

  await logAudit({
    action: 'data_exported',
    resource_type: 'account',
    resource_id: tenantId,
    details: { contact_count: rows.length, includeDetails, includeNotes, includeEvents },
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="qcypher_export_${tenantId}_${timestamp}.csv"`,
    },
  })
}
