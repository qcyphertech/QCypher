'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, Mail, Building2, MapPin, Tag, Pencil, Trash2, Clock, CreditCard, Repeat, Zap, Plus, Loader2, Package, Activity as ActivityIcon } from 'lucide-react'
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
import { OrdersTable } from '@/components/orders/OrdersTable'
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
type TabKey = 'orders' | 'payments' | 'activity' | 'recurring' | 'timeline' | 'automation'

export function ContactDetail({ contact, interactions, orders = [], activity = [], tenantId, tenantSlug, businessName, catalogItems = [], recurringJobs = [], nextAppointmentAt = null }: {
  contact: Contact
  interactions: Interaction[]
  orders?: Order[]
  activity?: ActivityLog[]
  tenantId: string
  tenantSlug: string
  businessName: string
  catalogItems?: CatalogItem[]
  recurringJobs?: RecurringJob[]
  nextAppointmentAt?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { canEdit, isAdmin } = useUserRole() // Phase 21 RBAC — hides edit/delete for read-only

  // Quick-send template variables that aren't on the contact/tenant row
  // directly — the most recent unpaid order's total, and the soonest
  // upcoming appointment, both pre-formatted since interpolate() just
  // substitutes strings verbatim.
  const nextUnpaidOrder = orders.find(o => o.payment_status === 'pending')
  const amountDue = nextUnpaidOrder
    ? `$${nextUnpaidOrder.total_amount.toFixed(2)}`
    : undefined
  const appointmentDate = nextAppointmentAt
    ? new Date(nextAppointmentAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : undefined
  const initialTab = searchParams.get('tab')
  const highlightOrderId = searchParams.get('order')
  const validTabs: TabKey[] = ['orders', 'payments', 'activity', 'recurring', 'timeline', 'automation']
  const [tab, setTab] = useState<TabKey>(
    validTabs.includes(initialTab as TabKey) ? (initialTab as TabKey) : 'orders'
  )
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
    { key: 'orders', label: 'Orders', icon: <Package className="w-4 h-4" />, count: orders.length },
    { key: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, count: orders.length },
    { key: 'activity', label: 'Order Activity', icon: <ActivityIcon className="w-4 h-4" />, count: activity.length },
    { key: 'recurring', label: 'Recurring Jobs', icon: <Repeat className="w-4 h-4" />, count: recurringJobs.length },
    { key: 'timeline', label: 'Customer Notes', icon: <Clock className="w-4 h-4" />, count: interactions.length },
    ...(isAdmin ? [{ key: 'automation' as TabKey, label: 'Automation', icon: <Zap className="w-4 h-4" /> }] : []),
  ]

  const contactOrders = orders.map(o => ({
    id: o.id,
    order_number: o.order_number,
    total_amount: o.total_amount,
    payment_status: o.payment_status,
    created_at: o.created_at,
    contact: { id: contact.id, first_name: contact.first_name, last_name: contact.last_name },
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header card */}
      <div
        className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4"
        style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.05)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.65))' }}
          >
            {initials(contact)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[15.5px] font-bold tracking-tight">{contact.first_name} {contact.last_name}</h1>
              <span className={cn('text-[11.5px] px-2 py-0.5 rounded-full font-bold capitalize', STATUS_COLOR[contact.status])}>
                {contact.status}
              </span>
            </div>
            {contact.company && <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{contact.company}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {canEdit && (
              <button
                onClick={handleAddOrder}
                disabled={creatingOrder}
                className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}
              >
                {creatingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creatingOrder ? 'Creating…' : 'Add order'}
              </button>
            )}
            {canEdit && (
              <>
                <Link href={`/contacts/${contact.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <button onClick={handleDelete} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info lane */}
        {(contact.email || contact.phone || contact.address || contact.source) && (
          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider w-14 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>
              Contact
            </span>
            {contact.email && (
              <ChipLink href={`mailto:${contact.email}`} icon={<Mail className="w-3 h-3" />}>{contact.email}</ChipLink>
            )}
            {contact.phone && (
              <ChipLink href={`tel:${contact.phone}`} icon={<Phone className="w-3 h-3" />}>{contact.phone}</ChipLink>
            )}
            {contact.address && (
              <Chip icon={<MapPin className="w-3 h-3" />}>{contact.address}</Chip>
            )}
            {contact.source && (
              <Chip icon={<Building2 className="w-3 h-3" />}>{contact.source}</Chip>
            )}
          </div>
        )}

        {/* Quick-send lane */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider w-14 flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}>
            Quick send
          </span>
          <div className="flex items-center gap-1.5">
            <QuickSendButton contact={contact} businessName={businessName} amountDue={amountDue} appointmentDate={appointmentDate} channel="email" iconOnly />
            <QuickSendButton contact={contact} businessName={businessName} amountDue={amountDue} appointmentDate={appointmentDate} channel="sms" iconOnly />
            <SendPortalLinkButton
              contactId={contact.id}
              tenantId={tenantId}
              tenantSlug={tenantSlug}
              businessName={businessName}
              hasEmail={!!contact.email}
              hasPhone={!!contact.phone}
              iconOnly
            />
          </div>
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            {contact.tags.map(tag => (
              <span key={tag} className="text-[12px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">{tag}</span>
            ))}
          </div>
        )}

        {contact.notes && (
          <p className="mt-3 text-[13.5px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3">{contact.notes}</p>
        )}
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
          {tab === 'orders' && (
            orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] py-12 text-center">
                <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>No orders yet for this customer.</p>
              </div>
            ) : (
              <OrdersTable orders={contactOrders} />
            )
          )}
          {tab === 'payments' && (
            <PaymentRequestSection orders={orders} hasPhone={!!contact.phone} hasEmail={!!contact.email} highlightOrderId={highlightOrderId} />
          )}
          {tab === 'activity' && <ActivityTimeline activity={activity} showOrderLink />}
          {tab === 'recurring' && (
            <RecurringJobsSection
              contactId={contact.id}
              tenantId={tenantId}
              businessName={businessName}
              catalogItems={catalogItems}
              jobs={recurringJobs}
            />
          )}
          {tab === 'timeline' && (
            <div className="space-y-6">
              <h2 className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Customer Notes
              </h2>
              <AddInteractionForm contactId={contact.id} />
              <InteractionTimeline interactions={interactions} />
            </div>
          )}
          {tab === 'automation' && isAdmin && <AutomationSection contactId={contact.id} />}
        </div>
      </div>
    </div>
  )
}

const chipCls = 'inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={chipCls}>
      <span className="text-accent flex-shrink-0">{icon}</span>
      {children}
    </span>
  )
}

function ChipLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a href={href} className={cn(chipCls, 'hover:bg-[hsl(var(--border))] transition-colors')}>
      <span className="text-accent flex-shrink-0">{icon}</span>
      {children}
    </a>
  )
}
