'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, Circle, AlertTriangle, RefreshCw, Send, Loader2, FileBarChart, Users2, Sparkles } from 'lucide-react'
import { TenantModulesPanel } from '@/components/admin/TenantModulesPanel'
import { InventoryTierPanel } from '@/components/admin/InventoryTierPanel'
import { TenantPricingPanel } from '@/components/admin/TenantPricingPanel'
import { RenewalReminderPanel } from '@/components/admin/RenewalReminderPanel'
import { TeamPanel } from '@/components/settings/TeamPanel'
import { DeleteTenantPanel } from '@/components/admin/DeleteTenantPanel'
import type { ServiceStat, ServiceName } from '@/lib/actions/admin'
import type { TeamMember, PendingInvite } from '@/lib/actions/team'

// Zero activity isn't a problem for a brand-new or quiet account — only an
// actual unconfigured integration (the scheduler) is worth flagging in
// amber. Everything else gets a neutral "no activity yet" read instead of
// looking like something's broken.
const ACTIONABLE_STATS = new Set<ServiceName>(['scheduler'])

type Tenant = {
  id: string; name: string; slug: string; plan: string
  status: string; created_at: string
}

type Props = {
  tenant: Tenant
  stats: ServiceStat[]
  members: TeamMember[]
  pendingInvites: PendingInvite[]
  currentUserId: string
}

const BLUE = '#2a52a0'
const TEAL = '#4a9db5'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function SectionHeader({ icon: Icon, color, title, hint, right }: {
  icon: React.ElementType; color: string; title: string; hint?: string; right?: React.ReactNode
}) {
  return (
    <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
          {hint && <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{hint}</p>}
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}

export function TenantDetail({ tenant, stats, members, pendingInvites, currentUserId }: Props) {
  const router = useRouter()
  const [reportEmail, setReportEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [reportResult, setReportResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function sendReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportEmail) return
    setSending(true)
    setReportResult(null)
    try {
      const res = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, recipientEmail: reportEmail }),
      })
      const json = await res.json()
      if (json.preview) {
        setReportResult({ ok: true, message: `Preview (no Resend key): subject — ${json.subject}` })
      } else if (json.ok) {
        setReportResult({ ok: true, message: `Sent to ${reportEmail}` })
      } else {
        setReportResult({ ok: false, message: json.error ?? 'Something went wrong' })
      }
    } catch (e) {
      setReportResult({ ok: false, message: e instanceof Error ? e.message : 'Something went wrong' })
    } finally {
      setSending(false)
    }
  }

  const isActive = tenant.status === 'active'

  return (
    <div className="space-y-6 max-w-[60rem] mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> All tenants
        </button>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-[16px] flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${BLUE},${TEAL})` }}
          >
            {initials(tenant.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-black tracking-tight leading-tight">{tenant.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[13px] font-medium text-[hsl(var(--muted-foreground))]">/{tenant.slug}</span>
              <span
                className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: `${BLUE}14`, color: BLUE }}
              >
                {tenant.plan} plan
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-current opacity-60'}`} />
                {tenant.status}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.refresh()}
            className="p-2.5 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>
      </div>

      {/* Services this account is actually using */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <SectionHeader icon={Sparkles} color="#f59e0b" title="What's Running" hint="Live status for this billing cycle — updates on its own, nothing to check off" />
        <div className="divide-y divide-[hsl(var(--border))]">
          {stats.map(stat => {
            const name = stat.name as ServiceName
            const flagged = stat.status === 'needs_attention' && ACTIONABLE_STATS.has(name)
            const quiet = stat.status === 'needs_attention' && !ACTIONABLE_STATS.has(name)
            return (
              <div key={stat.name} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  flagged ? 'bg-amber-100 dark:bg-amber-900/30' : quiet ? 'bg-[hsl(var(--muted))]' : 'bg-emerald-100 dark:bg-emerald-900/30'
                }`}>
                  {flagged
                    ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    : quiet
                      ? <Circle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold">{stat.label}</p>
                  {stat.detail && (
                    <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{stat.detail}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[15px] font-bold">{stat.value}</p>
                  <p className={`text-[12px] font-semibold mt-0.5 ${
                    flagged ? 'text-amber-600 dark:text-amber-400' : quiet ? 'text-[hsl(var(--muted-foreground))]' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {flagged ? 'Needs setup' : quiet ? 'No activity yet' : 'Working'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <SectionHeader icon={Users2} color="#a855f7" title="Team" hint="Who has access, and what they can do" />
        <div className="px-5 py-4">
          <TeamPanel members={members} pending={pendingInvites} currentUserId={currentUserId} tenantId={tenant.id} />
        </div>
      </div>

      {/* Pricing + billing date — gated by super admin */}
      <TenantPricingPanel tenantId={tenant.id} />

      {/* Manual/test send for the FTC auto-renewal disclosure — gated by super admin */}
      <RenewalReminderPanel tenantId={tenant.id} />

      {/* Modules — per-tenant feature access, gated by super admin */}
      <TenantModulesPanel tenantId={tenant.id} />

      {/* Inventory Lite/Full tier — gated by super admin */}
      <InventoryTierPanel tenantId={tenant.id} />

      {/* Monthly report */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        <SectionHeader
          icon={FileBarChart} color={TEAL} title="Monthly Customer Report"
          hint="Real numbers from this account, written up by AI and emailed as a summary"
        />
        <div className="px-5 pt-3 pb-1">
          <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
            The AI only writes up numbers we&apos;ve already calculated — it never makes up or estimates a figure.
          </p>
        </div>
        <form onSubmit={sendReport} className="px-5 py-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="email"
              required
              value={reportEmail}
              onChange={e => setReportEmail(e.target.value)}
              placeholder="owner@example.com"
              className="flex-1 rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-[15px] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-accent text-white text-[15px] font-medium px-4 py-2 rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </div>
          {reportResult && (
            <p className={`text-[13px] font-medium ${reportResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {reportResult.message}
            </p>
          )}
        </form>
      </div>

      {/* Immediate hard delete — super admin only, bypasses the owner-side grace period */}
      <DeleteTenantPanel tenantId={tenant.id} tenantName={tenant.name} status={tenant.status} />
    </div>
  )
}
