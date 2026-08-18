import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Automated version of scripts/review-super-admins.py's core check —
// confirmed 2026-08-18 that "scheduled (monthly)" in
// docs/qa-checklist-status.md was aspirational: the script had no
// trigger anywhere and had only ever been run once by hand. Runs
// monthly via Vercel Cron (see vercel.json), writes a row to
// access_reviews so the review has a real, unforgeable timestamp
// instead of relying on someone remembering to run a script and
// commit a markdown file. The manual script/evidence-file flow still
// exists for the "confirm this person still needs access" judgment
// call a human has to make — this only automates the factual half
// (who has super-admin, do they have MFA).
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 })

  const superAdmins = usersPage.users.filter(u => u.app_metadata?.is_super_admin)

  // supabase-js's admin API has no listFactors method (confirmed against
  // the installed SDK) — same reason scripts/review-super-admins.py calls
  // this endpoint directly instead of going through the client library.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const details = await Promise.all(superAdmins.map(async (u) => {
    let verifiedCount = 0
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}/factors`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
      const factors = res.ok ? await res.json() : []
      verifiedCount = Array.isArray(factors) ? factors.filter((f: { status: string }) => f.status === 'verified').length : 0
    } catch {
      verifiedCount = -1 // couldn't check
    }
    return {
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      mfa_verified_count: verifiedCount,
      flagged: verifiedCount <= 0,
    }
  }))

  const flaggedCount = details.filter(d => d.flagged).length

  const { error: insertError } = await admin.from('access_reviews').insert({
    super_admin_count: superAdmins.length,
    flagged_count: flaggedCount,
    details,
  })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, superAdminCount: superAdmins.length, flaggedCount })
}
