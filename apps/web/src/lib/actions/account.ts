'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { renderBrandedEmail } from '@/lib/email/brand'

export async function updateBusinessName(name: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Reads app_metadata.tenant_id off the session JWT, which can be
    // stale (e.g. set via Admin API after initial sign-in) — getTenantId
    // re-fetches fresh from the DB when that happens. A genuine throw
    // here means the account truly has no tenant (super admin) — no
    // business name to set for those, so no-op rather than error.
    let tenantId: string
    try {
      tenantId = await getTenantId(user.id, user.app_metadata)
    } catch {
      return {}
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }

    const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const { error } = await admin.from('tenants').update({ name }).eq('id', tenantId)
    if (error) return { error: `Business name save failed: ${error.message}` }

    revalidatePath('/settings')
    revalidatePath('/orders')
    // The top bar's business-initials avatar is rendered by the (app)
    // route group's layout, not the root layout — '/' is the public
    // marketing homepage and doesn't share that layout at all, so
    // revalidating it does nothing here. Target a path that's actually
    // inside the (app) group so its layout chain gets invalidated.
    revalidatePath('/dashboard', 'layout')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function updateProfile(data: {
  legal_name?: string
  nickname?: string
  phone?: string
  address?: string
  street?: string
  city?: string
  state?: string
  zip?: string
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
    )

    // RLS-scoped lookup relies on the JWT's tenant_id claim, which can be
    // stale — getTenantId() re-fetches fresh from the DB in that case. A
    // genuine throw means the account truly has no tenant (super admin);
    // the users table's tenant_id column is NOT NULL, so there's no row
    // to upsert into for those accounts — no-op rather than error.
    let tenantId: string
    try {
      tenantId = await getTenantId(user.id, user.app_metadata)
    } catch {
      return {}
    }

    const { error } = await admin
      .from('users')
      .upsert(
        {
          id:        user.id,
          tenant_id: tenantId,
          ...data,
        },
        { onConflict: 'id' },
      )

    if (error) return { error: `DB error: ${error.message} (code: ${error.code})` }

    revalidatePath('/settings')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function changePassword(password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function submitFeedback(subject: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = user.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')
  const { data: tenant } = await supabase.from('tenants').select('id').eq('id', tenantId).single()
  if (!tenant) throw new Error('Tenant not found')

  const { error } = await supabase
    .from('feedback')
    .insert({ tenant_id: tenant.id, user_id: user.id, subject, message })

  if (error) throw error
}

export async function requestAccountDeactivation() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = user.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')
  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('id', tenantId).single()
  if (!tenant) throw new Error('Tenant not found')

  // Log the request in feedback table so the team can track it
  await supabase.from('feedback').insert({
    tenant_id: tenant.id,
    user_id:   user.id,
    subject:   'DEACTIVATION_REQUEST',
    message:   `Account deactivation requested by ${user.email} for workspace "${(tenant as { name?: string }).name ?? tenant.id}".`,
  })

  // Notify the team via Resend
  const RESEND_API_KEY  = process.env.RESEND_API_KEY ?? ''
  const RESEND_FROM     = process.env.RESEND_FROM_EMAIL ?? 'noreply@qcyphertech.com'

  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    RESEND_FROM,
        to:      ['info@qcyphertech.com'],
        subject: `[QCypher CRM] Account Deactivation Request — ${user.email}`,
        html:    `
          <p>A user has requested account deactivation.</p>
          <ul>
            <li><strong>User:</strong> ${user.email}</li>
            <li><strong>Workspace:</strong> ${(tenant as { name?: string }).name ?? tenant.id}</li>
            <li><strong>User ID:</strong> ${user.id}</li>
            <li><strong>Tenant ID:</strong> ${tenant.id}</li>
          </ul>
          <p>The account is <strong>not</strong> automatically deactivated. Review and action manually.</p>
        `,
      }),
    })

    // Confirmation email to the user
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    RESEND_FROM,
        to:      [user.email!],
        subject: 'Your QCypher account deactivation request was received',
        html: renderBrandedEmail({
          bodyHtml: `
            <p style="margin:0 0 16px;">Hi,</p>
            <p style="margin:0 0 16px;">We received your request to deactivate your QCypher CRM account.</p>
            <p style="margin:0 0 16px;">Your account remains active while our team reviews the request. We'll follow up within 1–2 business days to confirm deactivation and provide options for exporting your data.</p>
            <p style="margin:0 0 16px;">If this was a mistake, you don't need to do anything — just reply to this email and we'll disregard the request.</p>
            <p style="margin:24px 0 0;color:#5b6072;">— The QCypher Team<br>info@qcyphertech.com</p>
          `,
        }),
      }),
    })
  }
}

export async function dismissWelcome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('users').update({ has_seen_welcome: true }).eq('id', user.id)
  revalidatePath('/', 'layout')
}
