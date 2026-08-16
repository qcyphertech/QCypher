/**
 * Phase 6 RLS adversarial tests.
 * Gate: ALL tests must pass before proceeding past 6.2.
 *
 * Covers:
 *  1. catalog_items — Tenant A cannot read Tenant B's items
 *  2. orders — Tenant A cannot read Tenant B's orders
 *  3. order_line_items — Tenant A cannot read Tenant B's line items
 *  4. rental_extensions — Tenant A cannot read Tenant B's extensions
 *  5. Composite FK — Tenant A cannot insert a line item referencing Tenant B's order
 *  6. Composite FK — Tenant A cannot insert a line item referencing Tenant B's catalog item
 *  7. Total trigger — order.total_amount matches sum of line items after inserts/deletes
 *  8. Snapshot pricing — changing catalog base_price does not affect existing line items
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const skip = !SUPABASE_URL || !SERVICE_KEY
const admin = skip ? null! : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ─── Test state ────────────────────────────────────────────────────
let tenantAId: string
let tenantBId: string
let userAId: string
let userBId: string
let userAAccessToken: string
let userBAccessToken: string

let itemAId: string   // Tenant A catalog item
let itemBId: string   // Tenant B catalog item
let orderAId: string  // Tenant A order
let orderBId: string  // Tenant B order
let lineAId: string   // Tenant A line item

const TEST_EMAIL_A = `phase6-a-${Date.now()}@test.invalid`
const TEST_EMAIL_B = `phase6-b-${Date.now()}@test.invalid`
const TEST_PASS    = 'TestPass123!'

// ─── Helpers ───────────────────────────────────────────────────────
async function clientFor(token: string) {
  return createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

// ─── Setup ─────────────────────────────────────────────────────────
beforeAll(async () => {
  if (skip) return
  // Create two tenants
  const { data: tA } = await admin.from('tenants').insert({ name: 'Phase6-TenantA', slug: `p6a-${Date.now()}` }).select('id').single()
  const { data: tB } = await admin.from('tenants').insert({ name: 'Phase6-TenantB', slug: `p6b-${Date.now()}` }).select('id').single()
  tenantAId = tA!.id
  tenantBId = tB!.id

  // Create two users
  const { data: uA } = await admin.auth.admin.createUser({ email: TEST_EMAIL_A, password: TEST_PASS, email_confirm: true, app_metadata: { tenant_id: tenantAId } })
  const { data: uB } = await admin.auth.admin.createUser({ email: TEST_EMAIL_B, password: TEST_PASS, email_confirm: true, app_metadata: { tenant_id: tenantBId } })
  userAId = uA.user!.id
  userBId = uB.user!.id

  // Sign in to get tokens
  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: sessA } = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL_A, password: TEST_PASS })
  const { data: sessB } = await anonClient.auth.signInWithPassword({ email: TEST_EMAIL_B, password: TEST_PASS })
  userAAccessToken = sessA.session!.access_token
  userBAccessToken = sessB.session!.access_token

  // Seed via service role (bypasses RLS)
  const { data: iA } = await admin.from('catalog_items').insert({
    tenant_id: tenantAId, name: 'Item A', item_type: 'service', base_price: 100, billing_unit: 'flat',
  }).select('id').single()
  const { data: iB } = await admin.from('catalog_items').insert({
    tenant_id: tenantBId, name: 'Item B', item_type: 'rental', base_price: 50, billing_unit: 'daily',
  }).select('id').single()
  itemAId = iA!.id
  itemBId = iB!.id

  const { data: oA } = await admin.from('orders').insert({ tenant_id: tenantAId }).select('id').single()
  const { data: oB } = await admin.from('orders').insert({ tenant_id: tenantBId }).select('id').single()
  orderAId = oA!.id
  orderBId = oB!.id

  // Seed a line item on Tenant A's order
  const { data: lA } = await admin.from('order_line_items').insert({
    tenant_id: tenantAId, order_id: orderAId, item_name_snapshot: 'Item A', quantity: 2, unit_price: 100, billing_unit_snapshot: 'flat',
  }).select('id').single()
  lineAId = lA!.id
})

afterAll(async () => {
  if (skip) return
  // Cleanup in dependency order
  await admin.from('rental_extensions').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('order_line_items').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('orders').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.from('catalog_items').delete().in('tenant_id', [tenantAId, tenantBId])
  await admin.auth.admin.deleteUser(userAId)
  await admin.auth.admin.deleteUser(userBId)
  await admin.from('tenants').delete().in('id', [tenantAId, tenantBId])
})

// ─── Tests ─────────────────────────────────────────────────────────
;(skip ? describe.skip : describe)('Phase 6 — RLS tenant isolation', () => {

  it('1. Tenant A cannot list Tenant B catalog items', async () => {
    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('catalog_items').select('id')
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    expect(ids).not.toContain(itemBId)
    expect(ids).toContain(itemAId)
  })

  it('2. Tenant A cannot fetch Tenant B catalog item by ID', async () => {
    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('catalog_items').select('id').eq('id', itemBId)
    expect(data ?? []).toHaveLength(0)
  })

  it('3. Tenant A cannot list Tenant B orders', async () => {
    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('orders').select('id')
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    expect(ids).not.toContain(orderBId)
  })

  it('4. Tenant A cannot fetch Tenant B order by ID', async () => {
    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('orders').select('id').eq('id', orderBId)
    expect(data ?? []).toHaveLength(0)
  })

  it('5. Tenant A cannot list Tenant B line items', async () => {
    // Seed a line item on B's order
    await admin.from('order_line_items').insert({
      tenant_id: tenantBId, order_id: orderBId, item_name_snapshot: 'Item B', quantity: 1, unit_price: 50, billing_unit_snapshot: 'flat',
    })
    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('order_line_items').select('tenant_id')
    const tenants = (data ?? []).map((r: { tenant_id: string }) => r.tenant_id)
    expect(tenants.every((t: string) => t === tenantAId)).toBe(true)
  })

  it('6. Composite FK: Tenant A cannot insert line item on Tenant B order', async () => {
    const client = await clientFor(userAAccessToken)
    const { error } = await client.from('order_line_items').insert({
      tenant_id: tenantAId,
      order_id: orderBId,          // B's order — composite FK must reject this
      item_name_snapshot: 'Attack',
      quantity: 1,
      unit_price: 1,
      billing_unit_snapshot: 'flat',
    })
    expect(error).not.toBeNull()
  })

  it('7. Composite FK: Tenant A cannot reference Tenant B catalog item', async () => {
    const client = await clientFor(userAAccessToken)
    const { error } = await client.from('order_line_items').insert({
      tenant_id: tenantAId,
      order_id: orderAId,
      catalog_item_id: itemBId,    // B's item — composite FK must reject this
      item_name_snapshot: 'Attack',
      quantity: 1,
      unit_price: 1,
      billing_unit_snapshot: 'flat',
    })
    expect(error).not.toBeNull()
  })

  it('8. Tenant A cannot read Tenant B rental_extensions', async () => {
    // Need a rental line item on B's order first
    const { data: rentalLine } = await admin.from('order_line_items').insert({
      tenant_id: tenantBId, order_id: orderBId, item_name_snapshot: 'Rental B',
      quantity: 1, unit_price: 50, billing_unit_snapshot: 'daily',
      rental_status: 'active', rental_start_date: '2025-01-01', rental_end_date: '2025-01-07',
    }).select('id').single()

    await admin.from('rental_extensions').insert({
      tenant_id: tenantBId,
      order_line_item_id: rentalLine!.id,
      previous_end_date: '2025-01-07',
      new_end_date: '2025-01-14',
    })

    const client = await clientFor(userAAccessToken)
    const { data } = await client.from('rental_extensions').select('tenant_id')
    const tenants = (data ?? []).map((r: { tenant_id: string }) => r.tenant_id)
    expect(tenants.every((t: string) => t === tenantAId)).toBe(true)
  })

  it('9. Total trigger: order.total_amount equals sum of line items', async () => {
    // lineAId was inserted with qty=2, price=100 → expect total=200
    const { data: order } = await admin.from('orders').select('total_amount').eq('id', orderAId).single()
    expect(Number(order!.total_amount)).toBe(200)
  })

  it('10. Total trigger: total updates after adding another line item', async () => {
    await admin.from('order_line_items').insert({
      tenant_id: tenantAId, order_id: orderAId,
      item_name_snapshot: 'Extra', quantity: 1, unit_price: 50, billing_unit_snapshot: 'flat',
    })
    const { data: order } = await admin.from('orders').select('total_amount').eq('id', orderAId).single()
    expect(Number(order!.total_amount)).toBe(250)
  })

  it('11. Snapshot pricing: changing catalog base_price does not affect existing line items', async () => {
    // Line item was seeded with unit_price=100. Change catalog item's base_price to 999.
    await admin.from('catalog_items').update({ base_price: 999 }).eq('id', itemAId)
    const { data: line } = await admin.from('order_line_items').select('unit_price').eq('id', lineAId).single()
    expect(Number(line!.unit_price)).toBe(100)  // snapshot unchanged
  })
})
