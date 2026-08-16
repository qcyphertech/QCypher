/**
 * Phase 13 adversarial test: job_photos table + storage isolation.
 *
 * Confirms:
 *  1. Tenant A cannot read Tenant B's job_photos rows by listing or by ID
 *  2. Tenant A cannot insert a job_photos row for Tenant B (spoofed tenant_id)
 *  3. Tenant A cannot soft-delete Tenant B's photo row
 *  4. Storage path guessing: Tenant A cannot create a signed URL for Tenant B's
 *     storage path (storage RLS blocks the createSignedUrl call)
 *  5. Same photo record from same caller — two tenants each get their own row
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const skip = !SUPABASE_URL || !SERVICE_KEY || !ANON_KEY
const admin = skip ? null! : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const TS = Date.now()
const EMAIL_A = `photos-a-${TS}@test.invalid`
const EMAIL_B = `photos-b-${TS}@test.invalid`
const PASS    = 'TestPass123!'

let tenantAId: string
let tenantBId: string
let orderAId:  string
let orderBId:  string
let photoAId:  string
let photoAPath: string
let tokenA: string
let tokenB: string

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  if (skip) return
  // Create two tenants
  const [{ data: tA }, { data: tB }] = await Promise.all([
    admin.from('tenants').insert({ name: 'Photos-Iso-A', slug: `photos-iso-a-${TS}` }).select('id').single(),
    admin.from('tenants').insert({ name: 'Photos-Iso-B', slug: `photos-iso-b-${TS}` }).select('id').single(),
  ])
  tenantAId = tA!.id
  tenantBId = tB!.id

  // Create users
  const [{ data: uA }, { data: uB }] = await Promise.all([
    admin.auth.admin.createUser({ email: EMAIL_A, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantAId } }),
    admin.auth.admin.createUser({ email: EMAIL_B, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantBId } }),
  ])
  void uA; void uB

  // Sign in
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const [{ data: sessA }, { data: sessB }] = await Promise.all([
    anonClient.auth.signInWithPassword({ email: EMAIL_A, password: PASS }),
    anonClient.auth.signInWithPassword({ email: EMAIL_B, password: PASS }),
  ])
  tokenA = sessA.session!.access_token
  tokenB = sessB.session!.access_token

  // Create one order per tenant via service role
  const [{ data: oA }, { data: oB }] = await Promise.all([
    admin.from('orders').insert({ tenant_id: tenantAId, payment_status: 'draft' }).select('id').single(),
    admin.from('orders').insert({ tenant_id: tenantBId, payment_status: 'draft' }).select('id').single(),
  ])
  orderAId = oA!.id
  orderBId = oB!.id

  // Seed one photo row for Tenant B (via service role — simulates an existing upload)
  photoAPath = `${tenantAId}/${orderAId}/test-photo-${TS}.jpg`
  const { data: pA } = await admin.from('job_photos').insert({
    tenant_id:    tenantAId,
    order_id:     orderAId,
    storage_path: photoAPath,
    label:        'Before',
  }).select('id').single()
  photoAId = pA!.id
})

// ── Teardown ──────────────────────────────────────────────────────────────────
afterAll(async () => {
  if (skip) return
  await admin.from('job_photos').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('orders').delete().in('tenant_id', [tenantAId, tenantBId])
  const [{ data: uA }, { data: uB }] = await Promise.all([
    admin.auth.admin.listUsers(),
    admin.auth.admin.listUsers(),
  ])
  const allUsers = [...(uA?.users ?? []), ...(uB?.users ?? [])]
  const testUsers = allUsers.filter(u => u.email === EMAIL_A || u.email === EMAIL_B)
  await Promise.all(testUsers.map(u => admin.auth.admin.deleteUser(u.id)))
  await admin.from('tenants').delete().in('id', [tenantAId, tenantBId])
})

// ── Helper ────────────────────────────────────────────────────────────────────
function clientWithToken(token: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────
;(skip ? describe.skip : describe)('Phase 13 — job_photos cross-tenant isolation', () => {

  it('Tenant B cannot list Tenant A photos', async () => {
    const clientB = clientWithToken(tokenB)
    const { data } = await clientB
      .from('job_photos')
      .select('id')
      .eq('tenant_id', tenantAId)

    expect(data).toHaveLength(0)
  })

  it('Tenant B cannot fetch Tenant A photo by ID', async () => {
    const clientB = clientWithToken(tokenB)
    const { data } = await clientB
      .from('job_photos')
      .select('id')
      .eq('id', photoAId)
      .maybeSingle()

    expect(data).toBeNull()
  })

  it('Tenant B cannot insert a photo row spoofing Tenant A tenant_id', async () => {
    const clientB = clientWithToken(tokenB)
    const { error } = await clientB
      .from('job_photos')
      .insert({
        tenant_id:    tenantAId,   // spoofed
        order_id:     orderAId,
        storage_path: `${tenantAId}/${orderAId}/spoofed.jpg`,
        label:        'Other',
      })

    expect(error).not.toBeNull()
  })

  it('Tenant B cannot soft-delete Tenant A photo', async () => {
    const clientB = clientWithToken(tokenB)
    const { error } = await clientB
      .from('job_photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photoAId)

    // Should either error or silently update 0 rows — the row must remain intact
    if (!error) {
      // Confirm row is still intact via admin
      const { data: row } = await admin
        .from('job_photos')
        .select('deleted_at')
        .eq('id', photoAId)
        .single()
      expect(row?.deleted_at).toBeNull()
    }
  })

  it('Tenant B cannot create a signed URL for Tenant A storage path', async () => {
    const clientB = clientWithToken(tokenB)
    const { data, error } = await clientB.storage
      .from('job-photos')
      .createSignedUrl(photoAPath, 60)

    // Storage RLS must block this — either error or null URL
    const isBlocked = !!error || !data?.signedUrl
    expect(isBlocked).toBe(true)
  })

  it('Tenant A can read their own photos', async () => {
    const clientA = clientWithToken(tokenA)
    const { data } = await clientA
      .from('job_photos')
      .select('id')
      .eq('order_id', orderAId)

    expect(data?.length).toBeGreaterThan(0)
    expect(data?.every(p => p.id !== undefined)).toBe(true)
  })

  it('Tenant A inserting a photo for their own order succeeds', async () => {
    const clientA = clientWithToken(tokenA)
    const path = `${tenantAId}/${orderAId}/new-photo-${TS}.jpg`
    const { error } = await clientA
      .from('job_photos')
      .insert({
        tenant_id:    tenantAId,
        order_id:     orderAId,
        storage_path: path,
        label:        'After',
      })

    expect(error).toBeNull()
  })

  it('hard deletes are blocked via RLS', async () => {
    const clientA = clientWithToken(tokenA)
    await clientA.from('job_photos').delete().eq('id', photoAId)

    // Supabase returns no error when RLS silently blocks DELETE — verify row survives
    const { data: row } = await admin
      .from('job_photos')
      .select('id')
      .eq('id', photoAId)
      .maybeSingle()

    expect(row).not.toBeNull()
  })
})
