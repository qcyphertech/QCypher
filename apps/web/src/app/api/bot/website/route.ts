import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callDeepSeekChat, deepseekConfigured, type ChatMessage } from '@/lib/deepseek'
import { WEBSITE_BOT_SYSTEM_PROMPT } from '@/lib/bot-knowledge'

export const dynamic = 'force-dynamic'

const BOOKING_KEYWORDS = ['book', 'schedule', 'call', 'consult', 'demo', 'quote', 'talk to', 'sales']

// Server-side only — never call DeepSeek from the browser with a public
// key (that was the spec's original design; it would expose a paid API
// key in the client bundle). This route is the sole write path for
// chatbot_conversations/chatbot_messages, using the service role — no
// client-side Supabase inserts, matching this project's server-action
// pattern.
export async function POST(request: NextRequest) {
  if (!deepseekConfigured()) {
    return NextResponse.json({ error: 'Chat is temporarily unavailable' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null

  if (!message || message.length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }

  const admin = createAdminClient()

  let convoId = conversationId
  if (!convoId) {
    const { data, error } = await admin.from('chatbot_conversations').insert({}).select('id').single()
    if (error || !data) return NextResponse.json({ error: 'Could not start conversation' }, { status: 500 })
    convoId = data.id
  }

  // Basic abuse guard — cap turns per conversation instead of a global
  // rate limiter (serverless cold starts reset in-process limiters
  // anyway, same reasoning as this project's other cost-control checks).
  const { count } = await admin
    .from('chatbot_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', convoId)
  if ((count ?? 0) >= 40) {
    return NextResponse.json({ error: 'This conversation has reached its message limit' }, { status: 429 })
  }

  const { data: history } = await admin
    .from('chatbot_messages')
    .select('role, content')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true })
    .limit(20)

  await admin.from('chatbot_messages').insert({ conversation_id: convoId, role: 'user', content: message })

  const messages: ChatMessage[] = [
    { role: 'system', content: WEBSITE_BOT_SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  let reply: string
  try {
    reply = await callDeepSeekChat(messages, { maxTokens: 300 })
  } catch {
    reply = "Sorry, I'm having trouble responding right now — you can reach us directly at info@qcyphertech.com or (804) 250-5066."
  }

  await admin.from('chatbot_messages').insert({ conversation_id: convoId, role: 'assistant', content: reply })

  const lower = message.toLowerCase()
  const showLeadForm = BOOKING_KEYWORDS.some((kw) => lower.includes(kw))

  return NextResponse.json({ conversationId: convoId, reply, showLeadForm })
}
