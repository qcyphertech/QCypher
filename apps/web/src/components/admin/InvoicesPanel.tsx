'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, FileEdit, Send, CheckCircle2, X, Copy, ExternalLink } from 'lucide-react'
import {
  listInvoices, createInvoice, sendInvoice, markInvoicePaidManually, voidInvoice,
  type Invoice, type InvoiceType,
} from '@/lib/actions/invoices'
import type { TenantSummary } from '@/lib/actions/admin-console'
import { SectionHeader, EmptyState, PanelSkeleton } from '@/components/admin/AdminPanelUI'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  void: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] line-through',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function InvoicesPanel({ tenants }: { tenants: TenantSummary[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  function load() {
    setLoading(true)
    listInvoices().then(r => { setInvoices(r); setLoading(false) })
  }
  useEffect(load, [])

  const drafts = invoices.filter(i => i.status === 'draft')
  const sent = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const paid = invoices.filter(i => i.status === 'paid')

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 text-[14px] font-medium bg-accent text-white px-4 py-2 rounded-xl shadow-sm hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {loading ? (
        <PanelSkeleton />
      ) : (
        <>
          <div>
            <SectionHeader icon={FileEdit} label="Draft" count={drafts.length} />
            {drafts.length === 0 ? (
              <EmptyState icon={FileEdit} message="No draft invoices." />
            ) : (
              <InvoiceTable invoices={drafts} onChanged={load} />
            )}
          </div>

          <div>
            <SectionHeader icon={Send} label="Awaiting Payment" count={sent.length} accent={sent.length > 0} />
            {sent.length === 0 ? (
              <EmptyState icon={Send} message="No invoices awaiting payment." />
            ) : (
              <InvoiceTable invoices={sent} onChanged={load} />
            )}
          </div>

          <div>
            <SectionHeader icon={CheckCircle2} label="Paid" count={paid.length} />
            {paid.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No paid invoices yet." />
            ) : (
              <InvoiceTable invoices={paid} onChanged={load} />
            )}
          </div>
        </>
      )}

      {showNewModal && (
        <NewInvoiceModal tenants={tenants} onClose={() => setShowNewModal(false)} onCreated={load} />
      )}
    </div>
  )
}

function InvoiceTable({ invoices, onChanged }: { invoices: Invoice[]; onChanged: () => void }) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft divide-y divide-[hsl(var(--border))] overflow-hidden">
      {invoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} onChanged={onChanged} />)}
    </div>
  )
}

function InvoiceRow({ invoice, onChanged }: { invoice: Invoice; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [showSend, setShowSend] = useState(false)
  const [email, setEmail] = useState(invoice.sent_to_email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const payUrl = typeof window !== 'undefined' ? `${window.location.origin}/invoice/${invoice.id}/pay` : ''

  function handleSend() {
    if (!email.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendInvoice(invoice.id, email.trim())
        if (result.ok) { setShowSend(false); onChanged() }
        else setError(result.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send')
      }
    })
  }

  function handleMarkPaid() {
    startTransition(async () => { await markInvoicePaidManually(invoice.id); onChanged() })
  }

  function handleVoid() {
    if (!confirm(`Void invoice #${invoice.invoice_number}?`)) return
    startTransition(async () => { await voidInvoice(invoice.id); onChanged() })
  }

  function copyLink() {
    navigator.clipboard.writeText(payUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[15px] font-medium">
            #{invoice.invoice_number} — {invoice.tenant_name ?? 'Unknown tenant'}
          </p>
          <p className="text-[15px] text-[hsl(var(--muted-foreground))]">
            ${Number(invoice.amount).toFixed(2)} · {invoice.description || 'No description'}
          </p>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Created {fmtDate(invoice.created_at)}
            {invoice.sent_at && ` · Sent ${fmtDate(invoice.sent_at)}`}
            {invoice.paid_at && ` · Paid ${fmtDate(invoice.paid_at)}`}
          </p>
        </div>
        <span className={`text-[13px] px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLE[invoice.status]}`}>
          {invoice.status === 'sent' ? 'Awaiting payment' : invoice.status}
        </span>
      </div>

      {error && <p className="text-[14px] text-red-500">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        {invoice.status === 'draft' && !showSend && (
          <button onClick={() => setShowSend(true)} className="text-[14px] font-medium text-accent px-2 py-1 rounded-lg hover:bg-accent/10">
            Send
          </button>
        )}
        {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && showSend && (
          <div className="flex gap-2 items-center flex-1">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="flex-1 text-[14px] rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 bg-transparent outline-none"
            />
            <button disabled={isPending} onClick={handleSend} className="text-[14px] font-medium text-white bg-accent px-3 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
              {isPending ? 'Sending…' : 'Send'}
            </button>
            <button onClick={() => setShowSend(false)} className="text-[14px] text-[hsl(var(--muted-foreground))] px-2">Cancel</button>
          </div>
        )}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && !showSend && (
          <>
            <button onClick={() => setShowSend(true)} className="text-[14px] font-medium text-accent px-2 py-1 rounded-lg hover:bg-accent/10">Resend</button>
            <button onClick={copyLink} className="flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] px-2 py-1 rounded-lg hover:bg-[hsl(var(--muted))]">
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a href={payUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[14px] font-medium text-[hsl(var(--muted-foreground))] px-2 py-1 rounded-lg hover:bg-[hsl(var(--muted))]">
              <ExternalLink className="w-3.5 h-3.5" /> View
            </a>
            <button disabled={isPending} onClick={handleMarkPaid} className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg hover:bg-emerald-500/10">
              Mark paid
            </button>
          </>
        )}
        {invoice.status !== 'paid' && invoice.status !== 'void' && (
          <button disabled={isPending} onClick={handleVoid} className="text-[14px] font-medium text-red-600 dark:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10">
            Void
          </button>
        )}
      </div>
    </div>
  )
}

function NewInvoiceModal({ tenants, onClose, onCreated }: { tenants: TenantSummary[]; onClose: () => void; onCreated: () => void }) {
  const [tenantId, setTenantId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('one_time')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!tenantId || !amount) return
    setError(null)
    startTransition(async () => {
      try {
        await createInvoice({ tenantId, amount: Number(amount), description, invoiceType })
        onCreated()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create invoice')
      }
    })
  }

  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">New Invoice</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[hsl(var(--muted))]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[15px] font-medium">Customer *</label>
            <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[15px] font-medium">Amount ($) *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1249.00" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[15px] font-medium">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Setup: Custom website + CRM + onboarding" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[15px] font-medium">Invoice type</label>
            <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)} className={inputCls}>
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {error && <p className="text-[15px] text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={isPending || !tenantId || !amount}
              className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isPending ? 'Creating…' : 'Create Draft Invoice'}
            </button>
            <button onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
