'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, Mail, Building2, MapPin, Tag, Pencil, Trash2, Clock, CreditCard, Repeat, Zap, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/actions/audit'
import { InteractionTimeline } from '@/components/interactions/InteractionTimeline'
import { AddInteractionForm } from '@/components/interactions/AddInteractionForm'
import { QuickSendButton } from '@/components/templates/QuickSendButton'
import { SendPortalLinkButton } from '@/components/portal/SendPortalLinkButton'
import { PaymentRequestSection } from '@/components/contacts/PaymentRequestSection'
import { AutomationSection } from '@/components/contacts/AutomationSection'
import { RecurringJobsSection } from '@/components/contacts/RecurringJobsSection'
import { ActivityTimeline, type ActivityLog } from '@/components/shared/ActivityTimeline'
import { createOrder } from '@/lib/actions/orders'
import type { RecurringJob } from '@/lib/actions/recurring-jobs'
import { useUserRole } from '@/lib/hooks/useUserRole'
import type { Tables } from '@/types/database'
import { cn } from '@/lib/utils'

type Contact = Tables<'contacts'>
type Interaction = Tables<'interactions'>
type Order = { id: string; order_number: number | null; total_amount: number; payment_status: string; notes: string | null; created_at: string }

const STATUS_COLOR: Record<Contact['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  inactive: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
}

function initials(c: Contact) {
  return `${c.first_name[0]}${c.last_name?.[0] ?? ''}`.toUpperCase()
}

type CatalogItem = { id: string; name: string; description: string | null; base_price: number }
type TabKey = 'timeline' | 'payments' | 'recurring' | 'automation'

export function ContactDetail({ contact, interactions, orders = [], activity = [], tenantId, tenantSlug, businessName, catalogItems = [], recurringJobs = [] }: {
  contact: Contact
  interactions: Interaction[]
  orders?: Order[]
  activity?: ActivityLog[]
  tenantId: string
  tenantSlug: string
  businessName: string
  catalogItems?: CatalogItem[]
  recurringJobs?: RecurringJob[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { canEdit, isAdmin } = useUserRole() // Phase 21 RBAC — hides edit/delete for read-only
  const initialTab = searchParams.get('tab')
  const highlightOrderId = searchParams.get('order')
  const [tab, setTab] = useState<TabKey>(initialTab === 'payments' || initialTab === 'recurring' || initialTab === 'automation' ? initialTab : 'timeline')
  const [creatingOrder, setCreatingOrder] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete ${contact.first_name}? This cannot be undone.`)) return
    await supabase.from('contacts').delete().eq('id', contact.id)
    logAudit({ action: 'contact_deleted', resource_type: 'contact', resource_id: contact.id, resource_name: `${contact.first_name} ${contact.last_name ?? ''}`.trim() })
    router.push('/contacts')
    router.refresh()
  }

  async function handleAddOrder() {
    setCreatingOrder(true)
    try {
      const orderId = await createOrder({ customer_id: contact.id })
      router.push(`/orders/${orderId}`)
    } catch {
      setCreatingOrder(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, count: interactions.length },
    { key: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, count: orders.length },
    { key: 'recurring', label: 'Recurring Jobs', icon: <Repeat className="w-4 h-4" />, count: recurringJobs.length },
    ...(isAdmin ? [{ key: 'automation' as TabKey, label: 'Automation', icon: <Zap className="w-4 h-4" /> }] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header card */}
      <div
        className="bg-[hsl(var(--card))] rounded-3xl border border-[hsl(var(--border))] p-6"
        style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.05)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.65))' }}
          >
            {initials(contact)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight">{contact.first_name} {contact.last_name}</h1>
              <span className={cn('text-[13px] px-2 py-0.5 rounded-full font-semibold capitalize', STATUS_COLOR[contact.status])}>
                {contact.status}
              </span>
            </div>
            {contact.company && <p className="text-[15px] text-[hsl(var(--muted-foreground))] mt-0.5">{contact.company}</p>}
          </div>
          {canEdit && (
            <div className="flex gap-1.5 flex-shrink-0">
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
              <span key={tag} className="text-[13px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">{tag}</span>
            ))}
          </div>
        )}

        {contact.notes && (
          <p className="mt-4 text-[15px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-4">{contact.notes}</p>
        )}

        {/* Quick-send row */}
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex gap-2 flex-wrap">
          {canEdit && (
            <button
              onClick={handleAddOrder}
              disabled={creatingOrder}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
            >
              {creatingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {creatingOrder ? 'Creating…' : 'Add order'}
            </button>
          )}
          <QuickSendButton contact={contact} channel="email" />
          <QuickSendButton contact={contact} channel="sms" />
          <SendPortalLinkButton
            contactId={contact.id}
            tenantId={tenantId}
            tenantSlug={tenantSlug}
            businessName={businessName}
            hasEmail={!!contact.email}
            hasPhone={!!contact.phone}
          />
        </div>
      </div>

      {/* Sidebar tabs + content */}
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-52 flex-shrink-0 pb-1 md:pb-0">
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]',
                )}
              >
                <span className={active ? 'text-accent' : 'text-[hsl(var(--muted-foreground))]'}>{t.icon}</span>
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span
                    className={cn(
                      'ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                      active ? 'bg-accent text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {tab === 'timeline' && (
            <div className="space-y-6">
              <AddInteractionForm contactId={contact.id} />
              <InteractionTimeline interactions={interactions} />
              {orders.length > 0 && (
                <div className="pt-2 border-t border-[hsl(var(--border))]">
                  <h2 className="text-[15px] font-semibold uppercase tracking-wide mb-3 mt-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Order activity
                  </h2>
                  <ActivityTimeline activity={activity} showOrderLink />
                </div>
              )}
            </div>
          )}
          {tab === 'payments' && (
            <PaymentRequestSection orders={orders} hasPhone={!!contact.phone} hasEmail={!!contact.email} highlightOrderId={highlightOrderId} />
          )}
          {tab === 'recurring' && (
            <RecurringJobsSection
              contactId={contact.id}
              tenantId={tenantId}
              businessName={businessName}
              catalogItems={catalogItems}
              jobs={recurringJobs}
            />
          )}
          {tab === 'automation' && isAdmin && <AutomationSection contactId={contact.id} />}
        </div>
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
