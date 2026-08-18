import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { Users, Calendar, UserPlus, Activity, ShoppingBag, DollarSign, LayoutGrid, BookOpen, FileText, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { WelcomeBanner } from '@/components/layout/WelcomeBanner'
import { getRecentAuditLogs, type AuditLog } from '@/lib/actions/audit'

export const metadata: Metadata = { title: 'Dashboard' }

/* ─── Accent palette (works in both themes) ──────────────────────────── */
const BLUE = '#2a52a0'
const TEAL = '#4a9db5'

/* ─── Stat Card ─────────────────────────────────────────────────────── */
type StatCardProps = {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent: string; glow: string
}
function StatCard({ label, value, sub, icon: Icon, accent, glow }: StatCardProps) {
  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: `1px solid ${accent}30`,
      borderRadius: '16px',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px hsl(var(--border))`,
    }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${accent}18`, border: `1px solid ${accent}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '18px', height: '18px', color: accent }} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${accent}cc`, marginBottom: '4px' }}>{label}</p>
          <p style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1, color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{value}</p>
          {sub && <p style={{ fontSize: '12px', marginTop: '4px', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{sub}</p>}
        </div>
      </div>
    </div>
  )
}

/* ─── Contact Status Bar ──────────────────────────────────────────────
 * A slim status bar, not a full donut+list card — the deeper active/new/
 * at-risk cut of the same contacts data now lives on /overview, so this
 * only needs to answer "what's my lead/active/inactive split" at a glance. */
function ContactStatusBar({ lead, active, inactive }: { lead: number; active: number; inactive: number }) {
  const total = lead + active + inactive || 1
  const segments = [
    { label: 'Leads',    value: lead,     color: '#f59e0b' },
    { label: 'Active',   value: active,   color: '#10b981' },
    { label: 'Inactive', value: inactive, color: BLUE },
  ]
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px 18px', height: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEAL, marginBottom: '10px' }}>Contact Status</p>
      <div style={{ display: 'flex', height: '8px', borderRadius: '999px', overflow: 'hidden', marginBottom: '10px', background: 'hsl(var(--muted))' }}>
        {segments.map(s => s.value > 0 && (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {segments.map(s => (
          <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            {s.label} <strong style={{ color: 'hsl(var(--foreground))' }}>{s.value}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Needs Attention ─────────────────────────────────────────────────
 * Combines what used to be two separate full panels (Invoice Escalations,
 * Review Requests) into one compact card of two stat pairs — the detail
 * lists moved to Settings, since a dashboard glance only needs the count. */
function NeedsAttentionCard({ escalationCount, reviewRequestCount }: { escalationCount: number; reviewRequestCount: number }) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '16px 18px', height: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TEAL, marginBottom: '10px' }}>Needs Attention</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Link href="/settings" style={{ flex: 1, textDecoration: 'none', borderRadius: '10px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <p style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{escalationCount}</p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', opacity: 0.85, marginTop: '4px' }}>Invoice Escalations</p>
        </Link>
        <Link href="/settings" style={{ flex: 1, textDecoration: 'none', borderRadius: '10px', padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
          <p style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{reviewRequestCount}</p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', opacity: 0.85, marginTop: '4px' }}>Review Requests</p>
        </Link>
      </div>
    </div>
  )
}

/* ─── Recent Contact Row ─────────────────────────────────────────────── */
function RecentContactRow({ c }: { c: { id: string; first_name: string; last_name: string | null; email: string | null; status: string } }) {
  const initials = `${c.first_name[0]}${c.last_name?.[0] ?? ''}`.toUpperCase()
  const badge: Record<string, { color: string; label: string }> = {
    lead:     { color: '#f59e0b', label: 'Lead'     },
    active:   { color: '#10b981', label: 'Active'   },
    inactive: { color: BLUE,      label: 'Inactive' },
  }
  const b = badge[c.status] ?? { color: 'hsl(var(--muted-foreground))', label: c.status }
  return (
    <Link href={`/contacts/${c.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '12px', textDecoration: 'none', transition: 'background .15s' }}
      className="hover:bg-[hsl(var(--muted))]">
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 900, color: '#fff', background: `linear-gradient(135deg,${BLUE},${TEAL})` }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.first_name} {c.last_name}</p>
        {c.email && <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</p>}
      </div>
      <span style={{ fontSize: '15px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}35`, flexShrink: 0, letterSpacing: '0.05em' }}>{b.label}</span>
    </Link>
  )
}

/* ─── Recent Order Row ───────────────────────────────────────────────── */
function RecentOrderRow({ o }: { o: { id: string; total_amount: number; payment_status: string; created_at: string; contact: { first_name: string; last_name: string | null } | null } }) {
  const STATUS: Record<string, string> = { paid: '#10b981', pending: '#f59e0b', draft: 'hsl(var(--muted-foreground))', refunded: BLUE }
  const col = STATUS[o.payment_status] ?? STATUS.draft
  const name = o.contact ? `${o.contact.first_name} ${o.contact.last_name ?? ''}`.trim() : 'No contact'
  return (
    <Link href={`/orders/${o.id}`}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '12px', textDecoration: 'none', transition: 'background .15s' }}
      className="hover:bg-[hsl(var(--muted))]">
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)' }}>
        <ShoppingBag style={{ width: '15px', height: '15px', color: '#10b981' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
        <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{new Date(o.created_at).toLocaleDateString()}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 900, color: 'hsl(var(--foreground))' }}>${Number(o.total_amount).toFixed(2)}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: `${col}15`, color: col, border: `1px solid ${col}35`, letterSpacing: '0.05em', textTransform: 'capitalize' }}>{o.payment_status}</span>
      </div>
    </Link>
  )
}

/* ─── Quick Action ───────────────────────────────────────────────────── */
function QuickAction({ href, icon: Icon, label, color }: { href: string; icon: React.ElementType; label: string; color: string }) {
  return (
    <Link href={href}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 8px', borderRadius: '14px', textDecoration: 'none', background: `${color}0d`, border: `1px solid ${color}25`, transition: 'all .18s' }}
      className="hover:scale-[1.04]">
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon style={{ width: '18px', height: '18px', color }} strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--foreground))', textAlign: 'center', letterSpacing: '0.01em' }}>{label}</span>
    </Link>
  )
}

/* ─── Panel wrapper ─────────────────────────────────────────────────── */
function Panel({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${TEAL}66, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '15px', fontWeight: 800, color: 'hsl(var(--foreground))', letterSpacing: '-0.01em' }}>{title}</p>
        {href && (
          <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '15px', fontWeight: 700, color: TEAL, textDecoration: 'none' }}>
            {linkLabel} <ArrowUpRight style={{ width: '13px', height: '13px' }} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

/* ─── Recent Activity Row ────────────────────────────────────────────── */
const ACTIVITY_LABEL: Record<string, string> = {
  contact_created: 'created contact', contact_updated: 'updated contact', contact_deleted: 'deleted contact',
  event_created: 'created event', event_updated: 'updated event', event_deleted: 'deleted event',
  note_created: 'added a note',
  template_created: 'created template', template_updated: 'updated template', template_deleted: 'deleted template',
  login: 'signed in', logout: 'signed out',
  invite_sent: 'sent an invite', role_changed: 'changed a role', user_removed: 'removed a user',
  invoice_reminder_sent: 'sent an invoice reminder', invoice_escalated: 'escalated an unpaid invoice',
  review_request_sent: 'sent a review request', review_reminder_sent: 'sent a review follow-up',
  automation_settings_updated: 'updated automation settings',
}
function ActivityRow({ log }: { log: AuditLog }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${TEAL}18`, border: `1px solid ${TEAL}30` }}>
        <Activity style={{ width: '13px', height: '13px', color: TEAL }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', color: 'hsl(var(--foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong>{log.user_email}</strong> {ACTIVITY_LABEL[log.action] ?? log.action}
          {log.resource_name ? ` — ${log.resource_name}` : ''}
        </p>
      </div>
      <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>
        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('users').select('has_seen_welcome').eq('id', user.id).single()
    : { data: null }
  const showWelcome = (profile as { has_seen_welcome?: boolean } | null)?.has_seen_welcome === false
  const isAdmin = user?.app_metadata?.role === 'owner'
  const recentActivity = isAdmin ? await getRecentAuditLogs(5) : []
  // Detail rows for these no longer render here (Needs Attention is just
  // the two counts) — Settings has the real list for each.
  let escalationCount = 0
  let reviewRequestCount = 0
  if (isAdmin) {
    try {
      const [escalations, reviewRequests] = await Promise.all([
        supabase.from('invoice_escalations').select('id', { count: 'exact', head: true }),
        supabase.from('review_requests').select('id', { count: 'exact', head: true }),
      ])
      escalationCount = escalations.count ?? 0
      reviewRequestCount = reviewRequests.count ?? 0
    } catch { /* tables not migrated yet */ }
  }

  const [
    { count: totalContacts },
    { count: newThisMonth },
    { data: byStatus },
    { data: recentContacts },
    { count: upcomingEvents },
    { data: paidOrders },
    { data: recentOrders },
    { count: openDeals },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('contacts').select('status'),
    supabase.from('contacts').select('id, first_name, last_name, email, status').order('created_at', { ascending: false }).limit(5),
    supabase.from('events').select('*', { count: 'exact', head: true }).gte('starts_at', now.toISOString()),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', startOfMonth),
    supabase.from('orders').select('id, total_amount, payment_status, created_at, contact:contacts(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('pipeline_deals').select('*', { count: 'exact', head: true }).then(r => r, () => ({ count: 0, data: null, error: null })),
  ])

  const revenueThisMonth = (paidOrders ?? []).reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
  const statusCounts = { lead: 0, active: 0, inactive: 0 }
  for (const row of (byStatus ?? []) as { status: string }[]) {
    if (row.status in statusCounts) statusCounts[row.status as keyof typeof statusCounts]++
  }
  const fmtRevenue = revenueThisMonth >= 1000 ? `$${(revenueThisMonth/1000).toFixed(1)}k` : `$${revenueThisMonth.toFixed(0)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {showWelcome && <WelcomeBanner />}

      {/* Header */}
      <div>
        <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEAL, marginBottom: '4px' }}>
          CRM
        </p>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--heading)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
          Here&apos;s your business at a glance
        </p>
      </div>

      {/* Stat grid — hardcoded media query instead of a Tailwind responsive
          class: the lg:grid-cols-4 utility was intermittently not making it
          into the rendered className on this specific div in production
          (confirmed via the live DOM — class read back as "lg:grid-cols-4"
          alone, missing the base "grid-cols-2"), stuck at 2 columns on
          desktop with no code-level cause found. Inline critical CSS can't
          be purged or dropped, so it can't silently regress the same way. */}
      <style>{`
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 1024px) {
          .stat-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
      <div className="stat-grid">
        <StatCard label="Total Contacts" value={totalContacts ?? 0} sub={`+${newThisMonth ?? 0} this month`} icon={Users} accent={BLUE} glow={`${BLUE}44`} />
        <StatCard label="Revenue (Month)" value={fmtRevenue} sub="paid orders" icon={DollarSign} accent="#10b981" glow="rgba(16,185,129,0.35)" />
        <StatCard label="Pipeline Deals" value={openDeals ?? 0} sub="open deals" icon={LayoutGrid} accent="#f97316" glow="rgba(249,115,22,0.35)" />
        <StatCard label="Upcoming Events" value={upcomingEvents ?? 0} sub="on calendar" icon={Calendar} accent={TEAL} glow={`${TEAL}44`} />
      </div>

      {/* Contact status + needs attention — the revenue trend chart and
          deeper active/new/at-risk cut of contacts now live on /overview,
          so this row stays a quick glance, not a duplicate of that page. */}
      <div style={{ display: 'grid', gap: '16px' }} className={isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}>
        <ContactStatusBar lead={statusCounts.lead} active={statusCounts.active} inactive={statusCounts.inactive} />
        {isAdmin && <NeedsAttentionCard escalationCount={escalationCount} reviewRequestCount={reviewRequestCount} />}
      </div>

      {/* Recent lists */}
      <div style={{ display: 'grid', gap: '16px', alignItems: 'start' }} className="grid-cols-1 lg:grid-cols-2">
        <Panel title="Recent Contacts" href="/contacts" linkLabel="View all">
          {(recentContacts ?? []).length === 0
            ? <p style={{ fontSize: '15px', textAlign: 'center', padding: '24px 0', color: 'hsl(var(--muted-foreground))' }}>No contacts yet.</p>
            : (recentContacts as { id: string; first_name: string; last_name: string | null; email: string | null; status: string }[]).map(c => (
                <RecentContactRow key={c.id} c={c} />
              ))
          }
        </Panel>
        <Panel title="Recent Orders" href="/orders" linkLabel="View all">
          {(recentOrders ?? []).length === 0
            ? <p style={{ fontSize: '15px', textAlign: 'center', padding: '24px 0', color: 'hsl(var(--muted-foreground))' }}>No orders yet.</p>
            : (recentOrders as { id: string; total_amount: number; payment_status: string; created_at: string; contact: { first_name: string; last_name: string | null } | null }[]).map(o => (
                <RecentOrderRow key={o.id} o={o} />
              ))
          }
        </Panel>
      </div>

      {/* Recent activity (admin only) */}
      {isAdmin && (
        <Panel title="Recent Activity" href="/settings" linkLabel="Audit trail">
          {recentActivity.length === 0
            ? <p style={{ fontSize: '15px', textAlign: 'center', padding: '24px 0', color: 'hsl(var(--muted-foreground))' }}>No activity yet.</p>
            : recentActivity.map(log => <ActivityRow key={log.id} log={log} />)
          }
        </Panel>
      )}

      {/* Quick actions */}
      <Panel title="Quick Actions">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="sm:grid-cols-6">
          <QuickAction href="/contacts/new"  icon={UserPlus}    label="Add Contact"   color={BLUE} />
          <QuickAction href="/orders"        icon={ShoppingBag} label="New Order"     color="#10b981" />
          <QuickAction href="/pipeline"      icon={Activity}    label="Pipeline"      color="#f97316" />
          <QuickAction href="/templates/new" icon={FileText}    label="New Template"  color="#a855f7" />
          <QuickAction href="/calendar"      icon={Calendar}    label="Calendar"      color={TEAL} />
          <QuickAction href="/inventory"     icon={BookOpen}    label="Inventory"     color="#ec4899" />
        </div>
      </Panel>
    </div>
  )
}

