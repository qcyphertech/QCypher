'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, Mail, Building2, MapPin, Tag, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'
import { InteractionTimeline } from '@/components/interactions/InteractionTimeline'
import { AddInteractionForm } from '@/components/interactions/AddInteractionForm'
import { QuickSendButton } from '@/components/templates/QuickSendButton'
import { SendPortalLinkButton } from '@/components/portal/SendPortalLinkButton'
import { PaymentRequestSection } from '@/components/contacts/PaymentRequestSection'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { Tables } from '@/types/database'
import { cn } from '@/lib/utils'

type Contact = Tables<'contacts'>
type Interaction = Tables<'interactions'>
type Order = { id: string; total_amount: number; payment_status: string; notes: string | null; created_at: string }

const STATUS_COLOR: Record<Contact['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  inactive: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
}

function initials(c: Contact) {
  return `${c.first_name[0]}${c.last_name?.[0] ?? ''}`.toUpperCase()
}

export function ContactDetail({ contact, interactions, orders = [], tenantId, tenantSlug, businessName }: {
  contact: Contact
  interactions: Interaction[]
  orders?: Order[]
  tenantId: string
  tenantSlug: string
  businessName: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const { canEdit } = useUserRole() // Phase 21 RBAC — hides edit/delete for read-only

  async function handleDelete() {
    if (!confirm(`Delete ${contact.first_name}? This cannot be undone.`)) return
    await supabase.from('contacts').delete().eq('id', contact.id)
    logAudit({ action: 'contact_deleted', resource_type: 'contact', resource_id: contact.id, resource_name: `${contact.first_name} ${contact.last_name ?? ''}`.trim() })
    router.push('/contacts')
    router.refresh()
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header card */}
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-soft border border-[hsl(var(--border))] p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-xl font-bold flex-shrink-0">
            {initials(contact)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">{contact.first_name} {contact.last_name}</h1>
              <span className={cn('text-[15px] px-2 py-0.5 rounded-full font-medium capitalize', STATUS_COLOR[contact.status])}>
                {contact.status}
              </span>
            </div>
            {contact.company && <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">{contact.company}</p>}
          </div>
          {canEdit && (
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/contacts/${contact.id}/edit`} className="p-2 rounded-xl hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors">
                <Pencil className="w-4 h-4" />
              </Link>
              <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Contact fields */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contact.email && (
            <InfoRow icon={<Mail className="w-3.5 h-3.5" />}>
              <a href={`mailto:${contact.email}`} className="hover:text-accent transition-colors">{contact.email}</a>
            </InfoRow>
          )}
          {contact.phone && (
            <InfoRow icon={<Phone className="w-3.5 h-3.5" />}>
              <a href={`tel:${contact.phone}`} className="hover:text-accent transition-colors">{contact.phone}</a>
            </InfoRow>
          )}
          {contact.address && (
            <InfoRow icon={<MapPin className="w-3.5 h-3.5" />}>{contact.address}</InfoRow>
          )}
          {contact.source && (
            <InfoRow icon={<Building2 className="w-3.5 h-3.5" />}>Source: {contact.source}</InfoRow>
          )}
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            {contact.tags.map(tag => (
              <span key={tag} className="text-[15px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{tag}</span>
            ))}
          </div>
        )}

        {contact.notes && (
          <p className="mt-4 text-[15px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-4">{contact.notes}</p>
        )}

        {/* Quick-send row */}
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex gap-2 flex-wrap">
          <QuickSendButton contact={contact} channel="email" />
          <QuickSendButton contact={contact} channel="sms" />
          <SendPortalLinkButton
            contactId={contact.id}
            tenantId={tenantId}
            tenantSlug={tenantSlug}
            businessName={businessName}
            hasEmail={!!contact.email}
          />
        </div>
      </div>

      {/* Payment requests — per-order, tenant-admin only */}
      <PaymentRequestSection orders={orders} hasPhone={!!contact.phone} hasEmail={!!contact.email} />

      {/* Interaction timeline */}
      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Timeline</h2>
        <AddInteractionForm contactId={contact.id} />
        <InteractionTimeline interactions={interactions} />
      </div>
    </div>
  )
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[15px] text-[hsl(var(--foreground))]">
      <span className="text-[hsl(var(--muted-foreground))] flex-shrink-0">{icon}</span>
      {children}
    </div>
  )
}
