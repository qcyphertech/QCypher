/**
 * Phase 2.5 RLS isolation tests — auth paths.
 *
 * Confirms that a staff user logged in under Tenant A cannot access Tenant B's
 * data through any auth-linked query path (by ID or by listing).
 *
 * Requirements (same as tenant-isolation.test.ts):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   TEST_TENANT_A_EMAIL / TEST_TENANT_A_PASSWORD
 *   TEST_TENANT_B_EMAIL / TEST_TENANT_B_PASSWORD
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

;(skip ? describe.skip : describe)('Auth-path RLS isolation (Phase 2.5)', () => {
  let tenantAId: string
  let tenantBId: string
  let contactBId: string

  beforeAll(async () => {
    const admin = adminClient()

    const { data: userA } = await getUserByEmail(admin, TENANT_A_EMAIL)
    const { data: userB } = await getUserByEmail(admin, TENANT_B_EMAIL)

    tenantAId = userA?.user?.app_metadata?.tenant_id
    tenantBId = userB?.user?.app_metadata?.tenant_id

    if (!tenantAId || !tenantBId) {
      throw new Error('Test users missing tenant_id in app_metadata — run provision-tenant.ts first')
    }

    // Seed a contact under Tenant B
    const { data: contact } = await admin
      .from('contacts')
      .insert({ tenant_id: tenantBId, first_name: 'Auth', last_name: 'TestB', email: 'auth-b@test.invalid' })
      .select('id')
      .single()
    contactBId = contact!.id
  })

  afterAll(async () => {
    const admin = adminClient()
    if (contactBId) await admin.from('contacts').delete().eq('id', contactBId)
  })

  it('Tenant A cannot list contacts that belong to Tenant B', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('contacts').select('id').eq('tenant_id', tenantBId)
    expect(data).toHaveLength(0)
  })

  it('Tenant A cannot fetch Tenant B contact by ID', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data } = await clientA.from('contacts').select('id').eq('id', contactBId).single()
    expect(data).toBeNull()
  })

  it('Tenant A cannot insert a contact into Tenant B tenant_id', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error } = await clientA.from('contacts').insert({
      tenant_id: tenantBId,
      first_name: 'Injected',
      last_name: 'Row',
      email: 'injected@test.invalid',
    })
    expect(error).not.toBeNull()
  })

  it('Tenant A cannot update Tenant B contact', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { error } = await clientA
      .from('contacts')
      .update({ first_name: 'Hacked' })
      .eq('id', contactBId)
    // Either an error or zero rows affected — both are acceptable
    if (!error) {
      const admin = adminClient()
      const { data } = await admin.from('contacts').select('first_name').eq('id', contactBId).single()
      expect(data?.first_name).toBe('Auth')
    }
  })

  it('Tenant A cannot delete Tenant B contact', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    await clientA.from('contacts').delete().eq('id', contactBId)
    // Verify the row still exists
    const admin = adminClient()
    const { data } = await admin.from('contacts').select('id').eq('id', contactBId).single()
    expect(data).not.toBeNull()
  })

  it('Password login produces a session scoped to the correct tenant_id', async () => {
    const clientA = await tenantClient(TENANT_A_EMAIL, TENANT_A_PASSWORD)
    const { data: { user } } = await clientA.auth.getUser()
    expect(user?.app_metadata?.tenant_id).toBe(tenantAId)
  })
})
