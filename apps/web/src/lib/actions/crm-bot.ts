'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getTenantId } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { callDeepSeekWithTools, type ChatMessage, type ChatTool } from '@/lib/deepseek'
import { CRM_BOT_SYSTEM_PROMPT } from '@/lib/bot-knowledge'
import { logAudit } from '@/lib/actions/audit'
import { DEFAULT_SETTINGS, type TenantSettings } from '@/lib/types/settings'
import type { Json } from '@qcypher/db'

export type CrmBotActionType =
  | 'create_contact' | 'schedule_event' | 'create_invoice' | 'mark_order_paid' | 'add_order_discount'
  | 'toggle_module' | 'invite_team_member' | 'undo_last_action'

export type CrmBotProposedAction = {
  id: string
  actionType: CrmBotActionType
  summary: string
  step?: { index: number; total: number }
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
  const role = (fresh?.app_metadata?.role ?? 'member') as 'owner' | 'member' | 'read_only'
  if (role === 'read_only') throw new Error('Read-only accounts cannot use the assistant')

  const tenantId = await getTenantId(user.id, fresh?.app_metadata)
  return { userId: user.id, admin, tenantId, role }
}

// toggle_module and invite_team_member touch shared tenant state (nav
// visibility for everyone, who has account access) — same gate the
// Settings UI itself uses (isAdmin = role === 'owner' in
// app/(app)/settings/page.tsx), not just "not read-only".
const OWNER_ONLY_ACTIONS = new Set<CrmBotActionType>(['toggle_module', 'invite_team_member'])

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
    description: 'Fetch one live metric and state it plainly. Use this for a simple lookup ("how much revenue this month", "how many leads") — for anything that needs comparing, explaining, or reasoning over the numbers ("why is revenue down", "compare this month to last"), call analyze_business_data instead.',
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
    name: 'analyze_business_data',
    description: 'Answer a question that requires reasoning over real business numbers — comparisons, trends, explanations ("why is revenue down", "compare this month vs last", "how are we doing overall"). Pulls a full snapshot of real current + prior-period numbers and reasons over them; never invents a figure not in that snapshot.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The user\'s question, verbatim or close to it' },
      },
      required: ['question'],
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
  {
    name: 'toggle_module',
    description: 'Propose turning an app section on or off in the workspace nav (Settings > Workspace). Only the account owner can do this — if the caller isn\'t the owner, still call it; the confirmation step will explain why it was refused.',
    parameters: {
      type: 'object',
      properties: {
        module: { type: 'string', enum: ['calendar', 'templates', 'catalog', 'orders', 'overview', 'crm_bot'] },
        enabled: { type: 'boolean' },
      },
      required: ['module', 'enabled'],
    },
  },
  {
    name: 'invite_team_member',
    description: 'Propose inviting a new team member by email. Only the account owner can do this — if the caller isn\'t the owner, still call it; the confirmation step will explain why it was refused.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'member', 'read_only'], description: 'Defaults to member if not specified' },
      },
      required: ['email'],
    },
  },
  {
    name: 'undo_last_action',
    description: 'Propose reversing the most recent completed action from this conversation (e.g. "undo that", "never mind, undo the discount"). Only the last completed action can be undone, and only once.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
]

// Reversible action types only — create_invoice and invite_team_member
// are deliberately excluded: undoing a sent invite means revoking
// account access after the fact, and undoing an invoice after it may
// already be visible to a customer is a different risk profile than
// undoing a same-conversation typo. Both are still fixable manually
// from their own pages.
const UNDOABLE_ACTIONS = new Set<CrmBotActionType>([
  'create_contact', 'schedule_event', 'mark_order_paid', 'add_order_discount', 'toggle_module',
])

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
  if (type === 'toggle_module') {
    return `${data.enabled ? 'Enable' : 'Disable'} the ${data.module} module`
  }
  if (type === 'invite_team_member') {
    return `Invite ${data.email} as ${data.role ?? 'member'}`
  }
  if (type === 'undo_last_action') {
    return `Undo: ${data.target_summary}`
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

type ContactMatch = { id: string; first_name: string; last_name: string | null }
// Was a silent "first ilike match wins" in schedule_event and
// create_invoice — with two "John"s, it would confidently link the
// wrong one with no indication it had guessed. Now returns every match
// (capped) so a caller can refuse to guess when there's more than one.
async function matchContactByName(admin: AdminClient, tenantId: string, name: string): Promise<{ matches: ContactMatch[] }> {
  const nameParts = name.trim().split(/\s+/)
  const { data } = await admin
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
    .limit(5)
  return { matches: (data ?? []) as ContactMatch[] }
}

function contactLabel(c: ContactMatch): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

// Two-step reasoning loop: fetch a broad snapshot of REAL numbers first,
// then hand them to the model as data (not as something it has to
// recall or guess) and ask it to answer the actual question. This is
// what lets QBot answer "why is revenue down" or "compare this month to
// last" instead of only ever restating one fixed metric — the model
// reasons over real figures, it never invents one not in the snapshot.
async function runBusinessAnalysis(admin: AdminClient, tenantId: string, question: string): Promise<string> {
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [thisMonthPaid, lastMonthPaid, unpaid, leads, active, expensesThis, expensesLast, upcoming] = await Promise.all([
    admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('updated_at', startOfThisMonth.toISOString()),
    admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('updated_at', startOfLastMonth.toISOString()).lt('updated_at', startOfThisMonth.toISOString()),
    admin.from('orders').select('total_amount').eq('tenant_id', tenantId).eq('payment_status', 'pending'),
    admin.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'lead'),
    admin.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    admin.from('expenses').select('amount').eq('tenant_id', tenantId).gte('date', startOfThisMonth.toISOString().slice(0, 10)),
    admin.from('expenses').select('amount').eq('tenant_id', tenantId).gte('date', startOfLastMonth.toISOString().slice(0, 10)).lt('date', startOfThisMonth.toISOString().slice(0, 10)),
    admin.from('events').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('starts_at', now.toISOString()),
  ])

  const sum = (rows: { total_amount?: number; amount?: number }[] | null) => (rows ?? []).reduce((s, r) => s + (r.total_amount ?? r.amount ?? 0), 0)
  const unpaidRows = unpaid.data ?? []

  const snapshot = [
    `Revenue this month so far (paid orders): ${money(sum(thisMonthPaid.data))}`,
    `Revenue last month (paid orders, full month): ${money(sum(lastMonthPaid.data))}`,
    `Unpaid invoices: ${unpaidRows.length}, totaling ${money(sum(unpaidRows))}`,
    `Leads: ${leads.count ?? 0}`,
    `Active customers: ${active.count ?? 0}`,
    `Expenses this month so far: ${money(sum(expensesThis.data))}`,
    `Expenses last month (full month): ${money(sum(expensesLast.data))}`,
    `Upcoming calendar events: ${upcoming.count ?? 0}`,
    `Today's date: ${now.toLocaleDateString('en-US', { dateStyle: 'long' })} — note "this month" is partial, "last month" is a complete month, so a same-number comparison isn't apples-to-apples unless you say so.`,
  ].join('\n')

  try {
    const { callDeepSeekChat } = await import('@/lib/deepseek')
    const answer = await callDeepSeekChat([
      { role: 'system', content: 'You answer questions about a business using ONLY the real numbers given below — never invent or estimate a figure that is not there. If the data does not answer the question, say so plainly. Keep it to 2-4 sentences, no markdown.' },
      { role: 'user', content: `Real numbers:\n${snapshot}\n\nQuestion: ${question}` },
    ], { maxTokens: 250 })
    return answer
  } catch {
    return `Here's what I have: ${snapshot.replace(/\n/g, ' ')}`
  }
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
  let admin: Awaited<ReturnType<typeof requireTenantWriter>>['admin'], tenantId: string, role: 'owner' | 'member' | 'read_only', userId: string
  try {
    ;({ admin, tenantId, role, userId } = await requireTenantWriter())
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

  // Confirmed live 2026-08-18: without this, "tomorrow"/"next week" in
  // schedule_event get resolved against the model's training cutoff
  // instead of the real date — a request made today landed on the
  // calendar in January 2025. Stamping the real current date/time (with
  // weekday, since "tomorrow" needs day-of-week context too) into every
  // turn fixes relative-date resolution without touching the model.
  const now = new Date()
  const currentDateLine = `Current date/time: ${now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}. Resolve "today"/"tomorrow"/"next week" etc. against this, not any other date.`

  // Cross-conversation memory: every new conversation used to start
  // completely cold, with no idea what was discussed last time. Only
  // fetched on this conversation's first turn (not every message) —
  // the tail of the immediately-prior conversation is enough to let
  // "did that invite go through?" or "back to what we were doing" work
  // without re-explaining, without paying this query on every turn.
  let memoryLine = ''
  if (!history || history.length === 0) {
    const { data: priorConvo } = await admin
      .from('chatbot_conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .neq('id', conversationId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (priorConvo) {
      const { data: priorMessages } = await admin
        .from('chatbot_messages')
        .select('role, content')
        .eq('conversation_id', priorConvo.id)
        .order('created_at', { ascending: false })
        .limit(8)
      if (priorMessages && priorMessages.length > 0) {
        const transcript = priorMessages.reverse().map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`).join('\n')
        memoryLine = `\n\nContext from your most recent previous conversation with this user (for continuity only — don't assume it's still relevant unless the user references it):\n${transcript}`
      }
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: `${CRM_BOT_SYSTEM_PROMPT}\n\n${currentDateLine}${memoryLine}` },
    ...(history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: trimmed },
  ]

  let content: string | null
  let toolCalls: Awaited<ReturnType<typeof callDeepSeekWithTools>>['toolCalls']
  try {
    // Raised from 300: a multi-step request now returns several tool
    // calls in one response, which needs more headroom than a single call.
    const result = await callDeepSeekWithTools(messages, CRM_BOT_TOOLS, { maxTokens: 500 })
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

  const analyzeCall = toolCalls.find(c => c.name === 'analyze_business_data')
  if (analyzeCall) {
    const answer = await runBusinessAnalysis(admin, tenantId, String(analyzeCall.arguments.question ?? message))
    dataAnswer = dataAnswer ? `${dataAnswer} ${answer}` : answer
  }

  const navigate = navigateLinks.length ? navigateLinks : null

  // undo_last_action needs to resolve WHICH action it's undoing before a
  // pending row can even be created — handled separately from the
  // generic mutation-batch path below, which assumes the tool call's
  // own arguments are already everything needed to summarize it.
  const undoCall = toolCalls.find(c => c.name === 'undo_last_action')
  if (undoCall) {
    const { data: target } = await admin
      .from('crm_bot_actions')
      .select('id, action_type, action_data, result_data')
      .eq('conversation_id', conversationId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!target || !UNDOABLE_ACTIONS.has(target.action_type as CrmBotActionType)) {
      const reply = target
        ? "That last action can't be undone here — you'll need to fix it from its own page."
        : "There's nothing in this conversation for me to undo."
      await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
      return { ok: true, data: { conversationId, reply, proposedAction: null, navigate } }
    }
    if (OWNER_ONLY_ACTIONS.has(target.action_type as CrmBotActionType) && role !== 'owner') {
      const reply = "Only the account owner can undo that."
      await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
      return { ok: true, data: { conversationId, reply, proposedAction: null, navigate } }
    }

    const targetSummary = summarizeAction(target.action_type, target.action_data as Record<string, unknown>)
    const { data: actionRow, error } = await admin
      .from('crm_bot_actions')
      .insert({
        conversation_id: conversationId,
        tenant_id: tenantId,
        action_type: 'undo_last_action',
        action_data: { target_id: target.id, target_type: target.action_type, target_summary: targetSummary, target_result: target.result_data } as Json,
      })
      .select('id')
      .single()
    if (error || !actionRow) return { ok: false, error: 'Could not save proposed action' }

    const reply = `Undo: ${targetSummary} — confirm below to proceed.`
    await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
    return { ok: true, data: { conversationId, reply, proposedAction: { id: actionRow.id, actionType: 'undo_last_action', summary: reply.replace(' — confirm below to proceed.', '') }, navigate } }
  }

  const MUTATION_TOOL_NAMES = new Set([
    'create_contact', 'schedule_event', 'create_invoice', 'mark_order_paid',
    'add_order_discount', 'toggle_module', 'invite_team_member',
  ])
  // A single request can produce several proposed actions ("add a
  // contact and schedule a call with them") — DeepSeek returns them as
  // multiple toolCalls in one response. All get queued as a batch and
  // confirmed one at a time; confirmCrmBotAction surfaces the next one
  // automatically once the current step is resolved, so the user never
  // has to re-type anything mid-chain.
  const mutationCalls = toolCalls.filter(c => MUTATION_TOOL_NAMES.has(c.name))
  if (mutationCalls.length > 0) {
    const ownerBlocked = mutationCalls.find(c => OWNER_ONLY_ACTIONS.has(c.name as CrmBotActionType) && role !== 'owner')
    if (ownerBlocked) {
      const reply = "Only the account owner can do that — ask them, or an owner can do it from Settings."
      await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
      return { ok: true, data: { conversationId, reply, proposedAction: null, navigate } }
    }

    const batchId = mutationCalls.length > 1 ? crypto.randomUUID() : null
    const rows = mutationCalls.map((c, i) => ({
      conversation_id: conversationId,
      tenant_id: tenantId,
      action_type: c.name,
      action_data: c.arguments as Json,
      batch_id: batchId,
      batch_order: i,
    }))
    const { data: actionRows, error } = await admin.from('crm_bot_actions').insert(rows).select('id, action_type, action_data')
    if (error || !actionRows || actionRows.length === 0) return { ok: false, error: 'Could not save proposed action' }

    const first = actionRows[0]
    const firstType = first.action_type as CrmBotActionType
    const summary = summarizeAction(firstType, first.action_data as Record<string, unknown>)
    const stepSuffix = actionRows.length > 1 ? ` (step 1 of ${actionRows.length})` : ''
    const reply = `${summary}${stepSuffix} — confirm below to proceed.`
    await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
    return {
      ok: true,
      data: {
        conversationId,
        reply,
        proposedAction: {
          id: first.id,
          actionType: firstType,
          summary,
          step: actionRows.length > 1 ? { index: 1, total: actionRows.length } : undefined,
        },
        navigate,
      },
    }
  }

  const reply = dataAnswer ?? content ?? (navigate ? `Here's where to find that.` : "I'm not sure how to help with that — try rephrasing?")
  await admin.from('chatbot_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply })
  return { ok: true, data: { conversationId, reply, proposedAction: null, navigate } }
}

async function nextBatchAction(admin: AdminClient, batchId: string | null, currentOrder: number): Promise<CrmBotProposedAction | null> {
  if (!batchId) return null
  const { data: rows } = await admin
    .from('crm_bot_actions')
    .select('id, action_type, action_data, batch_order')
    .eq('batch_id', batchId)
    .eq('status', 'pending')
    .order('batch_order')
    .limit(1)
  const next = rows?.[0]
  if (!next) return null
  const { count: total } = await admin.from('crm_bot_actions').select('id', { count: 'exact', head: true }).eq('batch_id', batchId)
  const actionType = next.action_type as CrmBotActionType
  const summary = summarizeAction(actionType, next.action_data as Record<string, unknown>)
  return { id: next.id, actionType, summary, step: { index: next.batch_order + 1, total: total ?? currentOrder + 2 } }
}

export async function confirmCrmBotAction(actionId: string, approve: boolean): Promise<CrmBotResult<{ reply: string; nextAction: CrmBotProposedAction | null }>> {
  let admin: Awaited<ReturnType<typeof requireTenantWriter>>['admin'], tenantId: string, role: 'owner' | 'member' | 'read_only'
  try {
    ;({ admin, tenantId, role } = await requireTenantWriter())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not authorized' }
  }

  const { data: action } = await admin.from('crm_bot_actions').select('*').eq('id', actionId).single()
  if (!action || action.tenant_id !== tenantId) return { ok: false, error: 'Action not found' }
  if (action.status !== 'pending') return { ok: false, error: 'This action was already resolved' }

  if (!approve) {
    await admin.from('crm_bot_actions').update({ status: 'failed', error_message: 'Rejected by user', completed_at: new Date().toISOString() }).eq('id', actionId)
    // Cancel the rest of the batch too — a rejected step means the chain
    // no longer makes sense to continue (e.g. reject the contact creation
    // in "add a contact and schedule a call with them").
    if (action.batch_id) {
      await admin.from('crm_bot_actions')
        .update({ status: 'failed', error_message: 'Cancelled — an earlier step in this chain was rejected', completed_at: new Date().toISOString() })
        .eq('batch_id', action.batch_id).eq('status', 'pending')
    }
    const reply = "Okay, I won't do that."
    await admin.from('chatbot_messages').insert({ conversation_id: action.conversation_id, role: 'assistant', content: reply })
    return { ok: true, data: { reply, nextAction: null } }
  }

  if (OWNER_ONLY_ACTIONS.has(action.action_type as CrmBotActionType) && role !== 'owner') {
    return { ok: false, error: 'Only the account owner can do that' }
  }

  const data = action.action_data as Record<string, unknown>
  let reply: string
  // Filled in per action type below, then persisted as result_data —
  // undo_last_action reads this back to know exactly what to reverse
  // (the created row's id, or the values overwritten by an update).
  let resultData: Record<string, unknown> = {}
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
      resultData = { contact_id: contact.id }
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
        const { matches } = await matchContactByName(admin, tenantId, String(data.contact_name))
        if (matches.length > 1) {
          throw new Error(`AMBIGUOUS:Multiple contacts match "${data.contact_name}": ${matches.map(contactLabel).join(', ')}. Try again with a fuller name to pick one.`)
        }
        contactId = matches[0]?.id ?? null
      }

      const { data: event, error } = await admin.from('events').insert({
        tenant_id: tenantId,
        contact_id: contactId,
        title: String(data.title ?? 'Untitled').slice(0, 200),
        description: data.description ? String(data.description).slice(0, 2000) : null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      }).select('id').single()
      if (error || !event) throw new Error(error?.message ?? 'Insert failed')
      resultData = { event_id: event.id }
      reply = `✓ Scheduled "${data.title}" for ${startsAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
      revalidatePath('/calendar')
    } else if (action.action_type === 'create_invoice') {
      let customerId: string | null = null
      let ambiguousNote = ''
      if (data.customer_name) {
        const { matches } = await matchContactByName(admin, tenantId, String(data.customer_name))
        if (matches.length > 1) {
          throw new Error(`AMBIGUOUS:Multiple contacts match "${data.customer_name}": ${matches.map(contactLabel).join(', ')}. Try again with a fuller name to pick one.`)
        }
        customerId = matches[0]?.id ?? null
        if (!customerId) ambiguousNote = ' (customer not linked — no matching contact found)'
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

      resultData = { order_id: order.id }
      reply = `✓ Created invoice #${order.order_number}${ambiguousNote}`
      revalidatePath('/orders')
    } else if (action.action_type === 'mark_order_paid') {
      const { data: order } = await admin.from('orders').select('id, order_number, payment_status').eq('tenant_id', tenantId).eq('order_number', Number(data.order_number)).single()
      if (!order) throw new Error(`Order #${data.order_number} not found`)
      const { error } = await admin.from('orders').update({ payment_status: 'paid' }).eq('id', order.id)
      if (error) throw new Error(error.message)
      resultData = { order_id: order.id, previous_payment_status: order.payment_status }
      reply = `✓ Marked order #${order.order_number} as paid`
      revalidatePath('/orders')
      revalidatePath(`/orders/${order.id}`)
    } else if (action.action_type === 'add_order_discount') {
      const { data: order } = await admin.from('orders').select('id, order_number, discount_type, discount_value, show_discount').eq('tenant_id', tenantId).eq('order_number', Number(data.order_number)).single()
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
      resultData = {
        order_id: order.id,
        previous_discount_type: order.discount_type,
        previous_discount_value: order.discount_value,
        previous_show_discount: order.show_discount,
      }
      reply = `✓ Applied a ${discountType === 'percent' ? `${discountValue}%` : `$${discountValue}`} discount to order #${order.order_number}`
      revalidatePath('/orders')
      revalidatePath(`/orders/${order.id}`)
    } else if (action.action_type === 'toggle_module') {
      const moduleKey = String(data.module ?? '')
      const settingsKey = `show_${moduleKey}` as keyof TenantSettings
      if (!(settingsKey in DEFAULT_SETTINGS)) throw new Error(`Unknown module: ${moduleKey}`)
      const { data: tenant } = await admin.from('tenants').select('settings').eq('id', tenantId).single()
      const currentSettings = { ...DEFAULT_SETTINGS, ...(tenant?.settings as Record<string, unknown> ?? {}) }
      const merged = { ...currentSettings, [settingsKey]: data.enabled === true }
      const { error } = await admin.from('tenants').update({ settings: merged }).eq('id', tenantId)
      if (error) throw new Error(error.message)
      resultData = { settings_key: settingsKey, previous_value: currentSettings[settingsKey] }
      reply = `✓ ${data.enabled ? 'Enabled' : 'Disabled'} the ${moduleKey} module`
      revalidatePath('/settings', 'layout')
      revalidatePath('/dashboard', 'layout')
    } else if (action.action_type === 'invite_team_member') {
      const email = String(data.email ?? '').trim().toLowerCase()
      const inviteRole = ['owner', 'member', 'read_only'].includes(String(data.role)) ? String(data.role) : 'member'
      if (!email) throw new Error('No email given')

      const { data: { users: existingUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (existingUsers.some(u => u.email?.toLowerCase() === email)) {
        throw new Error('That email already has an account')
      }

      const { data: token, error: tokenErr } = await admin.from('invite_tokens').insert({ tenant_id: tenantId, email }).select('token').single()
      if (tokenErr) throw new Error(tokenErr.message)

      const appUrl = process.env.APP_URL ?? 'https://www.qcyphertech.com'
      const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/confirm`,
        data: { tenant_id: tenantId, role: inviteRole },
      })
      if (inviteErr) {
        await admin.from('invite_tokens').delete().eq('token', token.token)
        throw new Error(inviteErr.message)
      }

      const { data: { users } } = await admin.auth.admin.listUsers()
      const invited = users.find(u => u.email?.toLowerCase() === email)
      if (invited) {
        await admin.auth.admin.updateUserById(invited.id, {
          app_metadata: { tenant_id: tenantId, role: inviteRole, provider: 'email', providers: ['email'] },
        })
      }
      resultData = { invited_user_id: invited?.id ?? null, invite_token: token.token }
      reply = `✓ Invited ${email} as ${inviteRole}`
      revalidatePath('/settings')
    } else if (action.action_type === 'undo_last_action') {
      const targetId = String(data.target_id ?? '')
      const targetType = String(data.target_type ?? '') as CrmBotActionType
      const targetResult = (data.target_result ?? {}) as Record<string, unknown>

      const { data: targetRow } = await admin.from('crm_bot_actions').select('status').eq('id', targetId).eq('tenant_id', tenantId).single()
      if (!targetRow || targetRow.status !== 'completed') throw new Error('That action is no longer available to undo')

      if (targetType === 'create_contact') {
        const { error } = await admin.from('contacts').delete().eq('id', String(targetResult.contact_id))
        if (error) throw new Error(`Could not undo — ${error.message}`)
        revalidatePath('/contacts')
      } else if (targetType === 'schedule_event') {
        const { error } = await admin.from('events').delete().eq('id', String(targetResult.event_id))
        if (error) throw new Error(`Could not undo — ${error.message}`)
        revalidatePath('/calendar')
      } else if (targetType === 'mark_order_paid') {
        const { error } = await admin.from('orders').update({ payment_status: targetResult.previous_payment_status ?? 'pending' }).eq('id', String(targetResult.order_id))
        if (error) throw new Error(error.message)
        revalidatePath('/orders')
      } else if (targetType === 'add_order_discount') {
        const { error } = await admin.from('orders').update({
          discount_type: targetResult.previous_discount_type ?? null,
          discount_value: targetResult.previous_discount_value ?? null,
          show_discount: targetResult.previous_show_discount ?? true,
        }).eq('id', String(targetResult.order_id))
        if (error) throw new Error(error.message)
        revalidatePath('/orders')
      } else if (targetType === 'toggle_module') {
        const { data: tenant } = await admin.from('tenants').select('settings').eq('id', tenantId).single()
        const merged = { ...DEFAULT_SETTINGS, ...(tenant?.settings as Record<string, unknown> ?? {}), [String(targetResult.settings_key)]: targetResult.previous_value }
        const { error } = await admin.from('tenants').update({ settings: merged }).eq('id', tenantId)
        if (error) throw new Error(error.message)
        revalidatePath('/settings', 'layout')
        revalidatePath('/dashboard', 'layout')
      } else {
        throw new Error("That action type can't be undone")
      }

      await admin.from('crm_bot_actions').update({ status: 'undone', completed_at: new Date().toISOString() }).eq('id', targetId)
      reply = `✓ Undone: ${data.target_summary}`
    } else {
      throw new Error(`Unknown action type: ${action.action_type}`)
    }

    await admin.from('crm_bot_actions').update({ status: 'completed', completed_at: new Date().toISOString(), result_data: resultData as Json }).eq('id', actionId)
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : 'Unknown error'
    const ambiguous = rawMessage.startsWith('AMBIGUOUS:')
    const errorMessage = ambiguous ? rawMessage.slice('AMBIGUOUS:'.length) : rawMessage
    await admin.from('crm_bot_actions').update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() }).eq('id', actionId)
    reply = ambiguous ? errorMessage : `Sorry, that didn't work: ${errorMessage}`
  }

  await admin.from('chatbot_messages').insert({ conversation_id: action.conversation_id, role: 'assistant', content: reply })
  const nextAction = await nextBatchAction(admin, action.batch_id, action.batch_order)
  return { ok: true, data: { reply, nextAction } }
}
