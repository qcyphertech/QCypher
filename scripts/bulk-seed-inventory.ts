/**
 * Bulk-seeds catalog_items (and optionally catalog_rentals bookings) for
 * one tenant, for Phase 42 inventory performance testing (QA tests 24/25:
 * "Lite with 200 products", "Full with 100 products + 50 rentals").
 *
 * Every row it creates is tagged with a name prefix so it can be found and
 * torn down again with --cleanup — nothing it creates looks like real data,
 * and nothing else in the tenant's catalog is touched.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node scripts/bulk-seed-inventory.ts \
 *     --tenant <tenant-id> --goods 150 --services 50 [--rentals 0] [--bookings 0] [--cleanup]
 *
 * Examples:
 *   # Lite-tier load test — 200 items total
 *   npx ts-node scripts/bulk-seed-inventory.ts --tenant <id> --goods 150 --services 50
 *
 *   # Full-tier load test — 100 products + 50 rental-type items + 50 active bookings
 *   npx ts-node scripts/bulk-seed-inventory.ts --tenant <id> --goods 100 --rentals 50 --bookings 50
 *
 *   # Tear down whatever this script created for that tenant
 *   npx ts-node scripts/bulk-seed-inventory.ts --tenant <id> --cleanup
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const TAG = 'PerfTest' // every seeded row's name starts with this — the cleanup key

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i === -1 ? undefined : args[i + 1]
  }
  return {
    tenantId: get('--tenant'),
    goods: Number(get('--goods') ?? 0),
    services: Number(get('--services') ?? 0),
    rentals: Number(get('--rentals') ?? 0),
    bookings: Number(get('--bookings') ?? 0),
    cleanup: args.includes('--cleanup'),
  }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function insertInBatches<T>(table: string, rows: T[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await admin.from(table).insert(batch as never)
    if (error) throw new Error(`[${table}] batch ${i / batchSize + 1}: ${error.message}`)
    console.log(`  ${table}: inserted ${Math.min(i + batchSize, rows.length)}/${rows.length}`)
  }
}

async function cleanup(tenantId: string) {
  console.log(`Cleaning up ${TAG}-tagged rows for tenant ${tenantId}…`)

  const { data: items } = await admin.from('catalog_items').select('id').eq('tenant_id', tenantId).like('name', `${TAG} %`)
  const itemIds = (items ?? []).map(i => i.id)

  if (itemIds.length > 0) {
    const { error: rentalsErr } = await admin.from('catalog_rentals').delete().in('catalog_item_id', itemIds)
    if (rentalsErr) throw new Error(`cleanup catalog_rentals: ${rentalsErr.message}`)

    const { error: itemsErr } = await admin.from('catalog_items').delete().in('id', itemIds)
    if (itemsErr) throw new Error(`cleanup catalog_items: ${itemsErr.message}`)
  }

  console.log(`Deleted ${itemIds.length} catalog_items (and any of their rental bookings).`)
}

async function main() {
  const { tenantId, goods, services, rentals, bookings, cleanup: doCleanup } = parseArgs()

  if (!tenantId) {
    console.error('Usage: --tenant <tenant-id> [--goods N] [--services N] [--rentals N] [--bookings N] [--cleanup]')
    process.exit(1)
  }

  const { data: tenant } = await admin.from('tenants').select('id, name, inventory_tier').eq('id', tenantId).single()
  if (!tenant) {
    console.error(`No tenant found with id ${tenantId}`)
    process.exit(1)
  }
  console.log(`Tenant: ${tenant.name} (${tenant.inventory_tier} tier)`)

  if (doCleanup) {
    await cleanup(tenantId)
    return
  }

  if (goods + services + rentals === 0) {
    console.error('Nothing to seed — pass --goods/--services/--rentals, or --cleanup to tear down.')
    process.exit(1)
  }

  const itemRows: Record<string, unknown>[] = []
  for (let i = 1; i <= goods; i++) {
    itemRows.push({
      tenant_id: tenantId,
      name: `${TAG} Good ${i}`,
      item_type: 'good',
      base_price: (5 + (i % 50)).toFixed(2),
      billing_unit: 'flat',
      quantity: 10 + (i % 40),
    })
  }
  for (let i = 1; i <= services; i++) {
    itemRows.push({
      tenant_id: tenantId,
      name: `${TAG} Service ${i}`,
      item_type: 'service',
      base_price: (25 + (i % 100)).toFixed(2),
      billing_unit: 'hourly',
    })
  }
  for (let i = 1; i <= rentals; i++) {
    itemRows.push({
      tenant_id: tenantId,
      name: `${TAG} Rental ${i}`,
      item_type: 'rental',
      base_price: (20 + (i % 30)).toFixed(2),
      billing_unit: 'daily',
      quantity: 1 + (i % 5),
    })
  }

  console.log(`Seeding ${itemRows.length} catalog_items (${goods} goods, ${services} services, ${rentals} rentals)…`)
  await insertInBatches('catalog_items', itemRows)

  if (bookings > 0) {
    if (tenant.inventory_tier !== 'full') {
      console.warn('Tenant is not on the Full tier — bookings were still created for load-testing purposes, but the Rentals tab is only reachable once the tenant is flipped to Full.')
    }

    const { data: rentalItems } = await admin.from('catalog_items').select('id').eq('tenant_id', tenantId).eq('item_type', 'rental').like('name', `${TAG} %`)
    if (!rentalItems || rentalItems.length === 0) {
      console.warn('No rental-type items to book against — pass --rentals too if you want --bookings to do anything.')
    } else {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const rentedBy = users.find(u => u.app_metadata?.tenant_id === tenantId)?.id
      if (!rentedBy) {
        console.warn('No auth user found for this tenant — skipping bookings (catalog_rentals.rented_by is required).')
      } else {
        const bookingRows = Array.from({ length: bookings }, (_, i) => ({
          tenant_id: tenantId,
          catalog_item_id: rentalItems[i % rentalItems.length].id,
          rented_by: rentedBy,
          due_date: new Date(Date.now() + ((i % 14) - 7) * 24 * 60 * 60 * 1000).toISOString(), // spread across ±7 days, some overdue on purpose
        }))
        console.log(`Seeding ${bookingRows.length} catalog_rentals bookings…`)
        await insertInBatches('catalog_rentals', bookingRows)
      }
    }
  }

  console.log('Done. Run with --cleanup (same --tenant) to remove everything this created.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
