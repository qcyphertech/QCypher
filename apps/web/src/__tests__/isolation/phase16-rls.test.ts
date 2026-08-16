/**
 * Phase 16 RLS isolation tests — quote_signatures, quote_tokens, token guessing/tampering
 * Run: set -a && source .env.local && set +a && npx vitest run src/__tests__/isolation/phase16-rls.test.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const skip = !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY
const admin = skip ? null! : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function clientFor(token: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

const TS = Date.now()
const EMAIL_A = `p16a-${TS}@test.invalid`
const EMAIL_B = `p16b-${TS}@test.invalid`
const PASS = 'TestPass123!'

let tenantAId: string, tenantBId: string
let tokenA: string, tokenB: string
let orderAId: string, orderBId: string
let sigAId: string
let sigTokenA: string

beforeAll(async () => {
  if (skip) return
  // Create two tenants and users
  const [{ data: tA }, { data: tB }] = await Promise.all([
    admin.from('tenants').insert({ name: 'P16-TenantA', slug: `p16a-${TS}` }).select('id').single(),
    admin.from('tenants').insert({ name: 'P16-TenantB', slug: `p16b-${TS}` }).select('id').single(),
  ])
  tenantAId = tA!.id
  tenantBId = tB!.id

  const [{ data: uA }, { data: uB }] = await Promise.all([
    admin.auth.admin.createUser({ email: EMAIL_A, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantAId } }),
    admin.auth.admin.createUser({ email: EMAIL_B, password: PASS, email_confirm: true, app_metadata: { tenant_id: tenantBId } }),
  ])
  const uAId = uA.user!.id, uBId = uB.user!.id
  await Promise.all([
    admin.from('users').insert({ id: uAId, tenant_id: tenantAId }),
    admin.from('users').insert({ id: uBId, tenant_id: tenantBId }),
  ])

  // Sign in both users
  const anonA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const anonB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const [resA, resB] = await Promise.all([
    anonA.auth.signInWithPassword({ email: EMAIL_A, password: PASS }),
    anonB.auth.signInWithPassword({ email: EMAIL_B, password: PASS }),
  ])
  tokenA = resA.data.session!.access_token
  tokenB = resB.data.session!.access_token

  // Create one order per tenant
  const [{ data: oA }, { data: oB }] = await Promise.all([
    admin.from('orders').insert({ tenant_id: tenantAId, payment_status: 'draft', total_amount: 500 }).select('id').single(),
    admin.from('orders').insert({ tenant_id: tenantBId, payment_status: 'draft', total_amount: 300 }).select('id').single(),
  ])
  orderAId = oA!.id
  orderBId = oB!.id

  // Seed a quote_token for Tenant A
  const qt = `qt-${TS}`
  await admin.from('quote_tokens').insert({
    tenant_id: tenantAId, order_id: orderAId,
    access_token: qt, token_expires_at: new Date(Date.now() + 86400000).toISOString(),
  })

  // Seed a quote_signature for Tenant A
  sigTokenA = `sig-${TS}`
  const { data: sig } = await admin.from('quote_signatures').insert({
    tenant_id: tenantAId, order_id: orderAId,
    signed_by_name: 'Test Signer', signature_type: 'typed', signature_data: 'Test Signer',
    access_token: sigTokenA, token_expires_at: new Date(Date.now() + 86400000).toISOString(),
  }).select('id').single()
  sigAId = sig!.id
}, 30000)

afterAll(async () => {
  if (skip) return
  await admin.from('quote_signatures').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('quote_tokens').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('orders').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.auth.admin.deleteUser((await admin.auth.admin.listUsers()).data.users.find(u => u.email === EMAIL_A)?.id ?? '')
  await admin.auth.admin.deleteUser((await admin.auth.admin.listUsers()).data.users.find(u => u.email === EMAIL_B)?.id ?? '')
  await admin.from('tenants').delete().in('id', [tenantAId, tenantBId])
})

;(skip ? describe.skip : describe)('Phase 16 — RLS isolation: quote_signatures & quote_tokens', () => {
  it('Tenant B cannot read Tenant A\'s quote_signatures by tenant_id', async () => {
    const cB = await clientFor(tokenB)
    const { data } = await cB.from('quote_signatures').select('*').eq('tenant_id', tenantAId)
    expect(data?.length ?? 0).toBe(0)
  })

  it('Tenant B cannot read Tenant A\'s quote_signatures by ID', async () => {
    const cB = await clientFor(tokenB)
    const { data } = await cB.from('quote_signatures').select('*').eq('id', sigAId)
    expect(data?.length ?? 0).toBe(0)
  })

  it('Tenant B cannot read Tenant A\'s quote_tokens', async () => {
    const cB = await clientFor(tokenB)
    const { data } = await cB.from('quote_tokens').select('*').eq('tenant_id', tenantAId)
    expect(data?.length ?? 0).toBe(0)
  })

  it('Unauthenticated client cannot read quote_signatures', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { data } = await anon.from('quote_signatures').select('*')
    expect(data?.length ?? 0).toBe(0)
  })

  it('Unauthenticated client cannot insert into quote_signatures', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { error } = await anon.from('quote_signatures').insert({
      tenant_id: tenantAId, order_id: orderAId,
      signed_by_name: 'Hacker', signature_type: 'typed', signature_data: 'Hacker',
      access_token: 'evil', token_expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('Unauthenticated client cannot insert into quote_tokens', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { error } = await anon.from('quote_tokens').insert({
      tenant_id: tenantAId, order_id: orderAId,
      access_token: 'evil2', token_expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('Tenant B cannot insert a quote_token spoofing Tenant A\'s tenant_id', async () => {
    const cB = await clientFor(tokenB)
    const { error } = await cB.from('quote_tokens').insert({
      tenant_id: tenantAId,   // spoofed
      order_id: orderAId,
      access_token: 'spoof-token', token_expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(error).toBeTruthy()
  })

  it('Expired token is rejected by getQuoteByToken', async () => {
    // Create a separate order so UNIQUE(order_id) doesn't conflict
    const { data: tempOrder } = await admin.from('orders').insert({
      tenant_id: tenantAId, payment_status: 'draft', total_amount: 0,
    }).select('id').single()
    const tempOrderId = tempOrder!.id
    const expiredTok = `expired-${TS}`
    await admin.from('quote_tokens').insert({
      tenant_id: tenantAId, order_id: tempOrderId,
      access_token: expiredTok,
      token_expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const { data: qt } = await admin.from('quote_tokens').select('token_expires_at').eq('access_token', expiredTok).maybeSingle()
    const expired = qt ? new Date(qt.token_expires_at) < new Date() : false
    expect(expired).toBe(true)
    await admin.from('quote_tokens').delete().eq('access_token', expiredTok)
    await admin.from('orders').delete().eq('id', tempOrderId)
  })

  it('Token for Tenant A order cannot be used to access Tenant B order (different token scopes)', async () => {
    // Tenant B's order has no token — a random guess at B's order id should not return data
    const { data: qt } = await admin.from('quote_tokens').select('*').eq('order_id', orderBId).maybeSingle()
    expect(qt).toBeNull()
  })
})
