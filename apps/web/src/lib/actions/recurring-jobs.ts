'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderNeutralEmail } from '@/lib/email/neutral'
import { revalidatePath } from 'next/cache'
import { computeNextOccurrence, formatTimeLabel, type RecurrenceFrequency } from '@/lib/recurrence'

export type RecurringJob = {
  id: string
  contact_id: string
  catalog_item_id: string | null
  title: string
  description: string | null
  amount: number
  frequency: RecurrenceFrequency
  interval_days: number | null
  day_of_month: number | null
  next_scheduled_date: string | null
  scheduled_time: string | null
  status: 'active' | 'paused' | 'cancelled'
  send_reminder: boolean
  reminder_days_before: number
  auto_confirm_if_no_reply: boolean
  created_at: string
}

async function requireOwnerCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') throw new Error('Only account admins can manage recurring jobs')

  const tenantId = await getTenantId(user.id, user.app_metadata)
  return { userId: user.id, tenantId, admin }
}

// ─── Tenant-facing CRUD ────────────────────────────────────────────────────

export async function createRecurringJob(input: {
  contactId: string
  catalogItemId?: string | null
  title: string
  description?: string | null
  amount: number
  frequency: RecurrenceFrequency
  intervalDays?: number | null
  dayOfMonth?: number | null
  startDate: string
  scheduledTime?: string | null
  sendReminder: boolean
  reminderDaysBefore: number
  autoConfirmIfNoReply: boolean
}): Promise<{ ok: true; id: string; nextDate: string } | { ok: false; error: string }> {
  const { userId, tenantId, admin } = await requireOwnerCaller()

  const { data, error } = await admin
    .from('recurring_jobs')
    .insert({
      tenant_id: tenantId,
      contact_id: input.contactId,
      catalog_item_id: input.catalogItemId ?? null,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount,
      frequency: input.frequency,
      interval_days: input.frequency === 'custom' ? (input.intervalDays ?? 30) : null,
      day_of_month: ['monthly', 'quarterly', 'annually'].includes(input.frequency) ? input.dayOfMonth : null,
      next_scheduled_date: input.startDate,
      scheduled_time: input.scheduledTime || null,
      send_reminder: input.sendReminder,
      reminder_days_before: input.reminderDaysBefore,
      auto_confirm_if_no_reply: input.autoConfirmIfNoReply,
      created_by: userId,
    })
    .select('id, next_scheduled_date')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${input.contactId}`)
  return { ok: true, id: data.id, nextDate: data.next_scheduled_date! }
}

export async function updateRecurringJob(id: string, input: {
  title: string
  description?: string | null
  amount: number
  frequency: RecurrenceFrequency
  intervalDays?: number | null
  dayOfMonth?: number | null
  scheduledTime?: string | null
  sendReminder: boolean
  reminderDaysBefore: number
  autoConfirmIfNoReply: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, admin } = await requireOwnerCaller()

  const { data: job } = await admin.from('recurring_jobs').select('contact_id, title, amount, scheduled_time').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!job) return { ok: false, error: 'Recurring job not found' }

  const priceChanged = Number(job.amount) !== input.amount
  const timeChanged = (job.scheduled_time?.slice(0, 5) ?? '') !== (input.scheduledTime ?? '')

  const { error } = await admin.from('recurring_jobs').update({
    title: input.title,
    description: input.description ?? null,
    amount: input.amount,
    frequency: input.frequency,
    interval_days: input.frequency === 'custom' ? (input.intervalDays ?? 30) : null,
    day_of_month: ['monthly', 'quarterly', 'annually'].includes(input.frequency) ? input.dayOfMonth : null,
    scheduled_time: input.scheduledTime || null,
    send_reminder: input.sendReminder,
    reminder_days_before: input.reminderDaysBefore,
    auto_confirm_if_no_reply: input.autoConfirmIfNoReply,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/contacts/${job.contact_id}`)

  if (priceChanged || timeChanged) {
    await notifyAffectedOccurrences(admin, id, tenantId, {
      title: input.title, description: input.description ?? null, amount: input.amount,
      scheduledTime: input.scheduledTime ?? null, priceChanged, timeChanged,
    })
  }

  return { ok: true }
}

// Propagates a price/time edit to any not-yet-paid occurrence already
// created for this series, and lets the customer know — the reminder email
// they may have already gotten (or the appointment they already confirmed)
// would otherwise silently go stale.
async function notifyAffectedOccurrences(
  admin: ReturnType<typeof createAdminClient>,
  recurringJobId: string,
  tenantId: string,
  changes: { title: string; description: string | null; amount: number; scheduledTime: string | null; priceChanged: boolean; timeChanged: boolean },
) {
  const { data: orders } = await admin
    .from('orders')
    .select('id, confirm_token, scheduled_date, customer_response, contacts(first_name, email)')
    .eq('recurring_job_id', recurringJobId)
    .neq('payment_status', 'paid')
  if (!orders?.length) return

  const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
  const businessName = tenant?.name ?? 'your service provider'
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'

  for (const order of orders as unknown as Array<{
    id: string; confirm_token: string; scheduled_date: string; customer_response: string | null
    contacts: { first_name: string; email: string | null } | null
  }>) {
    // Price always reflects the current series terms; time only if the
    // customer hasn't already picked their own via reschedule.
    const patch: Record<string, unknown> = {}
    if (changes.priceChanged) {
      await admin.from('order_line_items')
        .update({ item_name_snapshot: changes.title, description_snapshot: changes.description, unit_price: changes.amount })
        .eq('order_id', order.id)
    }
    if (changes.timeChanged && order.customer_response !== 'reschedule_requested') {
      patch.scheduled_time = changes.scheduledTime
    }
    if (Object.keys(patch).length) {
      await admin.from('orders').update(patch).eq('id', order.id)
    }

    const contact = order.contacts
    if (!contact?.email) continue

    const dateLabel = new Date(`${order.scheduled_date}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    const link = `${appUrl}/recurring/${order.confirm_token}`

    await sendEmail({
      to: contact.email,
      subject: `Updated details for your ${changes.title} appointment`,
      html: renderNeutralEmail({
        senderName: businessName,
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a202c;">Your appointment details changed</p>
          <p style="margin:16px 0 0;">Hi ${contact.first_name ?? 'there'},</p>
          <p style="margin:16px 0 0;">${businessName} updated your ${changes.title} appointment on ${dateLabel}:</p>
          <ul style="margin:12px 0 0;padding-left:20px;color:#1a202c;">
            ${changes.priceChanged ? `<li>New price: <strong>$${changes.amount.toFixed(2)}</strong></li>` : ''}
            ${changes.timeChanged && order.customer_response !== 'reschedule_requested' ? `<li>New time: <strong>${changes.scheduledTime ? formatTimeLabel(changes.scheduledTime) : 'unscheduled'}</strong></li>` : ''}
          </ul>
          <p style="margin:16px 0 0;font-size:13px;color:#718096;">Review and reconfirm using the button below if needed.</p>
        `,
        cta: { label: 'Review appointment', href: link },
      }),
    })
  }
}

async function setStatus(id: string, status: 'active' | 'paused' | 'cancelled') {
  const { tenantId, admin } = await requireOwnerCaller()

  const { data: job } = await admin.from('recurring_jobs').select('contact_id').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!job) return { ok: false as const, error: 'Recurring job not found' }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'paused') patch.paused_at = new Date().toISOString()
  if (status === 'cancelled') patch.cancelled_at = new Date().toISOString()
  if (status === 'active') { patch.paused_at = null }

  const { error } = await admin.from('recurring_jobs').update(patch).eq('id', id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath(`/contacts/${job.contact_id}`)
  return { ok: true as const }
}

export async function pauseRecurringJob(id: string) {
  return setStatus(id, 'paused')
}

export async function resumeRecurringJob(id: string) {
  return setStatus(id, 'active')
}

export async function cancelRecurringJob(id: string) {
  // Cancelling stops future occurrences from being scheduled — it does not
  // touch orders already created (past/current occurrences stand as-is).
  return setStatus(id, 'cancelled')
}

export async function listRecurringJobsForContact(contactId: string): Promise<RecurringJob[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recurring_jobs')
    .select('id, contact_id, catalog_item_id, title, description, amount, frequency, interval_days, day_of_month, next_scheduled_date, scheduled_time, status, send_reminder, reminder_days_before, auto_confirm_if_no_reply, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  return (data ?? []) as RecurringJob[]
}

// ─── Public, token-based customer response (no login — mirrors payment_requests) ──

function admin() {
  return createAdminClient()
}

export async function getRecurringOrderByToken(token: string) {
  const db = admin()
  const { data } = await db
    .from('orders')
    .select(`
      id, tenant_id, customer_id, total_amount, payment_status, scheduled_date, scheduled_time,
      confirm_token_expires_at, customer_response, reschedule_to_date,
      recurring_jobs(title, description),
      contacts(first_name, last_name, email),
      tenants(name)
    `)
    .eq('confirm_token', token)
    .not('recurring_job_id', 'is', null)
    .maybeSingle()
  return data
}

export async function respondToRecurringOrder(
  token: string,
  action: 'approve' | 'skip' | 'reschedule',
  opts?: { rescheduleToDate?: string; rescheduleToTime?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = admin()

  const { data: order } = await db
    .from('orders')
    .select('id, tenant_id, customer_id, payment_status, scheduled_date, customer_response, confirm_token_expires_at, recurring_jobs(title), contacts(first_name, last_name)')
    .eq('confirm_token', token)
    .not('recurring_job_id', 'is', null)
    .maybeSingle()
  if (!order) return { ok: false, error: 'This link is not valid.' }
  // Customers can change their mind (approve -> reschedule -> skip -> approve,
  // etc) right up until it's actually paid or the link expires — no
  // "already responded" lockout.
  if (order.payment_status === 'paid') return { ok: false, error: 'This has already been paid — contact the business to make changes.' }
  if (order.confirm_token_expires_at && new Date(order.confirm_token_expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'This link has expired.' }
  }

  const now = new Date().toISOString()

  if (action === 'approve') {
    const { error } = await db.from('orders').update({
      customer_response: 'approved',
      customer_response_at: now,
    }).eq('id', order.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  if (action === 'skip') {
    // Just marked skipped, not deleted — the customer can still change
    // their mind (approve/reschedule) via the same link until it expires.
    const { error } = await db.from('orders').update({
      customer_response: 'skip',
      customer_response_at: now,
    }).eq('id', order.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  // reschedule
  const newDate = opts?.rescheduleToDate
  if (!newDate) return { ok: false, error: 'Pick a new date.' }
  const original = new Date(order.scheduled_date!)
  const picked = new Date(newDate)
  const diffDays = Math.abs((picked.getTime() - original.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays > 14) return { ok: false, error: 'Please pick a date within 14 days of the original appointment.' }

  const newTime = opts?.rescheduleToTime || null

  const { error } = await db.from('orders').update({
    scheduled_date: newDate,
    scheduled_time: newTime,
    reschedule_to_date: newDate,
    customer_response: 'reschedule_requested',
    customer_response_at: now,
  }).eq('id', order.id)
  if (error) return { ok: false, error: error.message }

  // Heads-up to the tenant — no separate approval step, this is informational.
  const { data: tenant } = await db.from('tenants').select('name').eq('id', order.tenant_id).single()
  const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
  const owners = users.filter(u => u.app_metadata?.tenant_id === order.tenant_id && u.app_metadata?.role === 'owner' && u.email)
  const contact = order.contacts as unknown as { first_name: string; last_name: string | null } | null
  const jobTitle = (order.recurring_jobs as unknown as { title: string } | null)?.title ?? 'Appointment'
  const customerName = contact ? `${contact.first_name} ${contact.last_name ?? ''}`.trim() : 'A customer'
  const newDateLabel = new Date(`${newDate}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const newTimeLabel = newTime ? ` at ${formatTimeLabel(newTime)}` : ''

  const businessName = tenant?.name ?? 'your business'
  for (const owner of owners) {
    await sendEmail({
      to: owner.email!,
      subject: `${customerName} rescheduled: ${jobTitle}`,
      html: renderNeutralEmail({
        senderName: businessName,
        bodyHtml: `
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a202c;">Appointment rescheduled</p>
          <p style="margin:16px 0 0;"><strong>${customerName}</strong> moved their appointment for <strong>${jobTitle}</strong> to <strong>${newDateLabel}${newTimeLabel}</strong>.</p>
        `,
      }),
    })
  }

  return { ok: true }
}
