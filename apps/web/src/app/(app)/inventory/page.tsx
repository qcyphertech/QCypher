import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import type { Metadata } from 'next'
import { CatalogList } from '@/components/inventory/CatalogList'
import { NewCatalogItemButton } from '@/components/inventory/NewCatalogItemButton'
import { InventoryTabs } from '@/components/inventory/InventoryTabs'
import { getInventoryTier, type CatalogItem } from '@/lib/actions/catalog'
import { getRentals } from '@/lib/actions/catalog-rentals'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import { Package } from 'lucide-react'

export const metadata: Metadata = { title: 'Inventory' }

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenant_id = user ? await getTenantId(user.id, user.app_metadata).catch(() => null) : null

  const admin = createAdminClient()
  const [{ data: items }, { data: tenant }, tier] = await Promise.all([
    tenant_id
      ? admin.from('catalog_items').select('*').eq('tenant_id', tenant_id).order('name')
      : Promise.resolve({ data: [] as CatalogItem[] }),
    tenant_id
      ? admin.from('tenants').select('settings').eq('id', tenant_id).single()
      : Promise.resolve({ data: null }),
    tenant_id ? getInventoryTier().catch(() => 'lite' as const) : Promise.resolve('lite' as const),
  ])

  const settings: TenantSettings = { ...DEFAULT_SETTINGS, ...((tenant?.settings as Record<string, unknown>) ?? {}) }
  const rentals = tier === 'full' ? await getRentals().catch(() => []) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>Inventory</h1>
          <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {tier === 'full' ? 'Products, services & rentals you offer' : 'Products & services'}
          </p>
        </div>
        <NewCatalogItemButton tier={tier} toggles={settings} />
      </div>

      {(!items || items.length === 0) ? (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: 'hsl(var(--foreground))' }}>No inventory items yet</p>
            <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Add your first product or service</p>
          </div>
          <NewCatalogItemButton tier={tier} toggles={settings} />
        </div>
      ) : tier === 'full' ? (
        <InventoryTabs
          catalogList={<CatalogList items={items} tier={tier} toggles={settings} />}
          rentals={rentals}
        />
      ) : (
        <CatalogList items={items} tier={tier} toggles={settings} />
      )}
    </div>
  )
}
