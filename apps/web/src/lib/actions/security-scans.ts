'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdminUser } from '@/lib/auth/superadmin'
import { revalidatePath } from 'next/cache'

export type VulnerabilityScan = {
  id: string
  scan_date: string
  scan_type: 'weekly' | 'on_demand'
  environment: string
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  report_url: string | null
  status: 'completed' | 'failed'
  error_message: string | null
  alert_sent_at: string | null
  created_at: string
}

export type VulnerabilityFinding = {
  id: string
  scan_id: string
  vulnerability_type: string | null
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  affected_url: string | null
  affected_parameter: string | null
  description: string | null
  remediation_advice: string | null
  owasp_category: string | null
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: { user: fresh } } = await admin.auth.admin.getUserById(user.id)
  if (!isSuperAdminUser(fresh)) throw new Error('Super admin only')

  return { user, admin }
}

export async function listVulnerabilityScans(): Promise<VulnerabilityScan[]> {
  const { admin } = await requireSuperAdmin()
  const { data } = await admin.from('vulnerability_scans').select('*').order('scan_date', { ascending: false }).limit(50)
  return (data ?? []) as VulnerabilityScan[]
}

export async function getScanFindings(scanId: string): Promise<VulnerabilityFinding[]> {
  const { admin } = await requireSuperAdmin()
  const { data } = await admin.from('vulnerability_findings').select('*').eq('scan_id', scanId).order('severity')
  return (data ?? []) as VulnerabilityFinding[]
}

export async function resolveFinding(findingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { admin } = await requireSuperAdmin()
  const { error } = await admin.from('vulnerability_findings').update({
    is_resolved: true,
    resolved_at: new Date().toISOString(),
  }).eq('id', findingId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
