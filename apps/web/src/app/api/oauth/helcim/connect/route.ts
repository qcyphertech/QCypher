import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sends the tenant owner to Helcim's own signup form to create a NEW Helcim
// merchant account under QCypher's Integration Partner referral. Helcim has
// no OAuth "authorize" flow for an *existing* merchant account — this is
// their actual mechanism (Connected Account Registrations). On approval,
// Helcim POSTs the new merchant's api-token to
// /api/webhooks/helcim-connected-account, correlated by the `cid` query
// param below (set to this tenant's id).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.APP_URL!))

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = (fresh?.app_metadata?.role ?? 'member') as string
  if (role !== 'owner') {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?helcim_error=not_owner`)
  }

  const tenantId = (fresh?.app_metadata?.tenant_id ?? user.app_metadata?.tenant_id) as string | undefined
  if (!tenantId) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?helcim_error=no_tenant`)
  }

  const partnerToken = process.env.HELCIM_PARTNER_TOKEN
  if (!partnerToken) {
    return NextResponse.redirect(`${process.env.APP_URL}/settings?helcim_error=not_configured`)
  }

  const params = new URLSearchParams({ pt: partnerToken, cid: tenantId })
  return NextResponse.redirect(`https://hub.helcim.com/signup/register?${params.toString()}`)
}
