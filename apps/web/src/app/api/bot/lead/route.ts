import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : ''
  const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 320) : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 40) : null
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.from('chatbot_leads').insert({
    conversation_id: conversationId,
    name,
    email,
    phone,
  })
  if (error) return NextResponse.json({ error: 'Could not save your info' }, { status: 500 })

  if (conversationId) {
    await admin
      .from('chatbot_conversations')
      .update({ status: 'escalated', visitor_name: name, visitor_email: email, ended_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  return NextResponse.json({ ok: true, calLink: 'https://cal.com/qcyphertech' })
}
