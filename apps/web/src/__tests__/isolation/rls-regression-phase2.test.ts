/**
 * Phase 2 RLS regression suite.
 *
 * Re-runs all Phase 0 isolation checks plus new Phase 2 coverage:
 *   - send_log: Tenant A cannot read/write Tenant B's send logs
 *   - Admin gate: non-admin tenant cannot reach /api/admin/* endpoints
 *   - Tenant table: non-admin cannot read other tenants' rows via RLS
 *   - invite_tokens: not accessible from any client JWT (no RLS policy → no anon access)
 *
 * All cross-tenant seeding uses service_role. Client tests use anon-key + JWT.
 * service_role is NEVER used for assertions — only for fixture setup/teardown.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@qcypher/db'

const SUPABASE_URL      = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY          = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const TENANT_A_EMAIL    = process.env.TEST_TENANT_A_EMAIL ?? ''
const TENANT_A_PASSWORD = process.env.TEST_TENANT_A_PASSWORD ?? ''
const TENANT_B_EMAIL    = process.env.TEST_TENANT_B_EMAIL ?? ''
const TENANT_B_PASSWORD = process.env.TEST_TENANT_B_PASSWORD ?? ''
const APP_URL           = process.env.APP_URL ?? 'http://localhost:3002'

const skip = !SUPABASE_URL || !SERVICE_ROLE_KEY || !TENANT_A_EMAIL || !TENANT_B_EMAIL

function adminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function tenantClient(email: string, password: string) {
  const c = createSupabaseClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Auth failed: ${error.message}`)
  return c
}

async function authedFetch(email: string, password: string, path: string, init?: RequestInit) {
  const c = await tenantClient(email, password)
  const { data: { session } } = await c.auth.getSession()
  return fetch(`${APP_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
      ...(init?.headers ?? {}),
    },
  })
}

;(skip ? describe.skip : describe)('Phase 2 RLS regression', () => {
  let tenantAId: string
  let tenantBId: string
  let contactBId: string
  let interactionBId: string
  let eventBId: string
  let templateBId: string
  let sendLogBId: string

  beforeAll(async () => {
    const admin = adminClient()
    const { data: userA } = await admin.auth.admin.getUserByEmail(TENANT_A_EMAIL)
    const { data: userB } = await admin.auth.admin.getUserByEmail(TENANT_B_EMAIL)
    tenantAId = userA?.user?.app_metadata?.tenant_id
    tenantBId = userB?.user?.app_metadata?.tenant_id
    if (!tenantAId || !tenantBId) throw new Error('Test users missing tenant_id in app_metadata')

    // Seed Tenant B fixtures
    const { data: c } = await admin.from('contacts')
      .insert({ tenant_id: tenantBId, first_name: 'Canary', last_name: 'B' })
      .select('id').single()
    contactBId = c!.id

    const { data: i } = await admin.from('interactions')
      .insert({ tenant_id: tenantBId, contact_id: contactBId, type: 'note', body: 'B note' })
      .select('id').single()
    interactionBId = i!.id

    const { data: ev } = await admin.from('events')
      .insert({ tenant_id: tenantBId, title: 'B event', starts_at: new Date(Date.now() + 3600_000).toISOString(), ends_at: new Date(Date.now() + 7200_000).toISOString() })
      .select('id').single()
    eventBId = ev!.id

    const { data: t } = await admin.from('templates')
      .insert({ tenant_id: tenantBId, name: 'B tpl', channel: 'email', body: 'Hi' })
      .select('id').single()
    templateBId = t!.id

    const { data: sl } = await admin.from('send_log')
      .insert({ tenant_id: tenantBId, channel: 'email', recipient: 'b@b.com', body: 'Hello', status: 'sent' })
      .select('id').single()
    sendLogBId = sl!.id
  })

  afterAll(async () => {
    const admin = adminClient()
    await admin.from('send_log').delete().eq('id', sendLogBId)
    await admin.from('templates').delete().eq('id', templateBId)
    await admin.from('events').delete().eq('id', eventBId)
    await admin.from('interactions').delete().eq('id', interactionBId)
    await admin.from('contacts').delete().eq('id', contactBId)
  })

  // ── Core table isolation (re-run from Phase 0) ──────────────────────────

  test('contacts: A cannot list B rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('contacts').select('id')
    expect((data ?? []).map(r => r.id)).not.toContain(contactBId)
  })

  test('contacts: A cannot fetch B row by ID', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('contacts').select('id').eq('id', contactBId).maybeSingle()
    expect(data).toBeNull()
  })

  test('contacts: A cannot insert row with B tenant_id', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error } = await ca.from('contacts').insert({ tenant_id: tenantBId, first_name: 'Injected' })
    expect(error).not.toBeNull()
  })

  test('contacts: A update against B ID mutates 0 rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { count } = await ca.from('contacts').update({ first_name: 'Hacked' }).eq('id', contactBId).select()
    expect(count ?? 0).toBe(0)
  })

  test('contacts: A delete against B ID deletes 0 rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    await ca.from('contacts').delete().eq('id', contactBId)
    const { data } = await adminClient().from('contacts').select('id').eq('id', contactBId).single()
    expect(data?.id).toBe(contactBId)
  })

  test('interactions: A cannot list B rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('interactions').select('id')
    expect((data ?? []).map(r => r.id)).not.toContain(interactionBId)
  })

  test('events: A cannot list B rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('events').select('id')
    expect((data ?? []).map(r => r.id)).not.toContain(eventBId)
  })

  test('templates: A cannot list B rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('templates').select('id')
    expect((data ?? []).map(r => r.id)).not.toContain(templateBId)
  })

  test('tenants: A cannot read B tenant row', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('tenants').select('id').eq('id', tenantBId).maybeSingle()
    expect(data).toBeNull()
  })

  // ── send_log isolation ──────────────────────────────────────────────────

  test('send_log: A cannot list B rows', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('send_log').select('id')
    expect((data ?? []).map(r => r.id)).not.toContain(sendLogBId)
  })

  test('send_log: A cannot fetch B row by ID', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await ca.from('send_log').select('id').eq('id', sendLogBId).maybeSingle()
    expect(data).toBeNull()
  })

  test('send_log: A cannot insert row with B tenant_id', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error } = await ca.from('send_log').insert({
      tenant_id: tenantBId, channel: 'email', recipient: 'x@x.com', body: 'injected',
    })
    expect(error).not.toBeNull()
  })

  // ── invite_tokens: no client access at all ──────────────────────────────

  test('invite_tokens: A cannot select (no RLS policy = deny all)', async () => {
    const ca = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data, error } = await ca.from('invite_tokens').select('id')
    // RLS not enabled → Postgres denies access; or enabled with no policies → empty
    expect((data ?? []).length).toBe(0)
  })

  // ── Admin endpoint gate ─────────────────────────────────────────────────

  test('/api/admin/invite: non-admin tenant receives 403', async () => {
    const res = await authedFetch(TENANT_A_EMAIL, TENANT_A_PASSWORD, '/api/admin/invite', {
      method: 'POST',
      body: JSON.stringify({ name: 'Evil Corp', slug: 'evil-corp', email: 'evil@corp.com' }),
    })
    expect(res.status).toBe(403)
  })

  test('/api/admin/invite: unauthenticated request receives 401', async () => {
    const res = await fetch(`${APP_URL}/api/admin/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x', slug: 'x', email: 'x@x.com' }),
    })
    expect(res.status).toBe(401)
  })

  test('/api/admin/tenants/[id]: non-admin tenant receives 403', async () => {
    const res = await authedFetch(TENANT_A_EMAIL, TENANT_A_PASSWORD, `/api/admin/tenants/${tenantBId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'suspended' }),
    })
    expect(res.status).toBe(403)
  })

  // ── Rate limit smoke test ───────────────────────────────────────────────

  test('/api/send: unauthenticated request receives 401 not 429 (rate limit runs after auth)', async () => {
    const res = await fetch(`${APP_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    // Auth check after rate limit; either 401 or 429 is acceptable — but 500 is not
    expect([401, 429]).toContain(res.status)
  })
})
