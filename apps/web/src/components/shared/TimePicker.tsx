'use client'

// Custom segmented time picker (hour / minute / AM-PM) — replaces native
// <input type="time">, whose picker UI lists every minute regardless of the
// `step` attribute in Chrome (step only affects arrow-key increments there).
// `value`/`onChange` use 24h "HH:MM" strings, same shape a time input would
// give you, so callers don't need to change their state handling.

type Period = 'AM' | 'PM'

function to24h(hour12: number, period: Period): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

function parseValue(value: string): { hour12: string; minute: string; period: Period } {
  if (!value) return { hour12: '', minute: '', period: 'AM' }
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr, 10)
  const period: Period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour12: String(hour12), minute: mStr ?? '00', period }
}

type Variant = 'app' | 'standalone'

const APP_SELECT_CLS = 'flex-1 min-w-0 bg-transparent outline-none text-[15px] py-2.5 text-center cursor-pointer appearance-none'
const APP_CONTAINER_CLS = 'flex items-stretch rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 min-w-[136px] flex-shrink-0 transition-shadow focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent'

const STANDALONE_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'stretch', borderRadius: '10px',
  border: '1px solid rgba(26,48,112,0.15)', background: '#fff', padding: '0 4px',
  minWidth: '140px', flexShrink: 0,
}
const STANDALONE_SELECT_STYLE: React.CSSProperties = {
  flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
  fontSize: '15px', padding: '12px 0', textAlign: 'center', cursor: 'pointer', color: '#171a2b',
}

export function TimePicker({
  value,
  onChange,
  variant = 'app',
  className,
}: {
  value: string
  onChange: (v: string) => void
  variant?: Variant
  className?: string
}) {
  const parsed = parseValue(value)
  const isApp = variant === 'app'

  function update(part: Partial<{ hour12: string; minute: string; period: Period }>) {
    const next = { ...parsed, ...part }
    if (!next.hour12) { onChange(''); return }
    const minute = next.minute || '00'
    const h24 = to24h(parseInt(next.hour12, 10), next.period)
    onChange(`${String(h24).padStart(2, '0')}:${minute}`)
  }

  const selectCls = isApp ? APP_SELECT_CLS : undefined
  const selectStyle = isApp ? { color: 'hsl(var(--foreground))' } : STANDALONE_SELECT_STYLE
  const sep = isApp
    ? <div className="flex items-center text-[hsl(var(--muted-foreground))] px-0.5">:</div>
    : <div style={{ display: 'flex', alignItems: 'center', color: '#9aa0ae', padding: '0 2px' }}>:</div>

  return (
    <div className={isApp ? `${APP_CONTAINER_CLS} ${className ?? ''}` : className} style={isApp ? undefined : STANDALONE_STYLE}>
      <select value={parsed.hour12} onChange={e => update({ hour12: e.target.value })} className={selectCls} style={selectStyle}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      {sep}
      <select value={parsed.minute} onChange={e => update({ minute: e.target.value })} className={selectCls} style={selectStyle}>
        <option value="">--</option>
        <option value="00">00</option>
        <option value="30">30</option>
      </select>
      <select value={parsed.period} onChange={e => update({ period: e.target.value as Period })} className={selectCls} style={selectStyle} disabled={!parsed.hour12}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
