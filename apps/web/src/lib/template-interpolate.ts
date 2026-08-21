const SMS_OPTOUT = 'Reply STOP to unsubscribe.'

interface InterpolateContext {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  phone?: string | null
  business_name?: string | null
  appointment_date?: string | null
  amount_due?: string | null
}

// Only these are worth blocking a send over — an email that starts "Hi
// ⚠{{first_name}}" is an obvious mistake. Every other variable degrades
// gracefully (falls back to a template-supplied default, or silently
// blank) since e.g. "your appointment on {{appointment_date}}" not
// applying to every contact isn't actually an error.
const HARD_BLOCK_KEYS = new Set(['first_name', 'last_name'])

export const TEMPLATE_VARIABLES = [
  { key: 'first_name',       label: 'First name' },
  { key: 'last_name',        label: 'Last name' },
  { key: 'company',          label: 'Company' },
  { key: 'phone',            label: 'Phone' },
  { key: 'business_name',    label: 'Business name' },
  { key: 'appointment_date', label: 'Appointment date' },
  { key: 'amount_due',       label: 'Amount due' },
] as const

/**
 * Substitutes {{variable}} and {{variable|"fallback text"}} placeholders
 * with real values.
 *
 * - Resolved variable → its value.
 * - Unresolved with a template-supplied fallback → the fallback text.
 * - Unresolved, no fallback, name field (first_name/last_name) → left as
 *   ⚠{{variable}} so staff notice before sending — this is the only case
 *   that should block a send.
 * - Unresolved, no fallback, anything else → renders blank. Not every
 *   contact has an upcoming appointment or a pending balance; that's a
 *   normal, not an error.
 */
export function interpolate(body: string, ctx: InterpolateContext): string {
  const map: Record<string, string | null | undefined> = {
    first_name:       ctx.first_name,
    last_name:        ctx.last_name,
    company:          ctx.company,
    phone:            ctx.phone,
    business_name:    ctx.business_name,
    appointment_date: ctx.appointment_date,
    amount_due:       ctx.amount_due,
  }

  return body.replace(/\{\{(\w+)(?:\|"([^"]*)")?\}\}/g, (match, key, fallback) => {
    const val = map[key]
    if (val != null && val !== '') return val
    if (fallback != null) return fallback
    if (HARD_BLOCK_KEYS.has(key)) return `⚠{{${key}}}`
    return ''
  })
}

/**
 * Whether a rendered preview has an unresolved variable serious enough to
 * block sending — only first_name/last_name warnings count.
 */
export function hasBlockingUnresolved(rendered: string): boolean {
  return /⚠\{\{/.test(rendered)
}

/**
 * Appends the SMS opt-out line to marketing SMS sends.
 * Called at the send layer — not editable template text.
 */
export function appendOptOut(body: string): string {
  if (body.includes(SMS_OPTOUT)) return body
  return `${body}\n${SMS_OPTOUT}`
}
