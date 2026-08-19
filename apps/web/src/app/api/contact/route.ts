import { NextRequest, NextResponse } from 'next/server'
import { renderBrandedEmail } from '@/lib/email/brand'

export async function POST(request: NextRequest) {
  try {
    console.log('API key present:', !!process.env.RESEND_API_KEY)
    const { businessName, phone, email, message, selectedPackages } = await request.json()

    // Validate required fields
    if (!businessName || !phone || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const infoRow = (label: string, value: string) => `
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(26,48,112,0.08);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:4px;">${label}</div>
        <div style="font-size:15px;color:#171a2b;">${value}</div>
      </div>
    `

    // Customer confirmation email
    const customerEmailHtml = renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Request received <svg width="16" height="16" viewBox="0 0 24 24" fill="#059669" style="vertical-align:-2px;" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.6-4.4-4.4 1.4-1.4 3 3 6-6 1.4 1.4z"/></svg></p>
        <p style="margin:0 0 20px;color:#5b6072;">Thank you for your interest in QCypher</p>
        <p style="margin:0 0 16px;">Hi ${businessName},</p>
        <p style="margin:0 0 20px;">We've received your request and we're excited to help grow your business. Our team will review your information and reach out within 24 hours to discuss your needs.</p>
        <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid rgba(26,48,112,0.08);">
          ${infoRow('Business', businessName)}
          ${infoRow('Contact phone', phone)}
          ${selectedPackages && selectedPackages.length > 0 ? infoRow('Interested in', selectedPackages.join(', ')) : ''}
        </div>
        <p style="margin:20px 0 0;">Need something urgent? Call us at <strong>(804) 250-5066</strong>.</p>
        <p style="margin:16px 0 0;">Looking forward to working with you!</p>
      `,
    })

    // Team lead notification email
    const teamEmailHtml = renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">New lead received</p>
        <p style="margin:0 0 20px;color:#5b6072;">A prospect is interested in QCypher</p>
        <div style="background:#f8f9fc;border-radius:12px;padding:20px 24px;margin:20px 0;border:1px solid rgba(26,48,112,0.08);">
          ${infoRow('Business name', businessName)}
          ${infoRow('Phone', phone)}
          ${infoRow('Email', `<a href="mailto:${email}" style="color:#2a52a0;text-decoration:none;">${email}</a>`)}
          ${selectedPackages && selectedPackages.length > 0 ? infoRow('Interested in', selectedPackages.join(', ')) : ''}
          ${message ? infoRow('Message', message.replace(/\n/g, '<br>')) : ''}
        </div>
        <p style="margin:20px 0 0;">Follow up within 24 hours for best results — <a href="tel:${phone}" style="color:#2a52a0;text-decoration:none;font-weight:700;">call ${phone}</a>.</p>
      `,
    })

    // Send customer confirmation email
    const customerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@qcyphertech.com',
        to: email,
        subject: 'Request Received - QCypher Technologies',
        html: customerEmailHtml,
      }),
    })

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text()
      console.error('Customer email sending failed:', errorText)
      // In testing mode, Resend only allows sending to verified emails.
      // This will work once domain is verified in Resend dashboard.
      // For now, log the error but continue with team notification.
      if (!errorText.includes('validation_error')) {
        throw new Error(`Failed to send customer email: ${errorText}`)
      }
    } else {
      console.log('Customer confirmation email sent to:', email)
    }

    // Send team lead notification email
    const teamResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@qcyphertech.com',
        to: 'qcyphertech@gmail.com',
        subject: `New Lead: ${businessName}`,
        html: teamEmailHtml,
      }),
    })

    if (!teamResponse.ok) {
      throw new Error(`Failed to send team email: ${await teamResponse.text()}`)
    }

    console.log('Emails sent successfully to customer and team')
    return NextResponse.json(
      { success: true, message: 'Emails sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: String(error) },
      { status: 500 }
    )
  }
}
