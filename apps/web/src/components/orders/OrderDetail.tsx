'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, RotateCcw, CalendarClock, Printer, Lock, Wallet, Tag, Pencil, Save, Check } from 'lucide-react'
import {
  addLineItem, removeLineItem, updateOrderStatus, updateOrderCustomer, updateJobStatus, returnRental, extendRental,
  updateLineItemDiscount, updateOrderDiscount, updateLineItem, saveOrderDraft,
  type Order, type OrderLineItem, type DiscountType,
} from '@/lib/actions/orders'
import { getUpsellSuggestion, acceptUpsellSuggestion, type UpsellSuggestion } from '@/lib/actions/upsells'
import { lineItemPricing, orderPricing, formatDiscount, hasDiscount } from '@/lib/order-discounts'
import { JobPhotos } from './JobPhotos'
import type { JobPhoto } from '@/lib/actions/photos'
import { SendQuoteButton } from './SendQuoteButton'
import { useRouter } from 'next/navigation'
import { ActivityTimeline, type ActivityLog } from '@/components/shared/ActivityTimeline'

function UpsellSuggestionCard({ suggestion, onAccept, onDismiss }: {
  suggestion: UpsellSuggestion
  onAccept: () => void
  onDismiss: () => void
}) {
  const [pending, setPending] = useState(false)
  return (
    <div className="mx-6 mt-4 rounded-xl border border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/30 px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[14px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          {suggestion.rule.bundle_emoji_icon ?? '💡'} Suggestion: add {suggestion.suggestedItemName}?
        </p>
        <p className="text-[13px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Bundle price ${suggestion.bundlePrice.toFixed(2)} (save ${suggestion.savings.toFixed(2)})
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          disabled={pending}
          onClick={() => { setPending(true); onAccept() }}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
        >
          {pending ? 'Adding…' : 'Add to Quote'}
        </button>
        <button onClick={onDismiss} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-[hsl(var(--border))]">
          Dismiss
        </button>
      </div>
    </div>
  )
}

type CatalogItem = { id: string; name: string; base_price: number; billing_unit: string; item_type: string }
type Contact     = { id: string; first_name: string; last_name: string | null }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:    { bg: 'var(--badge-inactive-bg)', color: 'var(--badge-inactive-text)' },
  pending:  { bg: 'var(--badge-lead-bg)',     color: 'var(--badge-lead-text)'     },
  paid:     { bg: 'var(--badge-green-bg)',    color: 'var(--badge-green-text)'    },
  refunded: { bg: 'var(--badge-red-bg)',      color: 'var(--badge-red-text)'      },
}
const RENTAL_COLORS: Record<string, { bg: string; color: string }> = {
  reserved: { bg: 'var(--badge-violet-bg)',   color: 'var(--badge-violet-text)'   },
  active:   { bg: 'var(--badge-active-bg)',   color: 'var(--badge-active-text)'   },
  returned: { bg: 'var(--badge-inactive-bg)', color: 'var(--badge-inactive-text)' },
  overdue:  { bg: 'var(--badge-red-bg)',      color: 'var(--badge-red-text)'      },
}
const UNIT_LABELS: Record<string, string> = {
  flat: '', hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo',
}

function isOverdue(line: OrderLineItem): boolean {
  if (line.rental_status && line.rental_status !== 'returned' && line.rental_end_date) {
    return new Date(line.rental_end_date) < new Date() && !line.actual_return_date
  }
  return false
}

export function OrderDetail({
  order, lines, catalogItems, contacts, businessName, initialPhotos, tenantId,
  signedBy, signedAt, activity = [],
}: {
  order: Order
  lines: OrderLineItem[]
  catalogItems: CatalogItem[]
  contacts: Contact[]
  businessName: string
  initialPhotos: JobPhoto[]
  tenantId: string
  signedBy: string | null
  signedAt: string | null
  activity?: ActivityLog[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showAddLine, setShowAddLine] = useState(false)
  const [extendLine, setExtendLine] = useState<OrderLineItem | null>(null)
  const [discountLine, setDiscountLine] = useState<OrderLineItem | null>(null)
  const [editLine, setEditLine] = useState<OrderLineItem | null>(null)
  const [showOrderDiscount, setShowOrderDiscount] = useState(false)
  const [jobStatus, setJobStatus] = useState<Order['job_status']>(order.job_status)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const pricing = orderPricing(lines, order)

  const contact = order.contact as { id: string; first_name: string; last_name: string | null; email: string | null; phone?: string | null } | null
  const statusStyle = STATUS_COLORS[order.payment_status] ?? STATUS_COLORS.draft
  const isLocked = !!signedAt
  const [upsell, setUpsell] = useState<UpsellSuggestion | null>(null)
  const [upsellDismissed, setUpsellDismissed] = useState(false)

  useEffect(() => {
    if (isLocked || !order.customer_id) return
    getUpsellSuggestion(tenantId, order.id, order.customer_id).then(setUpsell)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length])

  function handleStatusChange(status: Order['payment_status']) {
    startTransition(() => updateOrderStatus(order.id, status))
  }

  function handleCustomerChange(customer_id: string) {
    if (!customer_id) return
    startTransition(() => updateOrderCustomer(order.id, customer_id))
    router.refresh()
  }

  function handleJobStatusChange(status: Order['job_status']) {
    setJobStatus(status)
    startTransition(() => updateJobStatus(order.id, status))
  }

  function handleRemoveLine(lineId: string) {
    startTransition(() => removeLineItem(lineId, order.id))
  }

  function handleReturn(lineId: string) {
    startTransition(() => returnRental(lineId, order.id))
  }

  function handleSaveDraft() {
    setSavingDraft(true)
    setDraftSaved(false)
    startTransition(async () => {
      await saveOrderDraft(order.id)
      setSavingDraft(false)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Print-only header */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          body { background: white !important; }
          @page { margin: 18mm 16mm; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print-only header */}
      <div className="print-only" style={{ flexDirection: 'column', marginBottom: '32px' }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <img src="/qcypher-logo.png" alt="QCypher" style={{ height: '36px', width: 'auto' }} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#888', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Invoice</p>
            <p style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0', color: '#111', letterSpacing: '-0.02em' }}>
              #{String(order.order_number ?? 0).padStart(4, '0')}
            </p>
          </div>
        </div>
        {/* Divider */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #1a3070 0%, #4f8ef7 100%)', borderRadius: '2px', marginBottom: '20px' }} />
        {/* Meta row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555' }}>
          <div>
            {businessName && <p style={{ margin: 0, fontWeight: 700, color: '#111', fontSize: '15px' }}>{businessName}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}>Date: {new Date(order.created_at).toLocaleDateString()}</p>
            {contact && <p style={{ margin: '2px 0 0' }}>{contact.first_name} {contact.last_name ?? ''}</p>}
          </div>
        </div>
      </div>

      {/* Back */}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-[15px] font-semibold hover:text-[#1a3070] transition-colors no-print"
        style={{ color: 'hsl(var(--muted-foreground))' }}>
        <ChevronLeft className="w-4 h-4" /> Orders
      </Link>

      {/* Header */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-6 no-print">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-4 mb-4 border-b border-[hsl(var(--border))]">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>
              Order #{String(order.order_number ?? 0).padStart(4, '0')}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              {contact ? (
                <Link href={`/contacts/${contact.id}`}
                  className="text-[15px] font-semibold hover:text-[#1a3070] transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {contact.first_name} {contact.last_name}
                </Link>
              ) : contacts.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => handleCustomerChange(e.target.value)}
                  disabled={pending}
                  className="text-[15px] font-semibold px-2 py-1 rounded-lg border cursor-pointer no-print"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                >
                  <option value="" disabled>Link a customer…</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ''}</option>
                  ))}
                </select>
              )}
              <span style={{ color: 'hsl(var(--border))' }}>·</span>
              <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Created {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment status picker */}
            <select
              value={order.payment_status}
              onChange={e => handleStatusChange(e.target.value as Order['payment_status'])}
              disabled={pending}
              className="text-[15px] font-bold px-3 py-1.5 rounded-xl border cursor-pointer"
              style={{ ...statusStyle, borderColor: 'transparent' }}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Job status picker */}
            <select
              value={jobStatus ?? ''}
              onChange={e => handleJobStatusChange((e.target.value || null) as Order['job_status'])}
              disabled={pending}
              className="text-[15px] font-semibold px-3 py-1.5 rounded-xl border cursor-pointer"
              style={{
                borderColor: 'hsl(var(--border))',
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
              }}
            >
              <option value="">Job status…</option>
              <option value="en_route">🚗 En route</option>
              <option value="in_progress">🔧 In progress</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          {contact && (
            <Link href={`/contacts/${contact.id}?tab=payments&order=${order.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[15px] font-semibold transition-colors no-print"
              style={{ background: 'rgba(42,82,160,0.10)', color: '#2a52a0' }}
              title="View payments for this customer">
              <Wallet className="w-3.5 h-3.5" /> Payment link
            </Link>
          )}

          <SendQuoteButton
            orderId={order.id}
            total={order.total_amount}
            businessName={businessName}
            contactEmail={contact?.email ?? null}
            contactName={contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : null}
            alreadySigned={isLocked}
            signedBy={signedBy}
            signedAt={signedAt}
          />

          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Printer className="w-3.5 h-3.5" /> Print invoice
          </button>

          <button onClick={handleSaveDraft} disabled={savingDraft}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[15px] font-semibold transition-colors"
            style={draftSaved
              ? { background: 'rgba(16,185,129,0.12)', color: '#059669' }
              : { background: 'rgba(42,82,160,0.10)', color: '#2a52a0', opacity: savingDraft ? 0.6 : 1 }}>
            {draftSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {draftSaved ? 'Draft saved' : savingDraft ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-[15px] font-black" style={{ color: 'hsl(var(--foreground))' }}>Line items</h2>
            {isLocked && (
              <p className="text-[13px] mt-0.5 flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <Lock className="w-3 h-3" /> Locked — quote signed
              </p>
            )}
          </div>
          {!isLocked && (
            <button onClick={() => setShowAddLine(true)}
              className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)' }}>
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          )}
        </div>

        {upsell && !upsellDismissed && (
          <UpsellSuggestionCard
            suggestion={upsell}
            onAccept={() => {
              startTransition(async () => {
                await acceptUpsellSuggestion(upsell.analyticsId, tenantId)
                setUpsell(null)
                router.refresh()
              })
            }}
            onDismiss={() => setUpsellDismissed(true)}
          />
        )}

        {lines.length === 0 ? (
          <p className="text-center py-10 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            No items yet — add one above
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                {['Item', 'Qty', 'Unit price', 'Discount', 'Subtotal', ''].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[15px] font-bold uppercase tracking-wide"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const overdue = isOverdue(line)
                const effectiveStatus = overdue && line.rental_status !== 'returned' ? 'overdue' : line.rental_status
                const rs = effectiveStatus ? RENTAL_COLORS[effectiveStatus] : null
                const linePricing = lineItemPricing(line)
                const lineHasDiscount = hasDiscount(line)
                return (
                  <tr key={line.id}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                        {line.item_name_snapshot}
                      </p>
                      {line.description_snapshot && (
                        <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {line.description_snapshot}
                        </p>
                      )}
                      {line.rental_start_date && (
                        <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {line.rental_start_date} → {line.rental_end_date}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
                      {Number(line.quantity)}
                    </td>
                    <td className="px-5 py-3.5 text-[15px]" style={{ color: 'hsl(var(--foreground))' }}>
                      ${Number(line.unit_price).toFixed(2)}
                      <span className="text-[15px] ml-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {UNIT_LABELS[line.billing_unit_snapshot]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {!isLocked ? (
                        <button onClick={() => setDiscountLine(line)}
                          className="flex items-center gap-1 text-[15px] font-semibold px-2 py-1 rounded-lg"
                          style={lineHasDiscount
                            ? { color: '#059669', background: 'rgba(16,185,129,0.10)' }
                            : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }}>
                          <Tag className="w-3 h-3" />
                          {lineHasDiscount ? formatDiscount(line) : 'Add'}
                        </button>
                      ) : lineHasDiscount ? (
                        <span className="text-[15px] font-semibold" style={{ color: '#059669' }}>{formatDiscount(line)}</span>
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>
                      )}
                      {lineHasDiscount && !line.show_discount && (
                        <p className="text-[15px] mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>Hidden from customer</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[15px] font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      {lineHasDiscount && (
                        <p className="text-[15px] font-normal line-through" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          ${linePricing.original.toFixed(2)}
                        </p>
                      )}
                      ${linePricing.discounted.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        {!isLocked && line.rental_status && line.rental_status !== 'returned' && (
                          <>
                            <button onClick={() => setExtendLine(line)} title="Extend rental"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-violet-50 transition-colors">
                              <CalendarClock className="w-3.5 h-3.5" style={{ color: '#4a9db5' }} />
                            </button>
                            <button onClick={() => handleReturn(line.id)} title="Mark returned"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-50 transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                            </button>
                          </>
                        )}
                        {!isLocked && (
                          <>
                            <button onClick={() => setEditLine(line)} title="Edit"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors">
                              <Pencil className="w-3.5 h-3.5" style={{ color: '#2a52a0' }} />
                            </button>
                            <button onClick={() => handleRemoveLine(line.id)} title="Remove"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                            </button>
                          </>
                        )}
                        {isLocked && line.rental_status && line.rental_status !== 'returned' && (
                          <button onClick={() => handleReturn(line.id)} title="Mark returned"
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-50 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}

        {/* Order-level discount */}
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] no-print">
          {hasDiscount(order) ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[15px] font-semibold px-2 py-1 rounded-lg"
                  style={{ color: '#059669', background: 'rgba(16,185,129,0.10)' }}>
                  <Tag className="w-3 h-3" /> Order discount: {formatDiscount(order)}
                </span>
                {!order.show_discount && (
                  <span className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Hidden from customer</span>
                )}
              </div>
              {!isLocked && (
                <button onClick={() => setShowOrderDiscount(true)}
                  className="text-[15px] font-semibold hover:underline" style={{ color: '#2a52a0' }}>
                  Edit
                </button>
              )}
            </div>
          ) : !isLocked && (
            <button onClick={() => setShowOrderDiscount(true)}
              className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: '#2a52a0' }}>
              <Tag className="w-3.5 h-3.5" /> Add order discount
            </button>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-end px-6 py-4 border-t border-[hsl(var(--border))]">
          <div className="text-right space-y-1">
            {(pricing.lineDiscountTotal > 0 || pricing.orderDiscountAmount > 0) && (
              <>
                <div className="flex justify-between gap-8 text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <span>Subtotal</span>
                  <span>${pricing.subtotalOriginal.toFixed(2)}</span>
                </div>
                {pricing.lineDiscountTotal > 0 && (
                  <div className="flex justify-between gap-8 text-[15px]" style={{ color: '#059669' }}>
                    <span>Line discounts</span>
                    <span>−${pricing.lineDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                {pricing.orderDiscountAmount > 0 && (
                  <div className="flex justify-between gap-8 text-[15px]" style={{ color: '#059669' }}>
                    <span>Order discount</span>
                    <span>−${pricing.orderDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            <p className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Total</p>
            <p className="text-2xl font-black mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>
              ${Number(order.total_amount).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Job Photos — hidden on print */}
      <div className="no-print">
        <JobPhotos
          orderId={order.id}
          initialPhotos={initialPhotos}
          tenantId={tenantId}
        />
      </div>

      {/* Activity — hidden on print */}
      <div className="no-print rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-[15px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Activity
        </h2>
        <ActivityTimeline activity={activity} />
      </div>

      {/* Modals — hidden on print */}
      <div className="no-print">
      {showAddLine && (
        <AddLineModal
          orderId={order.id}
          catalogItems={catalogItems}
          onClose={() => setShowAddLine(false)}
        />
      )}
      {extendLine && (
        <ExtendRentalModal
          line={extendLine}
          orderId={order.id}
          onClose={() => setExtendLine(null)}
        />
      )}
      {editLine && (
        <EditLineModal
          line={editLine}
          orderId={order.id}
          onClose={() => setEditLine(null)}
        />
      )}
      {discountLine && (
        <LineDiscountModal
          line={discountLine}
          orderId={order.id}
          onClose={() => setDiscountLine(null)}
        />
      )}
      {showOrderDiscount && (
        <OrderDiscountModal
          order={order}
          onClose={() => setShowOrderDiscount(false)}
        />
      )}
      </div>
    </div>
  )
}

function DiscountFields({ discountType, discountValue, showDiscount, onDiscountTypeChange, onDiscountValueChange, onShowDiscountChange }: {
  discountType: DiscountType | null
  discountValue: number | null
  showDiscount: boolean
  onDiscountTypeChange: (v: DiscountType | null) => void
  onDiscountValueChange: (v: number | null) => void
  onShowDiscountChange: (v: boolean) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Discount type</label>
          <select
            value={discountType ?? ''}
            onChange={e => onDiscountTypeChange((e.target.value || null) as DiscountType | null)}
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
            style={{ color: 'hsl(var(--foreground))' }}>
            <option value="">No discount</option>
            <option value="percent">Percent off</option>
            <option value="flat">Flat amount off</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {discountType === 'percent' ? 'Percent (%)' : 'Amount ($)'}
          </label>
          <input
            type="number" step="0.01" min="0" max={discountType === 'percent' ? 100 : undefined}
            disabled={!discountType}
            value={discountValue ?? ''}
            onChange={e => onDiscountValueChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px] disabled:opacity-50"
            style={{ color: 'hsl(var(--foreground))' }} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[15px] font-semibold cursor-pointer" style={{ color: 'hsl(var(--foreground))' }}>
        <input type="checkbox" checked={showDiscount} onChange={e => onShowDiscountChange(e.target.checked)} className="w-4 h-4" />
        Show discount and original price to customer
      </label>
      <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {showDiscount
          ? 'Customer will see the original price, the discount, and the final price.'
          : 'Customer will only see the final price — no mention of a discount.'}
      </p>
    </>
  )
}

function EditLineModal({ line, orderId, onClose }: {
  line: OrderLineItem; orderId: string; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updateLineItem({
        id: line.id,
        order_id: orderId,
        item_name_snapshot: fd.get('name') as string,
        description_snapshot: (fd.get('description') as string) || null,
        quantity: parseFloat(fd.get('quantity') as string) || 1,
        unit_price: parseFloat(fd.get('unit_price') as string) || 0,
        billing_unit_snapshot: fd.get('billing_unit') as OrderLineItem['billing_unit_snapshot'],
      })
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Edit line item</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Name *</label>
            <input name="name" required defaultValue={line.item_name_snapshot}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Description</label>
            <input name="description" defaultValue={line.description_snapshot ?? ''}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Qty *</label>
              <input name="quantity" type="number" step="1" min="1" required defaultValue={line.quantity}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Unit price ($) *</label>
              <input name="unit_price" type="number" step="0.01" min="0" required defaultValue={line.unit_price}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Billing unit</label>
            <select name="billing_unit" defaultValue={line.billing_unit_snapshot}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="flat">Flat</option>
              <option value="hourly">Per hour</option>
              <option value="daily">Per day</option>
              <option value="weekly">Per week</option>
              <option value="monthly">Per month</option>
            </select>
          </div>

          {error && <p className="text-[15px] text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LineDiscountModal({ line, orderId, onClose }: {
  line: OrderLineItem; orderId: string; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [discountType, setDiscountType] = useState<DiscountType | null>(line.discount_type)
  const [discountValue, setDiscountValue] = useState<number | null>(line.discount_value)
  const [showDiscount, setShowDiscount] = useState(line.show_discount)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateLineItemDiscount({
        id: line.id, order_id: orderId,
        discount_type: discountType, discount_value: discountValue, show_discount: showDiscount,
      })
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>
            Discount — {line.item_name_snapshot}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <DiscountFields
            discountType={discountType} discountValue={discountValue} showDiscount={showDiscount}
            onDiscountTypeChange={setDiscountType} onDiscountValueChange={setDiscountValue} onShowDiscountChange={setShowDiscount}
          />
          {error && <p className="text-[15px] text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : 'Save discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OrderDiscountModal({ order, onClose }: {
  order: Order; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [discountType, setDiscountType] = useState<DiscountType | null>(order.discount_type)
  const [discountValue, setDiscountValue] = useState<number | null>(order.discount_value)
  const [showDiscount, setShowDiscount] = useState(order.show_discount)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateOrderDiscount({
        id: order.id,
        discount_type: discountType, discount_value: discountValue, show_discount: showDiscount,
      })
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Order discount</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Applies on top of any per-item discounts, to the whole order.
          </p>
          <DiscountFields
            discountType={discountType} discountValue={discountValue} showDiscount={showDiscount}
            onDiscountTypeChange={setDiscountType} onDiscountValueChange={setDiscountValue} onShowDiscountChange={setShowDiscount}
          />
          {error && <p className="text-[15px] text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : 'Save discount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddLineModal({ orderId, catalogItems, onClose }: {
  orderId: string; catalogItems: CatalogItem[]; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<CatalogItem | null>(null)
  const [isRental, setIsRental] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscountFields, setShowDiscountFields] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType | null>(null)
  const [discountValue, setDiscountValue] = useState<number | null>(null)
  const [showDiscount, setShowDiscount] = useState(true)

  function handleCatalogSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const item = catalogItems.find(i => i.id === e.target.value) ?? null
    setSelected(item)
    setIsRental(item?.item_type === 'rental')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const result = await addLineItem({
          order_id: orderId,
          catalog_item_id: selected?.id,
          item_name_snapshot: fd.get('name') as string,
          description_snapshot: fd.get('description') as string || undefined,
          quantity: parseFloat(fd.get('quantity') as string) || 1,
          unit_price: parseFloat(fd.get('unit_price') as string) || 0,
          discount_type: discountType,
          discount_value: discountValue,
          show_discount: showDiscount,
          billing_unit_snapshot: (fd.get('billing_unit') as OrderLineItem['billing_unit_snapshot']) ?? 'flat',
          rental_status: isRental ? 'reserved' : undefined,
          rental_start_date: isRental ? (fd.get('rental_start') as string) || undefined : undefined,
          rental_end_date:   isRental ? (fd.get('rental_end')   as string) || undefined : undefined,
        })
        if (result.ok) onClose()
        else setError(result.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Add line item</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              From catalog (optional)
            </label>
            <select onChange={handleCatalogSelect}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="">— Custom line item —</option>
              {catalogItems.map(i => (
                <option key={i.id} value={i.id}>{i.name} (${Number(i.base_price).toFixed(2)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Name *</label>
            <input name="name" required defaultValue={selected?.name}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Qty *</label>
              <input name="quantity" type="number" step="1" min="1" required defaultValue={1}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Unit price ($) *</label>
              <input name="unit_price" type="number" step="0.01" min="0" required defaultValue={selected?.base_price}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                style={{ color: 'hsl(var(--foreground))' }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Billing unit</label>
            <select name="billing_unit" defaultValue={selected?.billing_unit ?? 'flat'}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }}>
              <option value="flat">Flat</option>
              <option value="hourly">Per hour</option>
              <option value="daily">Per day</option>
              <option value="weekly">Per week</option>
              <option value="monthly">Per month</option>
            </select>
          </div>

          {isRental && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>Start date</label>
                <input name="rental_start" type="date"
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                  style={{ color: 'hsl(var(--foreground))' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>End date</label>
                <input name="rental_end" type="date"
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
                  style={{ color: 'hsl(var(--foreground))' }} />
              </div>
            </div>
          )}

          {showDiscountFields ? (
            <DiscountFields
              discountType={discountType} discountValue={discountValue} showDiscount={showDiscount}
              onDiscountTypeChange={setDiscountType} onDiscountValueChange={setDiscountValue} onShowDiscountChange={setShowDiscount}
            />
          ) : (
            <button type="button" onClick={() => setShowDiscountFields(true)}
              className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: '#2a52a0' }}>
              <Tag className="w-3.5 h-3.5" /> Add a discount
            </button>
          )}

          {error && <p className="text-[15px] text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Adding…' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExtendRentalModal({ line, orderId, onClose }: {
  line: OrderLineItem; orderId: string; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const newEnd = fd.get('new_end_date') as string
    setError(null)
    startTransition(async () => {
      try {
        await extendRental({
          line_item_id: line.id,
          order_id: orderId,
          previous_end_date: line.rental_end_date!,
          new_end_date: newEnd,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-sm border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>Extend rental</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[hsl(var(--muted))]">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-[15px] font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {line.item_name_snapshot}
          </p>
          <p className="text-[15px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Current end date: <strong>{line.rental_end_date}</strong>
          </p>
          <div className="space-y-1.5">
            <label className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
              New end date *
            </label>
            <input name="new_end_date" type="date" required min={line.rental_end_date ?? undefined}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[15px]"
              style={{ color: 'hsl(var(--foreground))' }} />
          </div>
          {error && <p className="text-[15px] text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[hsl(var(--border))] text-[15px] font-semibold"
              style={{ color: 'hsl(var(--muted-foreground))' }}>Cancel</button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-[15px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Extending…' : 'Extend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
