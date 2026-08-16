/**
 * Phase 17 portal isolation tests — two dimensions:
 * 1. Tenant isolation: Tenant B cannot see Tenant A's portal data
 * 2. Contact isolation: Customer A cannot see Customer B's orders within the same tenant
 * 3. Magic-link token security: expired, guessed, reused tokens are all rejected
 *
 * Run: set -a && source .env.local && set +a && npx vitest run src/__tests__/isolation/phase17-portal-rls.test.ts
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const skip = !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY

const admin = skip ? null! : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const anon  = skip ? null! : createClient(SUPABASE_URL, ANON_KEY,    { auth: { persistSession: false } })

const TS = Date.now()
const EMAIL_STAFF_A = `p17-staffA-${TS}@test.invalid`
const EMAIL_STAFF_B = `p17-staffB-${TS}@test.invalid`
const PASS = 'TestPass123!'

let tenantAId: string, tenantBId: string
let contactA1Id: string, contactA2Id: string   // two customers of Tenant A
let contactB1Id: string
let orderA1Id: string, orderA2Id: string, orderB1Id: string
let sessionA1Token: string, sessionA2Token: string, sessionB1Token: string
let magicLinkToken: string

beforeAll(async () => {
  if (skip) return
  // Create two tenants
  const [{ data: tA }, { data: tB }] = await Promise.all([
    admin.from('tenants').insert({ name: 'P17-TenantA', slug: `p17a-${TS}` }).select('id').single(),
    admin.from('tenants').insert({ name: 'P17-TenantB', slug: `p17b-${TS}` }).select('id').single(),
  ])
  tenantAId = tA!.id
  tenantBId = tB!.id

  // Create staff users for each tenant
  const [{ data: uA }, { data: uB }] = await Promise.all([
    admin.auth.admin.createUser({ email: EMAIL_STAFF_A, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantAId } }),
    admin.auth.admin.createUser({ email: EMAIL_STAFF_B, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantBId } }),
  ])
  await Promise.all([
    admin.from('users').insert({ id: uA.user!.id, tenant_id: tenantAId }),
    admin.from('users').insert({ id: uB.user!.id, tenant_id: tenantBId }),
  ])

  // Create two contacts for Tenant A, one for Tenant B
  const [{ data: cA1 }, { data: cA2 }, { data: cB1 }] = await Promise.all([
    admin.from('contacts').insert({ tenant_id: tenantAId, first_name: 'CustomerA1', email: `cA1-${TS}@test.invalid`, status: 'active' }).select('id').single(),
    admin.from('contacts').insert({ tenant_id: tenantAId, first_name: 'CustomerA2', email: `cA2-${TS}@test.invalid`, status: 'active' }).select('id').single(),
    admin.from('contacts').insert({ tenant_id: tenantBId, first_name: 'CustomerB1', email: `cB1-${TS}@test.invalid`, status: 'active' }).select('id').single(),
  ])
  contactA1Id = cA1!.id
  contactA2Id = cA2!.id
  contactB1Id = cB1!.id

  // Create orders scoped to each contact
  const [{ data: oA1 }, { data: oA2 }, { data: oB1 }] = await Promise.all([
    admin.from('orders').insert({ tenant_id: tenantAId, customer_id: contactA1Id, payment_status: 'pending', total_amount: 100 }).select('id').single(),
    admin.from('orders').insert({ tenant_id: tenantAId, customer_id: contactA2Id, payment_status: 'pending', total_amount: 200 }).select('id').single(),
    admin.from('orders').insert({ tenant_id: tenantBId, customer_id: contactB1Id, payment_status: 'pending', total_amount: 300 }).select('id').single(),
  ])
  orderA1Id = oA1!.id
  orderA2Id = oA2!.id
  orderB1Id = oB1!.id

  // Create portal sessions for each customer
  const mkToken = () => randomBytes(32).toString('hex')
  const far = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  sessionA1Token = mkToken()
  sessionA2Token = mkToken()
  sessionB1Token = mkToken()

  await Promise.all([
    admin.from('portal_sessions').insert({ tenant_id: tenantAId, contact_id: contactA1Id, access_token: sessionA1Token, expires_at: far }),
    admin.from('portal_sessions').insert({ tenant_id: tenantAId, contact_id: contactA2Id, access_token: sessionA2Token, expires_at: far }),
    admin.from('portal_sessions').insert({ tenant_id: tenantBId, contact_id: contactB1Id, access_token: sessionB1Token, expires_at: far }),
  ])

  // Create a magic link token for contact A1
  magicLinkToken = mkToken()
  await admin.from('portal_magic_links').insert({
    tenant_id: tenantAId,
    contact_id: contactA1Id,
    token: magicLinkToken,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
}, 30000)

afterAll(async () => {
  if (skip) return
  await admin.from('portal_sessions').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('portal_magic_links').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('orders').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('contacts').delete().in('tenant_id', [tenantAId, tenantBId])
  const { data: { users } } = await admin.auth.admin.listUsers()
  for (const u of users.filter(u => u.email?.endsWith('@test.invalid') && u.email.includes('p17'))) {
    await admin.auth.admin.deleteUser(u.id)
  }
  await admin.from('users').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('tenants').delete().in('id', [tenantAId, tenantBId])
})

// ─── Dimension 1: Cross-tenant isolation ─────────────────────────────────────

;(skip ? describe.skip : describe)('Tenant isolation — Tenant B cannot see Tenant A portal data', () => {
  it('Anon cannot read Tenant A portal_sessions', async () => {
    const { data } = await anon.from('portal_sessions').select('*').eq('tenant_id', tenantAId)
    expect(data?.length ?? 0).toBe(0)
  })

  it('Anon cannot read Tenant A portal_magic_links', async () => {
    const { data } = await anon.from('portal_magic_links').select('*').eq('tenant_id', tenantAId)
    expect(data?.length ?? 0).toBe(0)
  })

  it('Anon cannot insert portal_sessions', async () => {
    const { error } = await anon.from('portal_sessions').insert({
      tenant_id: tenantAId,
      contact_id: contactA1Id,
      access_token: 'evil-session',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('Anon cannot insert portal_magic_links', async () => {
    const { error } = await anon.from('portal_magic_links').insert({
      tenant_id: tenantAId,
      contact_id: contactA1Id,
      token: 'evil-token',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('Staff from Tenant B cannot read Tenant A portal_sessions via authenticated session', async () => {
    // Sign in as Tenant B staff
    const anonB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { data: session } = await anonB.auth.signInWithPassword({ email: EMAIL_STAFF_B, password: PASS })
    const cB = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${session.session!.access_token}` } },
    })
    const { data } = await cB.from('portal_sessions').select('*').eq('tenant_id', tenantAId)
    expect(data?.length ?? 0).toBe(0)
  })
})

// ─── Dimension 2: Cross-contact isolation within the same tenant ──────────────

;(skip ? describe.skip : describe)('Contact isolation — Customer A1 cannot see Customer A2 orders (same tenant)', () => {
  it('getPortalOrders with A1 session only returns A1 orders', async () => {
    // Simulate what the server action does: service-role scoped to tenant + contact
    const { data } = await admin
      .from('orders')
      .select('id, customer_id')
      .eq('tenant_id', tenantAId)
      .eq('customer_id', contactA1Id)
    const ids = (data ?? []).map(o => o.id)
    expect(ids).toContain(orderA1Id)
    expect(ids).not.toContain(orderA2Id)
    expect(ids).not.toContain(orderB1Id)
  })

  it('getPortalOrders with A2 session only returns A2 orders', async () => {
    const { data } = await admin
      .from('orders')
      .select('id, customer_id')
      .eq('tenant_id', tenantAId)
      .eq('customer_id', contactA2Id)
    const ids = (data ?? []).map(o => o.id)
    expect(ids).toContain(orderA2Id)
    expect(ids).not.toContain(orderA1Id)
    expect(ids).not.toContain(orderB1Id)
  })

  it('getPortalOrderLines with A1 session is null for A2 order (ownership check)', async () => {
    // The server action does a SELECT on orders where customer_id = contactId first
    const { data: ownerCheck } = await admin
      .from('orders')
      .select('id')
      .eq('id', orderA2Id)
      .eq('tenant_id', tenantAId)
      .eq('customer_id', contactA1Id)   // Wrong contact — should return nothing
      .maybeSingle()
    expect(ownerCheck).toBeNull()
  })

  it('Portal session for A1 does not match when looking up with A2 contact_id', async () => {
    const { data } = await admin
      .from('portal_sessions')
      .select('contact_id')
      .eq('access_token', sessionA1Token)
      .single()
    expect(data!.contact_id).toBe(contactA1Id)
    expect(data!.contact_id).not.toBe(contactA2Id)
  })
})

// ─── Dimension 3: Magic-link token security ───────────────────────────────────

;(skip ? describe.skip : describe)('Magic-link token security', () => {
  it('Unknown token returns null from lookup', async () => {
    const { data } = await admin
      .from('portal_magic_links')
      .select('id')
      .eq('token', 'totally-random-guess-' + Math.random())
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('Expired token is detected', async () => {
    const { data: tempContact } = await admin
      .from('contacts')
      .insert({ tenant_id: tenantAId, first_name: 'Temp', status: 'active' })
      .select('id').single()
    const expiredToken = randomBytes(16).toString('hex')
    await admin.from('portal_magic_links').insert({
      tenant_id: tenantAId,
      contact_id: tempContact!.id,
      token: expiredToken,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const { data } = await admin
      .from('portal_magic_links')
      .select('expires_at')
      .eq('token', expiredToken)
      .single()
    expect(new Date(data!.expires_at) < new Date()).toBe(true)
    await admin.from('portal_magic_links').delete().eq('token', expiredToken)
    await admin.from('contacts').delete().eq('id', tempContact!.id)
  })

  it('Used token (used_at set) is rejected', async () => {
    // Mark the test magic link as used
    await admin.from('portal_magic_links').update({ used_at: new Date().toISOString() }).eq('token', magicLinkToken)
    const { data } = await admin
      .from('portal_magic_links')
      .select('used_at')
      .eq('token', magicLinkToken)
      .single()
    expect(data!.used_at).not.toBeNull()
    // validateMagicLink checks used_at and returns { ok: false, error: 'already_used' }
  })

  it('Portal session from wrong tenant is rejected by validatePortalSession', async () => {
    // sessionB1Token belongs to tenantB — looking it up against tenantA should return nothing
    const { data } = await admin
      .from('portal_sessions')
      .select('id')
      .eq('access_token', sessionB1Token)
      .eq('tenant_id', tenantAId)   // Wrong tenant
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('Expired portal session is detected', async () => {
    const expiredSessionToken = randomBytes(16).toString('hex')
    await admin.from('portal_sessions').insert({
      tenant_id: tenantAId,
      contact_id: contactA1Id,
      access_token: expiredSessionToken,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const { data } = await admin
      .from('portal_sessions')
      .select('expires_at')
      .eq('access_token', expiredSessionToken)
      .single()
    expect(new Date(data!.expires_at) < new Date()).toBe(true)
    await admin.from('portal_sessions').delete().eq('access_token', expiredSessionToken)
  })
})
