import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { configureNumberWebhook } from '@/lib/telnyx'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phoneNumber } = await req.json() as { phoneNumber?: string }
  if (!phoneNumber) {
    return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })
  }

  try {
    await configureNumberWebhook(phoneNumber)

    // Save to tenant
    const tenantId = user.app_metadata?.tenant_id
    if (tenantId) {
      await supabase.from('tenants').update({ telnyx_number: phoneNumber }).eq('id', tenantId)
    }

    return NextResponse.json({ number: phoneNumber })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to connect number' }, { status: 500 })
  }
}
