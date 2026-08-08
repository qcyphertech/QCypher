import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { renderBrandedEmail } from '@/lib/email/brand'

/**
 * Phase 25 hard-delete cron. Runs daily (Vercel Hobby plan only allows
 * daily crons — no pg_cron dependency needed, same pattern as the other
 * two crons in this file's siblings). For every tenant whose 30-day grace
 * period has elapsed: purges contacts/interactions/events, marks the
 * tenant 'deleted', and emails the account owner(s) that it's done.
 *
 * Scope note: auth users for the tenant are NOT deleted or anonymized
 * here (their login would just find an empty, 'deleted'-status tenant)
 * — full user anonymization was left out of this pass, consistent with
 * the incremental scope reductions taken elsewhere in this codebase's
 * incident/compliance features. Revisit if legal requires it.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: due } = await admin
    .from('tenants')
    .select('id, name')
    .eq('status', 'pending_deletion')
    .lte('deletion_scheduled_at', new Date().toISOString())

  const results: Array<{ tenantId: string; ok: boolean }> = []

  for (const tenant of (due ?? []) as { id: string; name: string }[]) {
    try {
      await admin.from('interactions').delete().eq('tenant_id', tenant.id)
      await admin.from('events').delete().eq('tenant_id', tenant.id)
      await admin.from('contacts').delete().eq('tenant_id', tenant.id)

      await admin
        .from('tenants')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deletion_requested_at: null,
          deletion_scheduled_at: null,
        })
        .eq('id', tenant.id)

      await admin.from('audit_logs').insert({
        tenant_id: tenant.id,
        user_id: null,
        user_email: 'system',
        action: 'account_deleted',
        resource_type: 'account',
        resource_id: tenant.id,
        resource_name: tenant.name,
        details: { executed_by: 'system' },
      })

      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const owners = users.filter(u => u.app_metadata?.tenant_id === tenant.id && u.app_metadata?.role === 'owner')
      for (const owner of owners) {
        if (!owner.email) continue
        await sendEmail({
          to: owner.email,
          subject: 'Your QCypher account has been permanently deleted',
          html: renderBrandedEmail({
            bodyHtml: `
              <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#171a2b;">Account permanently deleted</p>
              <p style="margin:16px 0 0;">As requested, <strong>${tenant.name}</strong> and all its contacts, notes, and calendar events have been permanently deleted.</p>
              <p style="margin:16px 0 0;">Thanks for having used QCypher. If this wasn't you, contact us immediately at legal@qcyphertech.com.</p>
            `,
          }),
          text: `${tenant.name} and all its data have been permanently deleted, as requested.`,
        })
      }

      results.push({ tenantId: tenant.id, ok: true })
    } catch {
      results.push({ tenantId: tenant.id, ok: false })
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
