'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { callDeepSeekWithTools, type ChatMessage, type ChatTool } from '@/lib/deepseek'
import { CRM_BOT_SYSTEM_PROMPT } from '@/lib/bot-knowledge'
import { logAudit } from '@/lib/actions/audit'
import type { Json } from '@qcypher/db'

export type CrmBotProposedAction = {
  id: string
  actionType: 'create_contact' | 'schedule_event'
  summary: string
}

export type CrmBotReply = {
  conversationId: string
  reply: string
  proposedAction: CrmBotProposedAction | null
}

// Next.js redacts thrown Server Action error messages in production —
// these chat-facing functions return a result instead so a real message
// ("Read-only accounts cannot use the assistant", "message limit reached",
// etc.) actually reaches the widget instead of a generic redacted string.
export type CrmBotResult<T> = { ok: true; data: T } | { ok: false; error: string }

// Same pattern as requireTenantWriter() in lib/actions/blog.ts — any
// tenant member except read_only can use the bot, scoped to their own
// tenant via a fresh (non-JWT-cached) role/tenant read.
async function requireTenantWriter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  const role = fresh?.app_metadata?.role ?? 'member'
  if (role === 'read_only') throw new Error('Read-only accounts cannot use the assistant')

  const tenantId = await getTenantId(user.id, fresh?.app_metadata)
  return { userId: user.id, admin, tenantId }
}

const CRM_BOT_TOOLS: ChatTool[] = [
  {
    name: 'create_contact',
    description: 'Propose creating a new contact/customer record. Only call once you have at least a name.',
    parameters: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['first_name'],
    },
  },
  {
    name: 'schedule_event',
    description: 'Propose scheduling a calendar event/job. Only call once you have a title and a concrete start time.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        contact_name: { type: 'string', description: 'Free-text name of the contact this is for, if any' },
        starts_at: { type: 'string', description: 'ISO 8601 datetime' },
        ends_at: { type: 'string', description: 'ISO 8601 datetime; defaults to 1 hour after start if omitted' },
        description: { type: 'string' },
      },
      required: ['title', 'starts_at'],
    },
  },
]

function summarizeAction(type: string, data: Record<string, unknown>): string {
  if (type === 'create_contact') {
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    return `Create contact: ${name}${data.phone ? ` (${data.phone})` : ''}${data.email ? ` <${data.email}>` : ''}`
  }
  if (type === 'schedule_event') {
    const when = data.starts_at ? new Date(String(data.starts_at)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown time'
    return `Schedule "${data.title}"${data.contact_name ? ` with ${data.contact_name}` : ''} — ${when}`
  }
  return `${type}: ${JSON.stringify(data)}`
}

export async function startCrmBotConversation(): Promise<CrmBotResult<string>> {
  let admin: Awaited<ReturnType<typeof requireTenantWriter>>['admin'], tenantId: string, userId: string
  try {
    ;({ admin, tenantId, userId } = await requireTenantWriter())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }
  const { data, error } = await admin
    .from('chatbot_conversations')
    .insert({ bot_type: 'crm', tenant_id: tenantId, user_id: userId })
    .select('id')
    .single()
  if (error || !data) return { ok: false, error: 'Could not start conversation' }
  return { ok: true, data: data.id }
}

export async function sendCrmBotMessage(conversationId: string, message: string): Promise<CrmBotResult<CrmBotReply>> {
  let admin: Awaited<ReturnType<typeof requireTenantWriter>>['admin'], tenantId: string
  try {
    ;({ admin, tenantId } = await requireTenantWriter())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }
  const trimmed = message.trim().slice(0, 2000)
  if (!trimmed) return { ok: false, error: 'Empty message' }

  // Verify the conversation is actually this tenant's before reading/writing it.
  const { data: convo } = await admin.from('chatbot_conversations').select('tenant_id').eq('id', conversationId).single()
  if (!convo || convo.tenant_id !== tenantId) return { ok: false, error: 'Conversation not found' }

  const { count } = await admin.from('chatbot_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversationId)
  if ((count ?? 0) >= 60) return { ok: false, error: 'This conversation has reached its message limit' }

  const { data: history } = await admin
    .from('chatbot_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'user', content: trimmed })
  await logAudit({ action: 'ai_crm_bot_query', resource_type: 'ai_assistant', resource_id: conversationId, details: { label_shown: true } })

  const messages: ChatMessage[] = [
    { role: 'system', content: CRM_BOT_SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: trimmed },
  ]

  let content: string | null
  let toolCalls: Awaited<ReturnType<typeof callDeepSeekWithTools>>['toolCalls']
  try {
    const result = await callDeepSeekWithTools(messages, CRM_BOT_TOOLS, { maxTokens: 300 })
    content = result.content
    toolCalls = result.toolCalls
  } catch {
    const fallback = "Sorry, I'm having trouble responding right now — try again in a moment."
    await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: fallback })
    return { ok: true, data: { conversationId, reply: fallback, proposedAction: null } }
  }

  if (toolCalls.length > 0) {
    const call = toolCalls[0]
    const actionType = call.name as 'create_contact' | 'schedule_event'
    const summary = summarizeAction(actionType, call.arguments)

    const { data: actionRow, error } = await admin
      .from('crm_bot_actions')
      .insert({ conversation_id: conversationId, tenant_id: tenantId, action_type: actionType, action_data: call.arguments as Json })
      .select('id')
      .single()
    if (error || !actionRow) return { ok: false, error: 'Could not save proposed action' }

    const reply = `${summary} — confirm below to proceed.`
    await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
    return { ok: true, data: { conversationId, reply, proposedAction: { id: actionRow.id, actionType, summary } } }
  }

  const reply = content ?? "I'm not sure how to help with that — try rephrasing?"
  await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
  return { ok: true, data: { conversationId, reply, proposedAction: null } }
}

export async function confirmCrmBotAction(actionId: string, approve: boolean): Promise<CrmBotResult<{ reply: string }>> {
  let admin: Awaited<ReturnType<typeof requireTenantWriter>>['admin'], tenantId: string
  try {
    ;({ admin, tenantId } = await requireTenantWriter())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const { data: action } = await admin.from('crm_bot_actions').select('*').eq('id', actionId).single()
  if (!action || action.tenant_id !== tenantId) return { ok: false, error: 'Action not found' }
  if (action.status !== 'pending') return { ok: false, error: 'This action was already resolved' }

  if (!approve) {
    await admin.from('crm_bot_actions').update({ status: 'failed', error_message: 'Rejected by user', completed_at: new Date().toISOString() }).eq('id', actionId)
    const reply = "Okay, I won't do that."
    await admin.from('chatbot_messages').insert({ conversation_id: action.conversation_id, role: 'assistant', content: reply })
    return { ok: true, data: { reply } }
  }

  const data = action.action_data as Record<string, unknown>
  let reply: string
  try {
    if (action.action_type === 'create_contact') {
      const { data: contact, error } = await admin
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          first_name: String(data.first_name ?? '').slice(0, 100) || 'Unnamed',
          last_name: data.last_name ? String(data.last_name).slice(0, 100) : null,
          email: data.email ? String(data.email).slice(0, 320) : null,
          phone: data.phone ? String(data.phone).slice(0, 40) : null,
          notes: data.notes ? String(data.notes).slice(0, 2000) : null,
          status: 'lead',
        })
        .select('id, first_name, last_name')
        .single()
      if (error || !contact) throw new Error(error?.message ?? 'Insert failed')
      reply = `✓ Created contact: ${[contact.first_name, contact.last_name].filter(Boolean).join(' ')}`
      revalidatePath('/contacts')
    } else if (action.action_type === 'schedule_event') {
      const startsAt = new Date(String(data.starts_at))
      if (isNaN(startsAt.getTime())) throw new Error('Invalid start time')
      const endsAt = data.ends_at && !isNaN(new Date(String(data.ends_at)).getTime())
        ? new Date(String(data.ends_at))
        : new Date(startsAt.getTime() + 60 * 60 * 1000)

      let contactId: string | null = null
      if (data.contact_name) {
        const nameParts = String(data.contact_name).trim().split(/\s+/)
        const { data: matches } = await admin
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('first_name', `%${nameParts[0]}%`)
          .limit(1)
        contactId = matches?.[0]?.id ?? null
      }

      const { error } = await admin.from('events').insert({
        tenant_id: tenantId,
        contact_id: contactId,
        title: String(data.title ?? 'Untitled').slice(0, 200),
        description: data.description ? String(data.description).slice(0, 2000) : null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      if (error) throw new Error(error.message)
      reply = `✓ Scheduled "${data.title}" for ${startsAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
      revalidatePath('/calendar')
    } else {
      throw new Error(`Unknown action type: ${action.action_type}`)
    }

    await admin.from('crm_bot_actions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', actionId)
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    await admin.from('crm_bot_actions').update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() }).eq('id', actionId)
    reply = `Sorry, that didn't work: ${errorMessage}`
  }

  await admin.from('chatbot_messages').insert({ conversation_id: action.conversation_id, role: 'assistant', content: reply })
  return { ok: true, data: { reply } }
}
