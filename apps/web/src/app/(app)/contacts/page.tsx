import { createClient } from '@/lib/supabase/server'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner'
import Link from 'next/link'
import type { Metadata } from 'next'
import { UserPlus, Upload } from 'lucide-react'

export const metadata: Metadata = { title: 'Contacts' }

export default async function ContactsPage() {
  const supabase = await createClient()

  // Phase 21 RBAC — read-only accounts can browse contacts but never
  // create/import/edit/delete them (also enforced server-side via RLS,
  // see packages/db/migrations/00020_phase21_rbac.sql).
  const { data: { user } } = await supabase.auth.getUser()
  const isReadOnly = user?.app_metadata?.role === 'read_only'

  const [{ data: contacts, error }, { data: locations }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, tags, status, created_at, location_id, tenant_locations(location_name)')
      .order('created_at', { ascending: false }),
    supabase.from('tenant_locations').select('id, location_name').eq('is_active', true).order('location_name'),
  ])
  if (error) throw error

  const total = contacts?.length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Contacts
          </h1>
          <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginTop: '3px' }}>
            {total} {total === 1 ? 'contact' : 'contacts'} total
          </p>
        </div>

        {!isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/contacts/import"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                textDecoration: 'none',
                transition: 'background .15s',
              }}
            >
              <Upload style={{ width: '14px', height: '14px' }} />
              Import CSV
            </Link>
            <Link
              href="/contacts/new"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                background: 'linear-gradient(135deg, #1a3070, #4a9db5)',
                color: '#fff',
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(74,157,181,0.3)',
                transition: 'opacity .15s',
              }}
            >
              <UserPlus style={{ width: '14px', height: '14px' }} />
              Add contact
            </Link>
          </div>
        )}
      </div>

      {isReadOnly && <ReadOnlyBanner />}

      <ContactsTable contacts={(contacts ?? []) as never} locations={locations ?? []} />
    </div>
  )
}
