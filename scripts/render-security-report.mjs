#!/usr/bin/env node
// Renders the single, modern HTML security report from ZAP's own raw JSON
// output — the only report the workflow produces (zap-baseline.py's bundled
// Jinja2 -r report is no longer generated). Reads directly from
// zap-report.json so every field the raw ZAP report shows (per-alert CWE/
// WASC/plugin IDs, confidence, all affected URLs, evidence, references,
// scan insights, ZAP version/site metadata) has a home here too — this
// replaces that report, so nothing it had should go missing.
// No external libs/CDNs: self-contained inline SVG, safe to open locally.
//
// Usage: node render-security-report.mjs <zap-report.json> <out.html> <runUrl>

import { readFileSync, writeFileSync } from 'node:fs'

const [, , zapReportPath, outPath, runUrl] = process.argv

let zap = null
try {
  zap = JSON.parse(readFileSync(zapReportPath, 'utf8'))
} catch {
  zap = null
}

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info']
const SEVERITY_COLOR = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#0284c7',
  Info: '#8b93a7',
}
const RISKCODE_TO_SEVERITY = { 3: 'High', 2: 'Medium', 1: 'Low', 0: 'Info' }

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function stripP(html) {
  return String(html ?? '').replace(/<\/?p>/g, ' ').trim()
}

const site = zap?.site?.[0]
const rawAlerts = site?.alerts ?? []
const targetUrl = site ? `${site['@ssl'] === 'true' ? 'https' : 'http'}://${site['@name'] ?? site['@host']}` : ''
const insights = zap?.insights ?? []

// Normalize each alert — riskcode is a string ("2"), keep every field the
// raw report shows (confidence, cweid, wascid, pluginid, reference,
// otherinfo, systemic, count) plus the FULL instances list, not just one.
const alerts = rawAlerts.map(a => ({
  name: a.name ?? a.alert ?? 'Unnamed finding',
  severity: RISKCODE_TO_SEVERITY[Number(a.riskcode)] ?? 'Info',
  confidence: a.confidence,
  description: stripP(a.desc),
  solution: stripP(a.solution),
  otherinfo: stripP(a.otherinfo),
  reference: (a.reference ?? '').match(/<p>(.*?)<\/p>/g)?.map(m => m.replace(/<\/?p>/g, '')) ?? [],
  cweid: a.cweid,
  wascid: a.wascid,
  pluginid: a.pluginid,
  count: Number(a.count ?? (a.instances?.length ?? 0)),
  instances: (a.instances ?? []).map(i => ({
    uri: i.uri, method: i.method, param: i.param, attack: i.attack, evidence: i.evidence, otherinfo: i.otherinfo,
  })),
}))

const SEVERITY_COUNT = Object.fromEntries(SEVERITY_ORDER.map(s => [s, alerts.filter(a => a.severity === s).length]))
const total = alerts.length

// --- Donut chart: severity mix -------------------------------------------
function donutChart() {
  const size = 200, r = 80, cx = size / 2, cy = size / 2, strokeWidth = 28
  if (total === 0) {
    return `<svg viewBox="0 0 ${size} ${size}" width="200" height="200">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e6e9f0" stroke-width="${strokeWidth}" />
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="15" fill="#5b6072" font-weight="700">Clean</text>
    </svg>`
  }
  const circumference = 2 * Math.PI * r
  let offset = 0
  const segments = SEVERITY_ORDER.filter(s => SEVERITY_COUNT[s] > 0).map(s => {
    const frac = SEVERITY_COUNT[s] / total
    const dash = frac * circumference
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${SEVERITY_COLOR[s]}" stroke-width="${strokeWidth}"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"
      stroke-linecap="butt" />`
    offset += dash
    return seg
  }).join('\n')
  return `<svg viewBox="0 0 ${size} ${size}" width="200" height="200">
    ${segments}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="30" font-weight="800" fill="#171a2b">${total}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="12" fill="#5b6072" font-weight="600" letter-spacing="0.04em">FINDING${total === 1 ? '' : 'S'}</text>
  </svg>`
}

// --- Bar chart: findings by instance count ---------------------------
function barChart() {
  const rows = [...alerts].sort((a, b) => b.count - a.count || SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)).slice(0, 8)
  if (rows.length === 0) return `<div style="color:#5b6072;font-size:14px;padding:24px 0;">No findings to chart.</div>`
  const maxCount = Math.max(...rows.map(a => a.count))
  return rows.map(a => {
    const pct = Math.max(6, Math.round((a.count / maxCount) * 100))
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:220px;flex-shrink:0;font-size:13px;color:#171a2b;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</div>
        <div style="flex:1;background:#eef0f5;border-radius:6px;height:20px;position:relative;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${SEVERITY_COLOR[a.severity]};border-radius:6px;"></div>
        </div>
        <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:700;color:#171a2b;">${a.count}</div>
      </div>`
  }).join('\n')
}

// --- Quick-jump summary table (mirrors the raw report's "Summary of Alerts") ---
function summaryTable() {
  if (alerts.length === 0) return ''
  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#5b6072;">
          <th style="padding:6px 10px;font-weight:700;">Risk</th>
          <th style="padding:6px 10px;font-weight:700;">Alert</th>
          <th style="padding:6px 10px;font-weight:700;text-align:right;">Instances</th>
        </tr>
      </thead>
      <tbody>
        ${alerts.map((a, i) => `
        <tr style="border-top:1px solid rgba(26,48,112,0.08);">
          <td style="padding:8px 10px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SEVERITY_COLOR[a.severity]};margin-right:6px;"></span>${a.severity}</td>
          <td style="padding:8px 10px;"><a href="#finding-${i}" style="color:#171a2b;font-weight:600;text-decoration:none;">${escapeHtml(a.name)}</a></td>
          <td style="padding:8px 10px;text-align:right;color:#5b6072;">${a.count}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
}

// --- Insights (ZAP's scan-quality signals — response codes, slow responses, etc) ---
function insightsSection() {
  if (insights.length === 0) return ''
  const LEVEL_COLOR = { High: '#dc2626', Medium: '#d97706', Low: '#0284c7', Info: '#8b93a7', Warning: '#d97706' }
  return `
    <div style="padding:8px 36px 8px;">
      <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin:24px 0 14px;">Scan insights</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${insights.map(ins => `
          <div style="display:flex;align-items:center;gap:8px;background:#f8f9fc;border:1px solid rgba(26,48,112,0.10);border-radius:10px;padding:8px 12px;font-size:12px;">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LEVEL_COLOR[ins.level] ?? '#8b93a7'};flex-shrink:0;"></span>
            <span style="color:#171a2b;">${escapeHtml(ins.description)}</span>
            <span style="color:#5b6072;font-weight:700;">${escapeHtml(ins.statistic)}${/percentage/i.test(ins.description ?? '') ? '%' : ''}</span>
          </div>`).join('')}
      </div>
    </div>`
}

// --- Findings list, grouped by severity, full detail per alert -----------
function instanceRow(inst) {
  return `
    <div style="background:#f8f9fc;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:12px;">
      <div style="word-break:break-all;color:#171a2b;font-weight:600;">${escapeHtml(inst.method)} ${escapeHtml(inst.uri)}</div>
      ${inst.param ? `<div style="color:#5b6072;margin-top:2px;">Parameter: <span style="color:#171a2b;">${escapeHtml(inst.param)}</span></div>` : ''}
      ${inst.evidence ? `<div style="color:#5b6072;margin-top:4px;font-family:ui-monospace,Menlo,monospace;font-size:11px;word-break:break-all;background:#fff;border-radius:6px;padding:6px 8px;border:1px solid rgba(26,48,112,0.08);">${escapeHtml(inst.evidence)}</div>` : ''}
    </div>`
}

function findingCard(a, i) {
  const refLinks = a.reference.map(r => `<a href="${escapeHtml(r)}" style="color:#2a52a0;word-break:break-all;">${escapeHtml(r)}</a>`).join('<br>')
  return `
    <div id="finding-${i}" style="padding:18px 22px;border-left:3px solid ${SEVERITY_COLOR[a.severity]};background:#fff;border-radius:0 12px 12px 0;margin-bottom:12px;box-shadow:0 1px 2px rgba(26,48,112,0.06);">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
        <div style="font-size:15px;font-weight:700;color:#171a2b;">${escapeHtml(a.name)}</div>
        <div style="font-size:11px;color:#5b6072;font-weight:600;">${a.count} instance${a.count === 1 ? '' : 's'}${a.confidence ? ` &middot; confidence ${escapeHtml(a.confidence)}/3` : ''}</div>
      </div>
      ${a.description ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:8px;">${escapeHtml(a.description)}</div>` : ''}
      ${a.solution ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:8px;"><span style="font-weight:700;">Remediation: </span>${escapeHtml(a.solution)}</div>` : ''}
      ${a.otherinfo ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:8px;"><span style="font-weight:700;">Other info: </span>${escapeHtml(a.otherinfo)}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:#5b6072;margin-bottom:4px;">
        ${a.cweid ? `<span>CWE: <a href="https://cwe.mitre.org/data/definitions/${escapeHtml(a.cweid)}.html" style="color:#2a52a0;">${escapeHtml(a.cweid)}</a></span>` : ''}
        ${a.wascid ? `<span>WASC: ${escapeHtml(a.wascid)}</span>` : ''}
        ${a.pluginid ? `<span>Plugin: <a href="https://www.zaproxy.org/docs/alerts/${escapeHtml(a.pluginid)}/" style="color:#2a52a0;">${escapeHtml(a.pluginid)}</a></span>` : ''}
      </div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#2a52a0;">Affected URLs &amp; evidence (${a.instances.length})</summary>
        ${a.instances.map(instanceRow).join('')}
      </details>
      ${refLinks ? `<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12px;font-weight:700;color:#2a52a0;">References</summary><div style="font-size:12px;margin-top:8px;line-height:1.8;">${refLinks}</div></details>` : ''}
    </div>`
}

function findingsList() {
  if (alerts.length === 0) {
    return `<div style="text-align:center;padding:48px 24px;color:#5b6072;">
      <div style="font-size:15px;font-weight:700;color:#171a2b;margin-bottom:4px;">No findings on this scan</div>
      <div style="font-size:13px;">Nothing to review — clean pass.</div>
    </div>`
  }
  return SEVERITY_ORDER.filter(s => alerts.some(a => a.severity === s)).map(sev => {
    const items = alerts.map((a, i) => ({ a, i })).filter(({ a }) => a.severity === sev)
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${SEVERITY_COLOR[sev]};"></span>
          <span style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#171a2b;">${sev}</span>
          <span style="font-size:12px;color:#5b6072;font-weight:600;">(${items.length})</span>
        </div>
        ${items.map(({ a, i }) => findingCard(a, i)).join('')}
      </div>`
  }).join('\n')
}

function statCard(label, value, color) {
  return `
    <div style="flex:1;min-width:110px;background:#fff;border:1px solid rgba(26,48,112,0.10);border-radius:14px;padding:16px 18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:6px;">${label}</div>
      <div style="font-size:26px;font-weight:800;color:${value > 0 ? color : '#171a2b'};">${value}</div>
    </div>`
}

const generatedOn = zap?.['@generated'] ?? new Date().toISOString()
const zapVersion = zap?.['@version'] ?? 'unknown'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QCypher Security Scan Report — ${escapeHtml(generatedOn)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #f8f9fc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    color: #171a2b;
  }
  .wrap { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px; }
  a { color: #2a52a0; }
  details > summary { list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
</style>
</head>
<body>
  <div class="wrap">
    <div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(26,48,112,0.10);box-shadow:0 4px 24px rgba(26,48,112,0.08);">
      <div style="height:5px;background:linear-gradient(90deg,#2a52a0,#4a9db5,#00a87a);"></div>
      <div style="padding:32px 36px 8px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#4a9db5;margin-bottom:8px;">QCypher Technologies · Weekly Security Scan</div>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 10px;letter-spacing:-0.01em;">Vulnerability Scan Report</h1>
        <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#5b6072;">
          <span><strong style="color:#171a2b;">Site</strong> &nbsp;${escapeHtml(targetUrl)}</span>
          <span><strong style="color:#171a2b;">Generated</strong> &nbsp;${escapeHtml(generatedOn)}</span>
          <span><strong style="color:#171a2b;">Scanner</strong> &nbsp;OWASP ZAP ${escapeHtml(zapVersion)} (passive baseline)</span>
          ${runUrl ? `<span><a href="${escapeHtml(runUrl)}">View workflow run →</a></span>` : ''}
        </div>
      </div>

      <div style="padding:24px 36px 8px;display:flex;flex-wrap:wrap;gap:12px;">
        ${statCard('Critical', SEVERITY_COUNT.Critical, SEVERITY_COLOR.Critical)}
        ${statCard('High', SEVERITY_COUNT.High, SEVERITY_COLOR.High)}
        ${statCard('Medium', SEVERITY_COUNT.Medium, SEVERITY_COLOR.Medium)}
        ${statCard('Low', SEVERITY_COUNT.Low, SEVERITY_COLOR.Low)}
        ${statCard('Info', SEVERITY_COUNT.Info, SEVERITY_COLOR.Info)}
      </div>

      <div style="padding:16px 36px 8px;display:flex;flex-wrap:wrap;gap:32px;align-items:center;">
        <div style="flex-shrink:0;">
          ${donutChart()}
        </div>
        <div style="flex:1;min-width:280px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:14px;">Findings by instance count</div>
          ${barChart()}
        </div>
      </div>

      ${alerts.length > 0 ? `
      <div style="padding:8px 36px 8px;">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin:24px 0 14px;">Summary</div>
        ${summaryTable()}
      </div>` : ''}

      ${insightsSection()}

      <div style="padding:8px 36px 36px;">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin:24px 0 14px;">All findings</div>
        ${findingsList()}
      </div>

      <div style="background:#f8f9fc;padding:20px 36px;text-align:center;border-top:1px solid rgba(26,48,112,0.08);">
        <p style="margin:0;font-size:12px;color:#5b6072;">Generated automatically by the QCypher weekly security scan &middot; Passive baseline scan, not a full penetration test</p>
      </div>
    </div>
  </div>
</body>
</html>
`

writeFileSync(outPath, html)
console.log(`Wrote ${outPath}`)
