import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderBrandedEmail } from '@/lib/email/brand'
import { sendEmail } from '@/lib/email/send'

/**
 * Ingest endpoint for the weekly OWASP ZAP baseline scan (Phase 34), called
 * by .github/workflows/zap-baseline-scan.yml after it parses ZAP's JSON
 * report. Not a Vercel cron route — GitHub Actions POSTs here directly with
 * a shared bearer secret, so this uses its own env var (ZAP_INGEST_SECRET)
 * rather than the Vercel-cron CRON_SECRET.
 */

const ALERT_RECIPIENTS = ['qcyphertech@gmail.com', 'nevis09@gmail.com']

type Finding = {
  vulnerabilityType?: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  affectedUrl?: string
  affectedParameter?: string
  description?: string
  remediationAdvice?: string
  owaspCategory?: string
}

type IngestPayload = {
  scanDate?: string
  scanType?: 'weekly' | 'on_demand'
  environment?: string
  counts: { critical: number; high: number; medium: number; low: number; info: number }
  findings: Finding[]
  reportUrl?: string
  status?: 'completed' | 'failed'
  errorMessage?: string
}

// Groups the same vuln across scans. Severity is deliberately excluded —
// ZAP reclassifying the same underlying issue shouldn't split it into a
// second group.
function findingFingerprint(f: Finding): string {
  return [f.vulnerabilityType ?? '', f.affectedUrl ?? '', f.affectedParameter ?? ''].join('|').toLowerCase()
}

async function sendCriticalAlert(scan: { id: string; critical_count: number; high_count: number; medium_count: number; low_count: number; scan_date: string; environment: string; reportUrl?: string }) {
  await sendEmail({
    to: ALERT_RECIPIENTS,
    subject: `QCypher Security Scan: ${scan.critical_count} critical, ${scan.high_count} high finding(s)`,
    html: renderBrandedEmail({
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#171a2b;">Weekly security scan found issues</p>
        <p style="margin:0 0 8px;"><strong>Scan date:</strong> ${scan.scan_date}</p>
        <p style="margin:0 0 8px;"><strong>Environment:</strong> ${scan.environment}</p>
        <p style="margin:0 0 16px;">
          ${[
            ['#dc2626', 'Critical', scan.critical_count],
            ['#ea580c', 'High', scan.high_count],
            ['#eab308', 'Medium', scan.medium_count],
            ['#0ea5e9', 'Low', scan.low_count],
          ].map(([color, label, count]) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>${label}: ${count}`).join('&nbsp;&nbsp;')}
        </p>
        <p style="margin:16px 0 0;">Review findings in the Admin Console within 24 hours and prioritize by severity.</p>
      `,
      cta: { label: 'Review findings', href: `${process.env.APP_URL ?? 'https://www.qcyphertech.com'}/admin` },
    }),
  })
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ZAP_INGEST_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as IngestPayload
  if (!body?.counts) {
    return NextResponse.json({ error: 'Missing counts' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: scan, error: scanErr } = await admin
    .from('vulnerability_scans')
    .insert({
      scan_date: body.scanDate ?? new Date().toISOString().split('T')[0],
      scan_type: body.scanType ?? 'weekly',
      environment: body.environment ?? 'production',
      critical_count: body.counts.critical ?? 0,
      high_count: body.counts.high ?? 0,
      medium_count: body.counts.medium ?? 0,
      low_count: body.counts.low ?? 0,
      info_count: body.counts.info ?? 0,
      report_url: body.reportUrl ?? null,
      status: body.status ?? 'completed',
      error_message: body.errorMessage ?? null,
    })
    .select('id, critical_count, high_count, medium_count, low_count, scan_date, environment')
    .single()

  if (scanErr || !scan) {
    return NextResponse.json({ error: scanErr?.message ?? 'Failed to insert scan' }, { status: 500 })
  }

  if (body.findings?.length) {
    for (const f of body.findings) {
      const fingerprint = findingFingerprint(f)
      const now = new Date().toISOString()

      const { data: existingGroup } = await admin
        .from('vulnerability_finding_groups')
        .select('id, occurrence_count')
        .eq('fingerprint', fingerprint)
        .maybeSingle()

      let groupId: string
      if (existingGroup) {
        groupId = existingGroup.id
        await admin.from('vulnerability_finding_groups').update({
          last_seen_at: now,
          occurrence_count: existingGroup.occurrence_count + 1,
          severity: f.severity,
          description: f.description ?? null,
          remediation_advice: f.remediationAdvice ?? null,
          // Reopens automatically if it had been marked resolved — ZAP
          // flagging the same fingerprint again means it's still present.
          is_resolved: false,
          resolved_at: null,
        }).eq('id', groupId)
      } else {
        const { data: newGroup } = await admin.from('vulnerability_finding_groups').insert({
          fingerprint,
          vulnerability_type: f.vulnerabilityType ?? null,
          severity: f.severity,
          affected_url: f.affectedUrl ?? null,
          affected_parameter: f.affectedParameter ?? null,
          description: f.description ?? null,
          remediation_advice: f.remediationAdvice ?? null,
          owasp_category: f.owaspCategory ?? null,
        }).select('id').single()
        groupId = newGroup!.id
      }

      await admin.from('vulnerability_findings').insert({
        scan_id: scan.id,
        group_id: groupId,
        vulnerability_type: f.vulnerabilityType ?? null,
        severity: f.severity,
        affected_url: f.affectedUrl ?? null,
        affected_parameter: f.affectedParameter ?? null,
        description: f.description ?? null,
        remediation_advice: f.remediationAdvice ?? null,
        owasp_category: f.owaspCategory ?? null,
      })
    }
  }

  if (scan.critical_count > 0 || scan.high_count > 0) {
    await sendCriticalAlert({ ...scan, reportUrl: body.reportUrl })
    await admin.from('vulnerability_scans').update({
      alert_sent_at: new Date().toISOString(),
      alert_recipients: ALERT_RECIPIENTS,
    }).eq('id', scan.id)
  }

  return NextResponse.json({ ok: true, scanId: scan.id })
}
