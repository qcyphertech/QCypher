'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { sendEmail } from '@/lib/email/send'
import { renderRenewalReminderEmail } from '@/lib/email/renewal-reminder'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Only super admins can send renewal reminders')
  return { admin, userId: user.id }
}

// Ad-hoc manual send from the Admin Console — the automated path is
// /api/cron/send-renewal-reminders, which fires 7 days before a tenant's
// customer_pricing.next_billing_date. This action exists for one-off
// sends outside that schedule (testing, a special case, etc).
export async function sendRenewalReminder(input: {
  tenantId: string
  plan: string
  renewalDate: string
  amount: number
  cardLast4?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { admin, userId } = await requireSuperAdmin()

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.app_metadata?.tenant_id === input.tenantId && u.app_metadata?.role === 'owner')
  if (!owner?.email) return { ok: false, error: 'No owner email found for this tenant' }

  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const result = await sendEmail({
    to: owner.email,
    subject: 'Your QCypher Subscription Renews in 7 Days',
    html: renderRenewalReminderEmail({
      customerName: owner.user_metadata?.name ?? 'there',
      plan: input.plan,
      renewalDate: input.renewalDate,
      amount: input.amount,
      cardLast4: input.cardLast4,
      manageUrl: `${appUrl}/settings`,
    }),
  })
  if (!result.ok) return { ok: false, error: result.error }

  const { data: { user: caller } } = await admin.auth.admin.getUserById(userId)
  await admin.from('audit_logs').insert({
    tenant_id: input.tenantId,
    user_id: userId,
    user_email: caller?.email ?? '',
    action: 'renewal_reminder_sent',
    resource_type: 'account',
    details: { plan: input.plan, amount: input.amount, renewal_date: input.renewalDate },
  })

  return { ok: true }
}
