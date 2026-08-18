'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { refreshMyAnalytics, type AnalyticsSnapshot } from '@/lib/actions/analytics'
import { AnalyticsView } from '@/components/analytics/AnalyticsView'

interface Order   { payment_status: string; total_amount: number; created_at: string }
interface Expense { date: string; category: string; amount: number }

type Range = 'month' | 'quarter' | 'year' | 'all'

const RANGES: { key: Range; label: string }[] = [
  { key: 'month',   label: 'Month'   },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year'    },
  { key: 'all',     label: 'All'     },
]

function inRange(dateStr: string, range: Range): boolean {
  const d   = new Date(dateStr)
  const now = new Date()
  if (range === 'all')     return true
  if (range === 'year')    return d.getFullYear() === now.getFullYear()
  if (range === 'month')   return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q
  }
  return true
}

function usd(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortUsd(n: number) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return '$' + Math.round(n)
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short' })
}

function buildChartData(orders: Order[], expenses: Expense[], range: Range) {
  const now = new Date()
  // Determine which months to show
  let months: string[] = []
  if (range === 'month') {
    // Show daily breakdown for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    months = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
  } else if (range === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3
    months = [0, 1, 2].map(i => {
      const d = new Date(now.getFullYear(), qStart + i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  } else if (range === 'year') {
    months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  } else {
    // all: last 12 months
    months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }

  const incomeMap: Record<string, number> = {}
  const expMap: Record<string, number> = {}

  if (range === 'month') {
    orders.filter(o => inRange(o.created_at, range)).forEach(o => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      incomeMap[key] = (incomeMap[key] ?? 0) + Number(o.total_amount)
    })
    expenses.filter(e => inRange(e.date + 'T00:00:00', range)).forEach(e => {
      expMap[e.date] = (expMap[e.date] ?? 0) + Number(e.amount)
    })
  } else {
    orders.filter(o => inRange(o.created_at, range)).forEach(o => {
      const key = getMonthKey(o.created_at)
      incomeMap[key] = (incomeMap[key] ?? 0) + Number(o.total_amount)
    })
    expenses.filter(e => inRange(e.date + 'T00:00:00', range)).forEach(e => {
      const key = getMonthKey(e.date + 'T00:00:00')
      expMap[key] = (expMap[key] ?? 0) + Number(e.amount)
    })
  }

  return months.map(key => ({
    key,
    label: range === 'month'
      ? String(parseInt(key.split('-')[2]))
      : getMonthLabel(key),
    income: incomeMap[key] ?? 0,
    expense: expMap[key] ?? 0,
  }))
}

const SAMPLE_DATA = [
  { key: 's1',  label: 'Jan', income: 3200,  expense: 1100 },
  { key: 's2',  label: 'Feb', income: 4800,  expense: 1600 },
  { key: 's3',  label: 'Mar', income: 2900,  expense: 2200 },
  { key: 's4',  label: 'Apr', income: 6100,  expense: 1800 },
  { key: 's5',  label: 'May', income: 5400,  expense: 2900 },
  { key: 's6',  label: 'Jun', income: 7200,  expense: 2400 },
  { key: 's7',  label: 'Jul', income: 6800,  expense: 3100 },
  { key: 's8',  label: 'Aug', income: 8300,  expense: 2700 },
  { key: 's9',  label: 'Sep', income: 5900,  expense: 3400 },
  { key: 's10', label: 'Oct', income: 9100,  expense: 3000 },
  { key: 's11', label: 'Nov', income: 7600,  expense: 2600 },
  { key: 's12', label: 'Dec', income: 11200, expense: 3800 },
]

function RevenueChart({ data, showSample }: { data: { key: string; label: string; income: number; expense: number }[]; showSample: boolean }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: typeof data[0] } | null>(null)

  const displayData = showSample ? SAMPLE_DATA : data

  const W = 600, H = 180, PL = 44, PR = 12, PT = 12, PB = 32
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const maxVal = Math.max(...displayData.map(d => Math.max(d.income, d.expense)), 1)
  const gridLines = 4

  const barGroupW = chartW / displayData.length
  const barW = Math.min(barGroupW * 0.32, 18)
  const gap = barW * 0.4

  function yPos(v: number) { return PT + chartH - (v / maxVal) * chartH }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a52a0" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a52a0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2a52a0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const v = (maxVal / gridLines) * (gridLines - i)
          const y = yPos(v)
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y} y2={y}
                stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3,4" />
              <text x={PL - 6} y={y + 4} textAnchor="end"
                fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="system-ui">
                {shortUsd(v)}
              </text>
            </g>
          )
        })}

        {/* Baseline */}
        <line x1={PL} x2={W - PR} y1={PT + chartH} y2={PT + chartH}
          stroke="hsl(var(--border))" strokeWidth="1" />

        {/* Bars */}
        {displayData.map((d, i) => {
          const cx = PL + i * barGroupW + barGroupW / 2
          const x1 = cx - gap / 2 - barW
          const x2 = cx + gap / 2

          const incH = Math.max((d.income / maxVal) * chartH, d.income > 0 ? 2 : 0)
          const expH = Math.max((d.expense / maxVal) * chartH, d.expense > 0 ? 2 : 0)

          return (
            <g key={d.key}
              onMouseEnter={e => {
                const svg = (e.currentTarget as SVGGElement).closest('svg')!.getBoundingClientRect()
                const gRect = (e.currentTarget as SVGGElement).getBoundingClientRect()
                setTooltip({ x: gRect.left - svg.left + gRect.width / 2, y: gRect.top - svg.top - 8, d })
              }}
              style={{ cursor: 'default' }}
            >
              {/* hover area */}
              <rect x={cx - barGroupW / 2} y={PT} width={barGroupW} height={chartH}
                fill="transparent" />
              {/* income bar */}
              {d.income > 0 && (
                <rect x={x1} y={PT + chartH - incH} width={barW} height={incH}
                  rx="3" fill="url(#incomeGrad)" opacity="0.9" />
              )}
              {/* expense bar */}
              {d.expense > 0 && (
                <rect x={x2} y={PT + chartH - expH} width={barW} height={expH}
                  rx="3" fill="url(#expGrad)" opacity="0.85" />
              )}
              {/* x label */}
              {(displayData.length <= 12 || i % Math.ceil(displayData.length / 10) === 0) && (
                <text x={cx} y={H - 6} textAnchor="middle"
                  fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="system-ui">
                  {d.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${(tooltip.x / 600) * 100}%`,
          top: `${(tooltip.y / 180) * 100}%`,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '120px',
          zIndex: 10,
        }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}>
            {tooltip.d.label}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2a52a0', flexShrink: 0 }} />
            <span style={{ fontSize: '15px', color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
              ${usd(tooltip.d.income)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f43f5e', flexShrink: 0 }} />
            <span style={{ fontSize: '15px', color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
              ${usd(tooltip.d.expense)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function OverviewClient({ orders, expenses, initialSnapshot }: { orders: Order[]; expenses: Expense[]; initialSnapshot: AnalyticsSnapshot | null }) {
  const [range, setRange] = useState<Range>('month')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()

  function handleRefresh() {
    setRefreshError(null)
    startRefresh(async () => {
      const result = await refreshMyAnalytics()
      if (result.ok) setSnapshot(result.snapshot)
      else setRefreshError(result.error)
    })
  }

  const { income, totalExp, net, byCategory, chartData } = useMemo(() => {
    if (!mounted) return { income: 0, totalExp: 0, net: 0, byCategory: [], chartData: [] }
    const ords = orders.filter(o => inRange(o.created_at, range))
    const exps = expenses.filter(e => inRange(e.date + 'T00:00:00', range))
    const income   = ords.reduce((s, o) => s + (Number(o.total_amount) || 0), 0)
    const totalExp = exps.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const net      = income - totalExp
    const map: Record<string, number> = {}
    exps.forEach(e => { map[e.category] = (map[e.category] ?? 0) + (Number(e.amount) || 0) })
    const byCategory = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const chartData = buildChartData(orders, expenses, range)
    return { income, totalExp, net, byCategory, chartData }
  }, [mounted, orders, expenses, range])

  const showSample = !mounted || (income === 0 && totalExp === 0)

  const maxCat = byCategory[0]?.[1] ?? 1

  return (
    <div style={{ background: 'hsl(var(--background))', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ padding: '24px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}>
            Overview
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--heading)', lineHeight: 1.2 }}>
            Your Business at a Glance
          </h1>
          <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
            {snapshot ? `Updated ${new Date(snapshot.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'No data yet — click Refresh to generate it'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, padding: '9px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', opacity: refreshing ? 0.6 : 1, flexShrink: 0 }}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {refreshError && (
        <p style={{ margin: '10px 20px 0', fontSize: '13px', color: '#c0392b', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
          {refreshError}
        </p>
      )}

      {/* Disclaimer — prominent, above range filter */}
      <div style={{
        margin: '16px 20px 0',
        padding: '12px 16px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(42,82,160,0.12) 0%, rgba(124,58,237,0.1) 100%)',
        border: '1px solid rgba(42,82,160,0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}>
        <span style={{ fontSize: '17px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>⚠️</span>
        <p style={{ fontSize: '15px', lineHeight: 1.5, color: 'hsl(var(--foreground))', margin: 0 }}>
          <strong>Reference only</strong> — not accounting, bookkeeping, or tax advice.
          Consult a licensed accountant for financial decisions.
        </p>
      </div>

      {/* Range pills */}
      <div style={{ display: 'flex', gap: '6px', padding: '12px 20px 0', overflowX: 'auto' }}>
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            style={{
              flexShrink: 0,
              padding: '5px 14px',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: range === r.key ? '#2a52a0' : 'hsl(var(--card))',
              color:      range === r.key ? '#fff'    : 'hsl(var(--muted-foreground))',
              outline:    range === r.key ? 'none'    : '1px solid hsl(var(--border))',
            }}>
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>

        {/* Hero summary card */}
        <div style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          padding: '24px',
          marginBottom: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position: 'absolute', right: '-20px', top: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', right: '30px', bottom: '-40px',
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />

          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Net
          </p>
          <p style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: '20px', fontVariantNumeric: 'tabular-nums' }}>
            {net < 0 ? '−' : '+'}&thinsp;${usd(Math.abs(net))}
          </p>

          {/* Income + Expense row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <ArrowUpRight style={{ width: '13px', height: '13px', color: '#86efac' }} />
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Income</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                ${usd(income)}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <ArrowDownRight style={{ width: '13px', height: '13px', color: '#fca5a5' }} />
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expenses</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                ${usd(totalExp)}
              </p>
            </div>
          </div>
        </div>

        {/* Revenue vs Expenses chart */}
        <div style={{
          borderRadius: '20px',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          padding: '18px 16px 10px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                Revenue vs Expenses
              </p>
              {showSample && (
                <span style={{
                  fontSize: '15px', fontWeight: 600, padding: '2px 7px', borderRadius: '100px',
                  background: 'rgba(42,82,160,0.12)', color: '#2a52a0', letterSpacing: '0.04em',
                }}>
                  SAMPLE
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#2a52a0', display: 'inline-block' }} />
                Revenue
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f43f5e', display: 'inline-block' }} />
                Expenses
              </span>
            </div>
          </div>
          <RevenueChart data={chartData} showSample={showSample} />
        </div>

        {/* Business health — revenue by service, customers, jobs */}
        {snapshot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
            <AnalyticsView snapshot={snapshot} />
          </div>
        )}

        {/* Expense breakdown */}
        {byCategory.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '10px' }}>
              Expenses by Category
            </p>
            <div style={{ borderRadius: '18px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', overflow: 'hidden' }}>
              {byCategory.map(([cat, amt], i) => (
                <div key={cat} style={{
                  padding: '13px 16px',
                  borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{cat}</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
                      ${usd(amt)}
                    </span>
                  </div>
                  <div style={{ height: '3px', borderRadius: '100px', background: 'hsl(var(--border))' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '100px',
                      width: `${(amt / maxCat) * 100}%`,
                      background: 'linear-gradient(90deg, #2a52a0, #4a9db5)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage expenses link */}
        <Link href="/overview/expenses" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderRadius: '18px',
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            cursor: 'pointer',
          }}>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '2px' }}>
                Manage Expenses
              </p>
              <p style={{ fontSize: '15px', color: 'hsl(var(--muted-foreground))' }}>
                Add, edit, or remove records
              </p>
            </div>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(42,82,160,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ArrowRight style={{ width: '15px', height: '15px', color: '#2a52a0' }} />
            </div>
          </div>
        </Link>

      </div>
    </div>
  )
}
