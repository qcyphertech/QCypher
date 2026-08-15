// Pure date math for recurring_jobs — no I/O. Shared by the create-form's
// "next occurrence" preview and the schedule-recurring-jobs cron, so both
// always agree on what "the next date" means for a given pattern.

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function addMonthsClamped(date: Date, months: number, dayOfMonth: number | null): Date {
  const day = dayOfMonth ?? date.getUTCDate()
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDayOfTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDayOfTargetMonth))
  return target
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** `from` is a YYYY-MM-DD date string. Returns the next occurrence as YYYY-MM-DD. */
export function computeNextOccurrence(
  from: string,
  frequency: RecurrenceFrequency,
  dayOfMonth: number | null,
  intervalDays: number | null,
): string {
  const fromDate = new Date(`${from}T00:00:00.000Z`)

  switch (frequency) {
    case 'weekly':
      return toISODate(addDays(fromDate, 7))
    case 'biweekly':
      return toISODate(addDays(fromDate, 14))
    case 'monthly':
      return toISODate(addMonthsClamped(fromDate, 1, dayOfMonth))
    case 'quarterly':
      return toISODate(addMonthsClamped(fromDate, 3, dayOfMonth))
    case 'annually':
      return toISODate(addMonthsClamped(fromDate, 12, dayOfMonth))
    case 'custom':
      return toISODate(addDays(fromDate, intervalDays ?? 30))
  }
}
