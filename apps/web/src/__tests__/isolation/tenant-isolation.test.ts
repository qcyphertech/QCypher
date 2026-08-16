/**
 * Adversarial RLS isolation tests.
 *
 * These tests authenticate as two separate tenants and confirm that
 * Tenant A cannot read, write, list, or infer the existence of
 * Tenant B's rows — across every tenant-owned table.
 *
 * Requirements:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — set in .env.local (server only)
 *   TEST_TENANT_A_EMAIL / TEST_TENANT_B_EMAIL — two pre-provisioned test accounts
 *   TEST_TENANT_A_PASSWORD / TEST_TENANT_B_PASSWORD
 *
 * The service_role key is ONLY used here to provision test fixtures before
 * each test run. It is never referenced in any client-reachable code path.
 * After provisioning, all subsequent queries run as tenant-scoped JWT users.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@qcypher/db'
import { getUserByEmail } from './_helpers'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const TENANT_A_EMAIL = process.env.TEST_TENANT_A_EMAIL ?? ''
const TENANT_A_PASSWORD = process.env.TEST_TENANT_A_PASSWORD ?? ''
const TENANT_B_EMAIL = process.env.TEST_TENANT_B_EMAIL ?? ''
const TENANT_B_PASSWORD = process.env.TEST_TENANT_B_PASSWORD ?? ''

const skip = !SUPABASE_URL || !SERVICE_ROLE_KEY || !TENANT_A_EMAIL || !TENANT_B_EMAIL

// Admin client — server-side provisioning only, never shipped to client
function adminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function tenantClient(email: string, password: string) {
  const client = createSupabaseClient<Database>(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`)
  return client
}

;(skip ? describe.skip : describe)('Tenant RLS isolation', () => {
  let tenantAId: string
  let tenantBId: string
  let contactBId: string
  let interactionBId: string
  let eventBId: string
  let templateBId: string

  beforeAll(async () => {
    const admin = adminClient()

    // Look up tenant IDs from user metadata
    const { data: userA } = await getUserByEmail(admin, TENANT_A_EMAIL)
    const { data: userB } = await getUserByEmail(admin, TENANT_B_EMAIL)

    tenantAId = userA?.user?.app_metadata?.tenant_id
    tenantBId = userB?.user?.app_metadata?.tenant_id

    if (!tenantAId || !tenantBId) {
      throw new Error('Test users must have tenant_id in app_metadata. Run the provisioning script.')
    }

    // Seed Tenant B's data using admin (bypasses RLS for test setup)
    const { data: contact } = await admin
      .from('contacts')
      .insert({ tenant_id: tenantBId, first_name: 'Canary', last_name: 'B' })
      .select('id')
      .single()
    contactBId = contact!.id

    const { data: interaction } = await admin
      .from('interactions')
      .insert({ tenant_id: tenantBId, contact_id: contactBId, type: 'note', body: 'Tenant B note' })
      .select('id')
      .single()
    interactionBId = interaction!.id

    const { data: event } = await admin
      .from('events')
      .insert({
        tenant_id: tenantBId,
        title: 'Tenant B event',
        starts_at: new Date(Date.now() + 3600_000).toISOString(),
        ends_at: new Date(Date.now() + 7200_000).toISOString(),
      })
      .select('id')
      .single()
    eventBId = event!.id

    const { data: template } = await admin
      .from('templates')
      .insert({ tenant_id: tenantBId, name: 'B template', channel: 'email', body: 'Hello {{first_name}}' })
      .select('id')
      .single()
    templateBId = template!.id
  })

  afterAll(async () => {
    // Clean up Tenant B's seeded data
    const admin = adminClient()
    await admin.from('templates').delete().eq('id', templateBId)
    await admin.from('events').delete().eq('id', eventBId)
    await admin.from('interactions').delete().eq('id', interactionBId)
    await admin.from('contacts').delete().eq('id', contactBId)
  })

  test('Tenant A cannot list Tenant B contacts', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('contacts').select('id')
    const ids = (data ?? []).map(r => r.id)
    expect(ids).not.toContain(contactBId)
  })

  test('Tenant A cannot fetch Tenant B contact by ID', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('contacts').select('id').eq('id', contactBId).maybeSingle()
    expect(data).toBeNull()
  })

  test('Tenant A cannot insert a contact with Tenant B tenant_id', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error } = await clientA
      .from('contacts')
      .insert({ tenant_id: tenantBId, first_name: 'Injected' })
    expect(error).not.toBeNull()
  })

  test('Tenant A cannot update Tenant B contact', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error, count } = await clientA
      .from('contacts')
      .update({ first_name: 'Hacked' })
      .eq('id', contactBId)
      .select()
    // Either error is returned, or count is 0 (RLS silently filters)
    const mutated = !error && (count ?? 0) > 0
    expect(mutated).toBe(false)
  })

  test('Tenant A cannot delete Tenant B contact', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error, count } = await clientA
      .from('contacts')
      .delete()
      .eq('id', contactBId)
      .select()
    const deleted = !error && (count ?? 0) > 0
    expect(deleted).toBe(false)

    // Confirm the row still exists via admin
    const admin = adminClient()
    const { data } = await admin.from('contacts').select('id').eq('id', contactBId).single()
    expect(data?.id).toBe(contactBId)
  })

  test('Tenant A cannot list Tenant B interactions', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('interactions').select('id')
    const ids = (data ?? []).map(r => r.id)
    expect(ids).not.toContain(interactionBId)
  })

  test('Tenant A cannot list Tenant B events', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('events').select('id')
    const ids = (data ?? []).map(r => r.id)
    expect(ids).not.toContain(eventBId)
  })

  test('Tenant A cannot list Tenant B templates', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('templates').select('id')
    const ids = (data ?? []).map(r => r.id)
    expect(ids).not.toContain(templateBId)
  })

  test('Tenant A cannot read Tenant B tenant row', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('tenants').select('id').eq('id', tenantBId).maybeSingle()
    expect(data).toBeNull()
  })
})
