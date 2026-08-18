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
  actionType: 'create_contact' | 'schedule_event' | 'create_invoice' | 'mark_order_paid' | 'add_order_discount'
  summary: string
}

export type CrmBotNavigate = { label: string; path: string }

export type CrmBotReply = {
  conversationId: string
  reply: string
  proposedAction: CrmBotProposedAction | null
  navigate: CrmBotNavigate[] | null
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
  {
    name: 'navigate_to',
    description: 'Hand the user a direct link to a page described in the knowledge base — the right move whenever you can\'t perform an action yourself but know exactly where they\'d go to do it. Informational only, no confirmation needed.',
    parameters: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Short button label, e.g. "Open Team settings"' },
        path: { type: 'string', description: 'The exact app path from the knowledge base, e.g. "/settings"' },
      },
      required: ['label', 'path'],
    },
  },
  {
    name: 'query_business_data',
    description: 'Answer a question about the tenant\'s real business numbers by fetching one live metric. Call this instead of guessing or making up a number whenever the user asks about revenue, unpaid invoices, leads, customers, upcoming events, or expenses.',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['revenue_this_month', 'unpaid_invoices', 'lead_count', 'active_customer_count', 'upcoming_events_count', 'expenses_this_month'],
          description: 'Which metric to fetch',
        },
      },
      required: ['metric'],
    },
  },
  {
    name: 'search_records',
    description: 'Find a specific contact or order by name/number and get a direct link to it. Call this whenever the user asks to find, pull up, or look up a specific customer or order.',
    parameters: {
      type: 'object',
      properties: {
        record_type: { type: 'string', enum: ['contact', 'order'] },
        query: { type: 'string', description: 'Name to search for (contact), or an order number (order)' },
      },
      required: ['record_type', 'query'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Propose creating a new order/invoice with one or more line items. Only call once you have at least one line item with a name, quantity, and price.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Free-text name of the customer this is for, if any' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
            required: ['name', 'quantity', 'unit_price'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['items'],
    },
  },
  {
    name: 'mark_order_paid',
    description: 'Propose marking an existing order/invoice as paid. Only call once you have the order number.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'number' },
      },
      required: ['order_number'],
    },
  },
  {
    name: 'add_order_discount',
    description: 'Propose adding or updating a whole-order discount on an existing order. Only call once you have the order number and discount amount.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'number' },
        discount_type: { type: 'string', enum: ['percent', 'flat'] },
        discount_value: { type: 'number' },
        show_discount: { type: 'boolean', description: 'Whether the customer can see the discount was applied; defaults to true' },
      },
      required: ['order_number', 'discount_type', 'discount_value'],
    },
  },
]

// Only paths this bot's own knowledge base actually documents — a
// model-invented path would otherwise become a real, clickable link to a
// 404 or (worse) somewhere unintended.
const ALLOWED_NAVIGATE_PATHS = new Set([
  '/dashboard', '/contacts', '/contacts/new', '/contacts/import',
  '/orders', '/orders/rentals', '/calendar', '/overview', '/overview/expenses',
  '/payments', '/templates', '/inventory', '/settings',
])

function summarizeAction(type: string, data: Record<string, unknown>): string {
  if (type === 'create_contact') {
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    return `Create contact: ${name}${data.phone ? ` (${data.phone})` : ''}${data.email ? ` <${data.email}>` : ''}`
  }
  if (type === 'schedule_event') {
    const when = data.starts_at ? new Date(String(data.starts_at)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown time'
    return `Schedule "${data.title}"${data.contact_name ? ` with ${data.contact_name}` : ''} — ${when}`
  }
  if (type === 'create_invoice') {
    const items = Array.isArray(data.items) ? data.items as Array<{ name: string; quantity: number; unit_price: number }> : []
    const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
    const itemsText = items.map(i => `${i.quantity}x ${i.name} @ $${i.unit_price}`).join(', ')
    return `Create invoice${data.customer_name ? ` for ${data.customer_name}` : ''}: ${itemsText} — total $${total.toFixed(2)}`
  }
  if (type === 'mark_order_paid') {
    return `Mark order #${data.order_number} as paid`
  }
  if (type === 'add_order_discount') {
    const amount = data.discount_type === 'percent' ? `${data.discount_value}%` : `$${data.discount_value}`
    return `Apply a ${amount} discount to order #${data.order_number}${data.show_discount === false ? ' (hidden from customer)' : ''}`
  }
  return `${type}: ${JSON.stringify(data)}`
}

type AdminClient = ReturnType<typeof createAdminClient>

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

// Fixed, whitelisted metrics only — a free-text/SQL query tool would let
// the model construct arbitrary reads; this keeps every possible answer
// to a query the tenant is actually scoped to and the reply text
// deterministic (built from the real number, never phrased by the model).
async function runBusinessQuery(admin: AdminClient, tenantId: string, metric: string): Promise<string> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfMonthIso = startOfMonth.toISOString()

  switch (metric) {
    case 'revenue_this_month': {
      const { data } = await admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('updated_at', startOfMonthIso)
      const total = (data ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
      return `Revenue this month so far: ${money(total)}.`
    }
    case 'unpaid_invoices': {
      const { data } = await admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'pending')
      const rows = data ?? []
      const total = rows.reduce((s, o) => s + (o.total_amount ?? 0), 0)
      return `${rows.length} unpaid invoice${rows.length === 1 ? '' : 's'} totaling ${money(total)}.`
    }
    case 'lead_count': {
      const { count } = await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'lead')
      return `${count ?? 0} lead${count === 1 ? '' : 's'} right now.`
    }
    case 'active_customer_count': {
      const { count } = await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active')
      return `${count ?? 0} active customer${count === 1 ? '' : 's'}.`
    }
    case 'upcoming_events_count': {
      const { count } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('starts_at', new Date().toISOString())
      return `${count ?? 0} upcoming event${count === 1 ? '' : 's'} on the calendar.`
    }
    case 'expenses_this_month': {
      const { data } = await admin.from('expenses').select('amount').eq('tenant_id', tenantId).gte('date', startOfMonthIso.slice(0, 10))
      const total = (data ?? []).reduce((s, e) => s + (e.amount ?? 0), 0)
      return `Expenses this month so far: ${money(total)}.`
    }
    default:
      return "I don't have that metric available."
  }
}

async function runSearch(admin: AdminClient, tenantId: string, recordType: string, query: string): Promise<{ text: string; links: CrmBotNavigate[] }> {
  const q = query.trim()
  if (!q) return { text: "I need a name or number to search for.", links: [] }

  if (recordType === 'contact') {
    const { data } = await admin
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(3)
    if (!data || data.length === 0) return { text: `No contacts matched "${q}".`, links: [] }
    const links = data.map(c => ({ label: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Contact', path: `/contacts/${c.id}` }))
    return { text: `Found ${data.length} contact${data.length === 1 ? '' : 's'} matching "${q}".`, links }
  }

  if (recordType === 'order') {
    const asNumber = parseInt(q.replace(/\D/g, ''), 10)
    let rows: Array<{ id: string; order_number: number | null }> = []
    if (!isNaN(asNumber)) {
      const { data } = await admin.from('orders').select('id, order_number').eq('tenant_id', tenantId).eq('order_number', asNumber).limit(3)
      rows = data ?? []
    } else {
      const { data } = await admin
        .from('orders')
        .select('id, order_number, contact:contacts(first_name, last_name)')
        .eq('tenant_id', tenantId)
        .limit(50)
      rows = (data ?? []).filter((o) => {
        const contact = o.contact as { first_name: string; last_name: string | null } | null
        const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ').toLowerCase()
        return name.includes(q.toLowerCase())
      }).slice(0, 3)
    }
    if (rows.length === 0) return { text: `No orders matched "${q}".`, links: [] }
    const links = rows.map(o => ({ label: `Order #${o.order_number ?? '—'}`, path: `/orders/${o.id}` }))
    return { text: `Found ${rows.length} order${rows.length === 1 ? '' : 's'} matching "${q}".`, links }
  }

  return { text: "I can only search contacts or orders.", links: [] }
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
    return { ok: true, data: { conversationId, reply: fallback, proposedAction: null, navigate: null } }
  }

  // navigate_to, query_business_data, and search_records are all
  // read-only/informational — applied immediately, never routed through
  // the propose/confirm flow the mutation tools use. A reply can carry
  // several: text plus one or more links (e.g. two matching contacts).
  const navigateCall = toolCalls.find(c => c.name === 'navigate_to')
  const navigateLinks: CrmBotNavigate[] = []
  if (navigateCall) {
    const path = String(navigateCall.arguments.path ?? '')
    const label = String(navigateCall.arguments.label ?? 'Open')
    if (ALLOWED_NAVIGATE_PATHS.has(path)) navigateLinks.push({ label, path })
  }

  let dataAnswer: string | null = null

  const queryCall = toolCalls.find(c => c.name === 'query_business_data')
  if (queryCall) {
    dataAnswer = await runBusinessQuery(admin, tenantId, String(queryCall.arguments.metric ?? ''))
  }

  const searchCall = toolCalls.find(c => c.name === 'search_records')
  if (searchCall) {
    const { text, links } = await runSearch(admin, tenantId, String(searchCall.arguments.record_type ?? ''), String(searchCall.arguments.query ?? ''))
    dataAnswer = dataAnswer ? `${dataAnswer} ${text}` : text
    navigateLinks.push(...links)
  }

  const navigate = navigateLinks.length ? navigateLinks : null

  const mutationCall = toolCalls.find(c =>
    c.name === 'create_contact' || c.name === 'schedule_event' ||
    c.name === 'create_invoice' || c.name === 'mark_order_paid' || c.name === 'add_order_discount')
  if (mutationCall) {
    const actionType = mutationCall.name as CrmBotProposedAction['actionType']
    const summary = summarizeAction(actionType, mutationCall.arguments)

    const { data: actionRow, error } = await admin
      .from('crm_bot_actions')
      .insert({ conversation_id: conversationId, tenant_id: tenantId, action_type: actionType, action_data: mutationCall.arguments as Json })
      .select('id')
      .single()
    if (error || !actionRow) return { ok: false, error: 'Could not save proposed action' }

    const reply = `${summary} — confirm below to proceed.`
    await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
    return { ok: true, data: { conversationId, reply, proposedAction: { id: actionRow.id, actionType, summary }, navigate } }
  }

  const reply = dataAnswer ?? content ?? (navigate ? `Here's where to find that.` : "I'm not sure how to help with that — try rephrasing?")
  await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
  return { ok: true, data: { conversationId, reply, proposedAction: null, navigate } }
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
    } else if (action.action_type === 'create_invoice') {
      let customerId: string | null = null
      if (data.customer_name) {
        const nameParts = String(data.customer_name).trim().split(/\s+/)
        const { data: matches } = await admin
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('first_name', `%${nameParts[0]}%`)
          .limit(1)
        customerId = matches?.[0]?.id ?? null
      }

      const { data: order, error: orderErr } = await admin
        .from('orders')
        .insert({ tenant_id: tenantId, customer_id: customerId, notes: data.notes ? String(data.notes).slice(0, 2000) : null })
        .select('id, order_number')
        .single()
      if (orderErr || !order) throw new Error(orderErr?.message ?? 'Could not create order')

      const items = Array.isArray(data.items) ? data.items as Array<{ name: string; quantity: number; unit_price: number }> : []
      if (items.length === 0) throw new Error('No line items given')
      const { error: linesErr } = await admin.from('order_line_items').insert(items.map(i => ({
        tenant_id: tenantId,
        order_id: order.id,
        item_name_snapshot: String(i.name).slice(0, 200),
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price) || 0,
        billing_unit_snapshot: 'flat' as const,
      })))
      if (linesErr) throw new Error(linesErr.message)

      reply = `✓ Created invoice #${order.order_number}${data.customer_name && !customerId ? ' (customer not linked — no matching contact found)' : ''}`
      revalidatePath('/orders')
    } else if (action.action_type === 'mark_order_paid') {
      const { data: order } = await admin.from('orders').select('id, order_number').eq('tenant_id', tenantId).eq('order_number', Number(data.order_number)).single()
      if (!order) throw new Error(`Order #${data.order_number} not found`)
      const { error } = await admin.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
      if (error) throw new Error(error.message)
      reply = `✓ Marked order #${order.order_number} as paid`
      revalidatePath('/orders')
      revalidatePath(`/orders/${order.id}`)
    } else if (action.action_type === 'add_order_discount') {
      const { data: order } = await admin.from('orders').select('id, order_number').eq('tenant_id', tenantId).eq('order_number', Number(data.order_number)).single()
      if (!order) throw new Error(`Order #${data.order_number} not found`)
      const discountType = data.discount_type === 'flat' ? 'flat' : 'percent'
      const discountValue = Number(data.discount_value)
      if (!discountValue || discountValue < 0) throw new Error('Invalid discount amount')
      if (discountType === 'percent' && discountValue > 100) throw new Error("Percentage discount can't exceed 100%")
      const { error } = await admin.from('orders').update({
        discount_type: discountType,
        discount_value: discountValue,
        show_discount: data.show_discount !== false,
      }).eq('id', order.id)
      if (error) throw new Error(error.message)
      reply = `✓ Applied a ${discountType === 'percent' ? `${discountValue}%` : `$${discountValue}`} discount to order #${order.order_number}`
      revalidatePath('/orders')
      revalidatePath(`/orders/${order.id}`)
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
