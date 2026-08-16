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

export type VulnerabilityFindingGroup = {
  id: string
  vulnerability_type: string | null
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  affected_url: string | null
  affected_parameter: string | null
  description: string | null
  remediation_advice: string | null
  owasp_category: string | null
  first_seen_at: string
  last_seen_at: string
  occurrence_count: number
  is_resolved: boolean
  resolved_at: string | null
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

// Deduplicated view — one row per distinct vuln (type+url+parameter) across
// all scans, with how many scans it's shown up in and when it was first/last
// seen. This is the primary remediation-tracking surface; resolving a group
// means "confirmed fixed," and it auto-reopens if the same fingerprint shows
// up in a later scan.
export async function listFindingGroups(): Promise<VulnerabilityFindingGroup[]> {
  const { admin } = await requireSuperAdmin()
  const { data } = await admin
    .from('vulnerability_finding_groups')
    .select('id, vulnerability_type, severity, affected_url, affected_parameter, description, remediation_advice, owasp_category, first_seen_at, last_seen_at, occurrence_count, is_resolved, resolved_at')
    .order('is_resolved', { ascending: true })
    .order('last_seen_at', { ascending: false })
  return (data ?? []) as VulnerabilityFindingGroup[]
}

export async function resolveFindingGroup(groupId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { admin } = await requireSuperAdmin()
  const { error } = await admin.from('vulnerability_finding_groups').update({
    is_resolved: true,
    resolved_at: new Date().toISOString(),
  }).eq('id', groupId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}
