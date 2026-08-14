import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderRenewalReminderEmail } from '@/lib/email/renewal-reminder'
import { BASE_PRICING, type PriceTier } from '@/lib/pricing-constants'

const TIER_LABEL: Record<PriceTier, string> = { starter: 'Starter', growth: 'Growth', all_in: 'All-In' }

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

// Daily: sends the FTC/AB2863 auto-renewal disclosure 7 days before a
// tenant's next_billing_date (customer_pricing — set once by a super
// admin in the Pricing panel), then rolls that date forward a month once
// it passes so the cycle keeps going. This only automates the reminder
// EMAIL — QCypher still bills tenants via manually-created invoices, there
// is no automatic card charge tied to this date.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: rows } = await admin
    .from('customer_pricing')
    .select('tenant_id, base_price_tier, override_monthly_amount, next_billing_date')
    .not('next_billing_date', 'is', null)

  if (!rows?.length) return NextResponse.json({ ok: true, sent: [], rolled: [] })

  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const sent: string[] = []
  const rolled: string[] = []

  for (const row of rows as unknown as Array<{
    tenant_id: string; base_price_tier: PriceTier; override_monthly_amount: number | null; next_billing_date: string
  }>) {
    // Roll the anchor forward once it's in the past, independent of
    // whether a reminder was sent — keeps the schedule self-perpetuating.
    if (row.next_billing_date < today) {
      const next = addMonths(row.next_billing_date, 1)
      await admin.from('customer_pricing').update({ next_billing_date: next }).eq('tenant_id', row.tenant_id)
      rolled.push(row.tenant_id)
      continue
    }

    if (row.next_billing_date !== sevenDaysOut) continue

    const { error: insertError } = await admin
      .from('renewal_reminders_sent')
      .insert({ tenant_id: row.tenant_id, billing_date: row.next_billing_date })
    if (insertError) continue // already sent for this cycle

    const owner = users.find(u => u.app_metadata?.tenant_id === row.tenant_id && u.app_metadata?.role === 'owner')
    if (!owner?.email) continue

    const amount = row.override_monthly_amount ?? BASE_PRICING[row.base_price_tier].monthly
    await sendEmail({
      to: owner.email,
      subject: 'Your QCypher Subscription Renews in 7 Days',
      html: renderRenewalReminderEmail({
        customerName: owner.user_metadata?.name ?? 'there',
        plan: TIER_LABEL[row.base_price_tier],
        renewalDate: row.next_billing_date,
        amount,
        manageUrl: `${appUrl}/settings`,
      }),
    })

    await admin.from('audit_logs').insert({
      tenant_id: row.tenant_id,
      user_id: null,
      user_email: 'system',
      action: 'renewal_reminder_sent',
      resource_type: 'account',
      details: { plan: TIER_LABEL[row.base_price_tier], amount, renewal_date: row.next_billing_date },
    })

    sent.push(row.tenant_id)
  }

  return NextResponse.json({ ok: true, sent, rolled })
}
