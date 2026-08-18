'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Notification = {
  id: string
  tenant_id: string
  type: 'quote_signed' | 'invoice_paid' | 'contact_updated'
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as Notification[]
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
  return count ?? 0
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/', 'layout')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  revalidatePath('/', 'layout')
}
