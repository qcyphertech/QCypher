'use server'

import { createClient } from '@/lib/supabase/server'

export type SearchResult = {
  type: 'contact' | 'order' | 'event' | 'template'
  id: string
  title: string
  subtitle: string
  href: string
}

// RLS-scoped (regular client, not admin) — every query below is
// automatically limited to the caller's own tenant, same as any other
// authenticated read in this app. Runs all four lookups in parallel and
// caps each at 5 so the dropdown stays short and fast.
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const supabase = await createClient()
  const like = `%${q}%`
  const asNumber = Number(q)
  const isNumeric = !Number.isNaN(asNumber) && q !== ''

  const [contacts, orders, events, templates] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .limit(5),
    supabase
      .from('orders')
      .select('id, order_number, total_amount, payment_status, contacts(first_name, last_name)')
      .or(isNumeric ? `order_number.eq.${asNumber},total_amount.eq.${asNumber}` : `payment_status.ilike.${like}`)
      .limit(5),
    supabase
      .from('events')
      .select('id, title, starts_at')
      .ilike('title', like)
      .limit(5),
    supabase
      .from('templates')
      .select('id, name')
      .ilike('name', like)
      .limit(5),
  ])

  const results: SearchResult[] = []

  for (const c of (contacts.data ?? []) as { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null }[]) {
    results.push({
      type: 'contact', id: c.id,
      title: `${c.first_name} ${c.last_name ?? ''}`.trim(),
      subtitle: c.email ?? c.phone ?? 'Contact',
      href: `/contacts/${c.id}`,
    })
  }

  for (const o of (orders.data ?? []) as { id: string; order_number: number | null; total_amount: number; payment_status: string; contacts: { first_name: string; last_name: string | null } | null }[]) {
    const customer = o.contacts ? `${o.contacts.first_name} ${o.contacts.last_name ?? ''}`.trim() : 'No contact'
    results.push({
      type: 'order', id: o.id,
      title: o.order_number ? `Order #${o.order_number}` : `Order`,
      subtitle: `${customer} · $${Number(o.total_amount).toFixed(2)} · ${o.payment_status}`,
      href: `/orders/${o.id}`,
    })
  }

  for (const e of (events.data ?? []) as { id: string; title: string; starts_at: string }[]) {
    results.push({
      type: 'event', id: e.id,
      title: e.title,
      subtitle: new Date(e.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      href: `/calendar?event=${e.id}`,
    })
  }

  for (const t of (templates.data ?? []) as { id: string; name: string }[]) {
    results.push({
      type: 'template', id: t.id,
      title: t.name,
      subtitle: 'Template',
      href: `/templates/${t.id}`,
    })
  }

  return results
}
