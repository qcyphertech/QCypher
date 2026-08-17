'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, CheckCircle2, Users, ClipboardCheck, AlertTriangle, LayoutGrid, ScrollText, Receipt, Gift, ShieldAlert, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApprovalRequestsPanel } from '@/components/admin/ApprovalRequestsPanel'
import { AdminAuditTrailPanel } from '@/components/admin/AdminAuditTrailPanel'
import { IncidentsPanel } from '@/components/admin/IncidentsPanel'
import { SecurityPanel } from '@/components/admin/SecurityPanel'
import { PlatformModulesPanel } from '@/components/admin/PlatformModulesPanel'
import { InvoicesPanel } from '@/components/admin/InvoicesPanel'
import { ClientsPanel } from '@/components/admin/ClientsPanel'
import { ReferralProgramPanel } from '@/components/admin/ReferralProgramPanel'
import { DocumentsPanel } from '@/components/admin/DocumentsPanel'
import { listTenants, type TenantSummary } from '@/lib/actions/admin-console'

type Tenant = {
  id: string; name: string; slug: string; plan: string
  status: 'active' | 'suspended' | 'trial' | 'pending_deletion' | 'deleted'; is_admin: boolean; created_at: string
}

const TABS = [
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'approvals', label: 'Approval Requests', icon: ClipboardCheck },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'security', label: 'Security', icon: ShieldAlert },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'modules', label: 'Modules', icon: LayoutGrid },
  { id: 'audit', label: 'Audit Trail', icon: ScrollText },
  { id: 'documents', label: 'Documents', icon: FileText },
] as const
type TabId = typeof TABS[number]['id']

type Props = {
  tenants: Tenant[]
  totalClients: number
  filteredCount: number
  page: number
  pageSize: number
  isSuperAdmin?: boolean
  availablePlans: string[]
}

export function AdminDashboard({ tenants, totalClients, filteredCount, page, pageSize, isSuperAdmin = false, availablePlans }: Props) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [tab, setTab] = useState<TabId>('clients')

  // The Clients tab is paginated for scale (thousands of tenants); the
  // Approvals/Incidents/Audit tabs still need a tenant picker, so that
  // full list is fetched separately and lazily, only once one of those
  // tabs is actually opened.
  const [allTenants, setAllTenants] = useState<TenantSummary[]>([])
  const [allTenantsLoaded, setAllTenantsLoaded] = useState(false)

  useEffect(() => {
    const needsFullList = tab === 'approvals' || tab === 'incidents' || tab === 'audit' || tab === 'invoices'
    if (needsFullList && isSuperAdmin && !allTenantsLoaded) {
      listTenants().then(t => { setAllTenants(t); setAllTenantsLoaded(true) })
    }
  }, [tab, isSuperAdmin, allTenantsLoaded])

  const visibleTabs = isSuperAdmin ? TABS : TABS.filter(t => t.id === 'clients')

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#2a52a0] to-[#4a9db5] bg-clip-text text-transparent">
            Admin Portal
          </h1>
          <p className="text-[14px] text-[hsl(var(--muted-foreground))] mt-1">
            {totalClients} client workspace{totalClients !== 1 ? 's' : ''}
          </p>
        </div>
        {tab === 'clients' && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#2a52a0] to-[#4a9db5] text-white text-[14px] font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:brightness-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            Invite client
          </button>
        )}
      </div>

      {visibleTabs.length > 1 && (
        <div className="flex gap-1 p-1 rounded-2xl bg-[hsl(var(--muted))]/60 overflow-x-auto">
          {visibleTabs.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 text-[14px] font-medium px-3.5 py-2 rounded-xl whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  active
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', active && 'text-accent')} />
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {tab === 'clients' && (
        <ClientsPanel
          tenants={tenants}
          totalClients={totalClients}
          filteredCount={filteredCount}
          page={page}
          pageSize={pageSize}
          isSuperAdmin={isSuperAdmin}
          availablePlans={availablePlans}
        />
      )}

      {tab === 'approvals' && isSuperAdmin && <ApprovalRequestsPanel />}
      {tab === 'incidents' && isSuperAdmin && <IncidentsPanel tenants={allTenants} />}
      {tab === 'security' && isSuperAdmin && <SecurityPanel />}
      {tab === 'invoices' && isSuperAdmin && <InvoicesPanel tenants={allTenants} />}
      {tab === 'referrals' && isSuperAdmin && <ReferralProgramPanel />}
      {tab === 'modules' && isSuperAdmin && <PlatformModulesPanel />}
      {tab === 'audit' && isSuperAdmin && <AdminAuditTrailPanel tenants={allTenants} />}
      {tab === 'documents' && isSuperAdmin && <DocumentsPanel />}

      {showInvite && <InviteModal onClose={() => { setShowInvite(false); router.refresh() }} />}
    </div>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', email: '', referredByTenantId: '' })
  const [referrerOptions, setReferrerOptions] = useState<TenantSummary[]>([])

  useEffect(() => {
    listTenants().then(setReferrerOptions)
  }, [])

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, referredByTenantId: form.referredByTenantId || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      setSuccess(true)
      router.refresh()
      setTimeout(onClose, 1500)
    })
  }

  const inputCls = 'w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-transparent outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[hsl(var(--card))] rounded-t-2xl sm:rounded-2xl shadow-card" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-[15px] font-semibold">Invite new client</h2>
        </div>
        {success ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-[15px] font-medium">Invite sent!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Business name *</label>
              <input
                required value={form.name}
                onChange={e => {
                  const name = e.target.value
                  setForm(prev => ({ ...prev, name, slug: prev.slug || autoSlug(name) }))
                }}
                placeholder="Acme Plumbing"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Workspace slug *</label>
              <input required value={form.slug} onChange={set('slug')} placeholder="acme-plumbing" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Owner email *</label>
              <input required type="email" value={form.email} onChange={set('email')} placeholder="owner@example.com" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[15px] font-medium">Referred by (optional)</label>
              <select value={form.referredByTenantId} onChange={set('referredByTenantId')} className={inputCls}>
                <option value="">No referral</option>
                {referrerOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {error && <p className="text-[15px] text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending} className="bg-accent text-white text-[15px] font-medium px-5 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50">
                {isPending ? 'Sending…' : 'Send invite'}
              </button>
              <button type="button" onClick={onClose} className="text-[15px] text-[hsl(var(--muted-foreground))] px-4 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
