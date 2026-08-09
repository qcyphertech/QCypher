import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { renderNeutralEmail } from '@/lib/email/neutral'

// Fires after a Helcim payment is verified and the order is marked paid —
// sends a receipt to the paying customer and a "you've been paid"
// notification to the tenant's owner(s). Best-effort: a notification
// failure should never undo the payment that already succeeded.
export async function sendPaymentConfirmationEmails(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>
  tenantId: string
  orderId: string
  amount: number
  transactionId: string
  customerEmail: string | null
  customerName: string | null
}) {
  const { admin, tenantId, orderId, amount, transactionId, customerEmail, customerName } = params

  try {
    const { data: tenant } = await admin.from('tenants').select('name').eq('id', tenantId).single()
    const businessName = (tenant as { name?: string } | null)?.name ?? 'your service provider'
    const orderRef = orderId.slice(-6).toUpperCase()

    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Payment received — ${businessName}`,
        html: renderNeutralEmail({
          senderName: businessName,
          bodyHtml: `
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a202c;">Payment received</p>
            <p style="margin:16px 0 0;">Hi ${customerName ?? 'there'},</p>
            <p style="margin:16px 0 0;">Your payment to ${businessName} was successful.</p>
            <div style="background:#f7f7f8;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid rgba(15,23,42,0.06);text-align:center;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#718096;margin-bottom:6px;">Amount paid</div>
              <div style="font-size:28px;font-weight:800;color:#1a202c;">$${amount.toFixed(2)}</div>
            </div>
            <p style="margin:0;font-size:13px;color:#718096;">Order #${orderRef} · Transaction ${transactionId}</p>
          `,
        }),
        text: `Your payment of $${amount.toFixed(2)} to ${businessName} was successful. Order #${orderRef}, Transaction ${transactionId}.`,
      })
    }

    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const owners = users.filter(u => u.app_metadata?.tenant_id === tenantId && u.app_metadata?.role === 'owner' && u.email)
    for (const owner of owners) {
      await sendEmail({
        to: owner.email!,
        subject: `You've been paid $${amount.toFixed(2)}`,
        html: renderNeutralEmail({
          senderName: businessName,
          bodyHtml: `
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1a202c;">You've been paid</p>
            <p style="margin:16px 0 0;">${customerName ?? 'A customer'} just paid you.</p>
            <div style="background:#f7f7f8;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid rgba(15,23,42,0.06);text-align:center;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#718096;margin-bottom:6px;">Amount received</div>
              <div style="font-size:28px;font-weight:800;color:#1a202c;">$${amount.toFixed(2)}</div>
            </div>
            <p style="margin:0;font-size:13px;color:#718096;">Order #${orderRef} · Transaction ${transactionId}</p>
          `,
        }),
        text: `${customerName ?? 'A customer'} paid you $${amount.toFixed(2)}. Order #${orderRef}, Transaction ${transactionId}.`,
      })
    }
  } catch (e) {
    console.error('[sendPaymentConfirmationEmails] failed', e instanceof Error ? e.message : e)
  }
}
