import { renderBrandedEmail } from './brand'

export type RenewalReminderInput = {
  customerName: string
  plan: string
  renewalDate: string
  amount: number
  cardLast4?: string
  manageUrl: string
}

// FTC auto-renewal disclosure — sent manually from the Admin Console for
// now (no cron trigger: QCypher has no recurring-subscription schedule to
// compute "7 days out" from yet, billing is still one-off invoices created
// by hand). Reuses the shared brand shell so it matches every other
// QCypher transactional email rather than inventing a one-off palette.
export function renderRenewalReminderEmail(input: RenewalReminderInput): string {
  const { customerName, plan, renewalDate, amount, cardLast4, manageUrl } = input

  return renderBrandedEmail({
    bodyHtml: `
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;">Your subscription renews in 7 days</p>
      <p style="margin:16px 0 0;">Hi ${customerName},</p>
      <p style="margin:12px 0 0;">Your QCypher subscription is set to renew soon. Here are the details:</p>

      <table style="width:100%;margin:20px 0;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:6px 0;color:#5b6072;">Plan</td><td style="padding:6px 0;text-align:right;font-weight:700;">${plan}</td></tr>
        <tr><td style="padding:6px 0;color:#5b6072;border-top:1px solid rgba(26,48,112,0.08);">Renewal date</td><td style="padding:6px 0;text-align:right;font-weight:700;border-top:1px solid rgba(26,48,112,0.08);">${renewalDate}</td></tr>
        <tr><td style="padding:6px 0;color:#5b6072;border-top:1px solid rgba(26,48,112,0.08);">Amount</td><td style="padding:6px 0;text-align:right;font-weight:700;border-top:1px solid rgba(26,48,112,0.08);">$${amount.toFixed(2)}</td></tr>
        ${cardLast4 ? `<tr><td style="padding:6px 0;color:#5b6072;border-top:1px solid rgba(26,48,112,0.08);">Card on file</td><td style="padding:6px 0;text-align:right;font-weight:700;border-top:1px solid rgba(26,48,112,0.08);">•••• ${cardLast4}</td></tr>` : ''}
      </table>

      <p style="margin:16px 0 0;">On ${renewalDate}, we'll charge the card on file and your service will continue uninterrupted.</p>

      <p style="margin:20px 0 0;font-weight:700;">Not ready to renew?</p>
      <p style="margin:8px 0 0;">You can cancel anytime from your account settings — no penalty, no questions asked. Your service ends immediately once cancelled.</p>
    `,
    cta: { label: 'Manage my subscription', href: manageUrl },
  })
}
