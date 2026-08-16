#!/usr/bin/env node
// Renders the single, modern HTML security report from ZAP's own raw JSON
// output — the only report the workflow produces (zap-baseline.py's bundled
// Jinja2 -r report is no longer generated). Reads directly from
// zap-report.json so every field the raw ZAP report shows (per-alert CWE/
// WASC/plugin IDs, confidence, all affected URLs, evidence, references,
// scan insights, ZAP version/site metadata) has a home here too.
// No external libs/CDNs: self-contained inline SVG + an embedded base64
// logo (extracted once from ZAP's own bundled report), safe to open
// locally.
//
// Usage: node render-security-report.mjs <zap-report.json> <out.html> <runUrl>

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const [, , zapReportPath, outPath, runUrl] = process.argv

let zap = null
try {
  zap = JSON.parse(readFileSync(zapReportPath, 'utf8'))
} catch {
  zap = null
}

let ZAP_LOGO_DATA_URI = ''
try {
  ZAP_LOGO_DATA_URI = readFileSync(join(__dirname, 'zap-logo-datauri.txt'), 'utf8').trim()
} catch { /* logo is optional */ }

// Traffic-light severity palette, deliberately high-contrast: Critical and
// High are both red (per explicit design direction — the two most urgent
// tiers should read as the same "stop" signal, not be split across
// red/orange), Medium is yellow, Low is green. FILL is used for solid
// blocks (donut/bar/left-border/dots) where max saturation reads best;
// CHIP is a tinted-background badge (readable text on a soft fill) for
// inline labels, matching the pattern already used in the Admin Console.
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info']
const SEVERITY_FILL = {
  Critical: '#dc2626',
  High: '#dc2626',
  Medium: '#eab308',
  Low: '#22c55e',
  Info: '#8b93a7',
}
const SEVERITY_CHIP = {
  Critical: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  High: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  Medium: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  Low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  Info: { bg: '#eef0f5', text: '#5b6072', border: '#d7dbe4' },
}
const RISKCODE_TO_SEVERITY = { 3: 'High', 2: 'Medium', 1: 'Low', 0: 'Info' }

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function stripP(html) {
  return String(html ?? '').replace(/<\/?p>/g, ' ').trim()
}
function chip(sev, extra = '') {
  const c = SEVERITY_CHIP[sev]
  return `<span style="display:inline-flex;align-items:center;gap:5px;background:${c.bg};color:${c.text};border:1px solid ${c.border};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;padding:3px 9px;border-radius:999px;${extra}">${escapeHtml(sev)}</span>`
}

const site = zap?.site?.[0]
const rawAlerts = site?.alerts ?? []
const targetUrl = site ? `${site['@ssl'] === 'true' ? 'https' : 'http'}://${site['@name'] ?? site['@host']}` : ''
const insights = zap?.insights ?? []

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
// Stable global numbering in the order findings are actually displayed
// (grouped by severity) — the same number is used in the summary table,
// the bar chart tooltip, and the finding card itself, so a reader can
// jump between them without losing their place.
const orderedAlerts = SEVERITY_ORDER.flatMap(sev => alerts.filter(a => a.severity === sev))
orderedAlerts.forEach((a, i) => { a.num = i + 1 })

const SEVERITY_COUNT = Object.fromEntries(SEVERITY_ORDER.map(s => [s, alerts.filter(a => a.severity === s).length]))
const total = alerts.length

function sectionHeader(num, title, subtitle) {
  return `
    <div style="display:flex;align-items:baseline;gap:12px;margin:0 0 16px;">
      <span style="font-size:12px;font-weight:800;color:#4a9db5;letter-spacing:0.06em;">SECTION ${num}</span>
      <span style="flex:1;height:1px;background:rgba(26,48,112,0.12);"></span>
    </div>
    <h2 style="font-size:19px;font-weight:800;margin:0 0 4px;color:#171a2b;">${escapeHtml(title)}</h2>
    ${subtitle ? `<p style="font-size:13px;color:#5b6072;margin:0 0 18px;">${escapeHtml(subtitle)}</p>` : '<div style="margin-bottom:18px;"></div>'}`
}

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
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${SEVERITY_FILL[s]}" stroke-width="${strokeWidth}"
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

// --- Legend for the donut, since color alone shouldn't carry the meaning ---
function severityLegend() {
  return `
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;">
      ${SEVERITY_ORDER.filter(s => s !== 'Info' || SEVERITY_COUNT.Info > 0).map(s => `
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#171a2b;font-weight:600;">
          <span style="width:10px;height:10px;border-radius:3px;background:${SEVERITY_FILL[s]};display:inline-block;"></span>
          ${escapeHtml(s)} <span style="color:#5b6072;font-weight:700;">${SEVERITY_COUNT[s]}</span>
        </div>`).join('')}
    </div>`
}

// --- Bar chart: findings by instance count ---------------------------
function barChart() {
  const rows = [...orderedAlerts].sort((a, b) => b.count - a.count || SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)).slice(0, 8)
  if (rows.length === 0) return `<div style="color:#5b6072;font-size:14px;padding:24px 0;">No findings to chart.</div>`
  const maxCount = Math.max(...rows.map(a => a.count))
  return rows.map(a => {
    const pct = Math.max(6, Math.round((a.count / maxCount) * 100))
    return `
      <a href="#finding-${a.num}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:26px;flex-shrink:0;font-size:12px;color:#5b6072;font-weight:800;text-align:right;">#${a.num}</div>
        <div style="width:200px;flex-shrink:0;font-size:13px;color:#171a2b;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(a.name)}">${escapeHtml(a.name)}</div>
        <div style="flex:1;background:#eef0f5;border-radius:6px;height:20px;position:relative;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${SEVERITY_FILL[a.severity]};border-radius:6px;"></div>
        </div>
        <div style="width:28px;flex-shrink:0;font-size:13px;font-weight:700;color:#171a2b;">${a.count}</div>
      </a>`
  }).join('\n')
}

// --- Quick-jump summary table ---------------------------------------------
function summaryTable() {
  if (orderedAlerts.length === 0) return ''
  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;color:#5b6072;">
          <th style="padding:8px 10px;font-weight:700;width:36px;">#</th>
          <th style="padding:8px 10px;font-weight:700;">Severity</th>
          <th style="padding:8px 10px;font-weight:700;">Finding</th>
          <th style="padding:8px 10px;font-weight:700;text-align:right;">Instances</th>
        </tr>
      </thead>
      <tbody>
        ${orderedAlerts.map(a => `
        <tr style="border-top:1px solid rgba(26,48,112,0.08);">
          <td style="padding:9px 10px;color:#5b6072;font-weight:700;">${a.num}</td>
          <td style="padding:9px 10px;">${chip(a.severity)}</td>
          <td style="padding:9px 10px;"><a href="#finding-${a.num}" style="color:#171a2b;font-weight:600;text-decoration:none;">${escapeHtml(a.name)}</a></td>
          <td style="padding:9px 10px;text-align:right;color:#5b6072;">${a.count}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
}

// --- Insights (ZAP's scan-quality signals) --------------------------------
function insightsSection() {
  if (insights.length === 0) return ''
  const LEVEL_FILL = { High: '#dc2626', Medium: '#eab308', Low: '#22c55e', Info: '#8b93a7', Warning: '#eab308' }
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${insights.map(ins => `
        <div style="display:flex;align-items:center;gap:8px;background:#f8f9fc;border:1px solid rgba(26,48,112,0.10);border-radius:10px;padding:8px 12px;font-size:12px;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LEVEL_FILL[ins.level] ?? '#8b93a7'};flex-shrink:0;"></span>
          <span style="color:#171a2b;">${escapeHtml(ins.description)}</span>
          <span style="color:#5b6072;font-weight:700;">${escapeHtml(ins.statistic)}${/percentage/i.test(ins.description ?? '') ? '%' : ''}</span>
        </div>`).join('')}
    </div>`
}

// --- Findings, numbered, full detail per alert ----------------------------
function instanceRow(inst) {
  return `
    <div style="background:#f8f9fc;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:12px;">
      <div style="word-break:break-all;color:#171a2b;font-weight:600;">${escapeHtml(inst.method)} ${escapeHtml(inst.uri)}</div>
      ${inst.param ? `<div style="color:#5b6072;margin-top:2px;">Parameter: <span style="color:#171a2b;">${escapeHtml(inst.param)}</span></div>` : ''}
      ${inst.evidence ? `<div style="color:#5b6072;margin-top:4px;font-family:ui-monospace,Menlo,monospace;font-size:11px;word-break:break-all;background:#fff;border-radius:6px;padding:6px 8px;border:1px solid rgba(26,48,112,0.08);">${escapeHtml(inst.evidence)}</div>` : ''}
    </div>`
}

function findingCard(a) {
  const refLinks = a.reference.map(r => `<a href="${escapeHtml(r)}" style="color:#2a52a0;word-break:break-all;">${escapeHtml(r)}</a>`).join('<br>')
  const fill = SEVERITY_FILL[a.severity]
  return `
    <div id="finding-${a.num}" style="display:flex;gap:14px;background:#fff;border:1px solid rgba(26,48,112,0.10);border-left:5px solid ${fill};border-radius:0 14px 14px 0;padding:18px 22px;margin-bottom:14px;box-shadow:0 1px 3px rgba(26,48,112,0.06);">
      <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:${fill};color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">${a.num}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:15px;font-weight:700;color:#171a2b;">${escapeHtml(a.name)}</div>
            ${chip(a.severity)}
          </div>
          <div style="font-size:11px;color:#5b6072;font-weight:600;">${a.count} instance${a.count === 1 ? '' : 's'}${a.confidence ? ` &middot; confidence ${escapeHtml(a.confidence)}/3` : ''}</div>
        </div>
        ${a.description ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:8px;">${escapeHtml(a.description)}</div>` : ''}
        ${a.solution ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;"><span style="font-weight:700;color:#15803d;">Remediation: </span>${escapeHtml(a.solution)}</div>` : ''}
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
      </div>
    </div>`
}

function findingsList() {
  if (orderedAlerts.length === 0) {
    return `<div style="text-align:center;padding:48px 24px;color:#5b6072;">
      <div style="font-size:15px;font-weight:700;color:#171a2b;margin-bottom:4px;">No findings on this scan</div>
      <div style="font-size:13px;">Nothing to review — clean pass.</div>
    </div>`
  }
  return SEVERITY_ORDER.filter(s => orderedAlerts.some(a => a.severity === s)).map(sev => {
    const items = orderedAlerts.filter(a => a.severity === sev)
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${SEVERITY_FILL[sev]};"></span>
          <span style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#171a2b;">${sev}</span>
          <span style="font-size:12px;color:#5b6072;font-weight:600;">(${items.length})</span>
        </div>
        ${items.map(findingCard).join('')}
      </div>`
  }).join('\n')
}

function statCard(label, value, sev) {
  const color = value > 0 ? SEVERITY_FILL[sev] : '#171a2b'
  return `
    <div style="flex:1;min-width:110px;background:#fff;border:1px solid rgba(26,48,112,0.10);border-top:3px solid ${value > 0 ? SEVERITY_FILL[sev] : 'rgba(26,48,112,0.10)'};border-radius:14px;padding:16px 18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:6px;">${label}</div>
      <div style="font-size:26px;font-weight:800;color:${color};">${value}</div>
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
  .wrap { max-width: 980px; margin: 0 auto; padding: 40px 24px 64px; }
  a { color: #2a52a0; }
  details > summary { list-style: none; }
  details > summary::-webkit-details-marker { display: none; }
  .section { padding: 32px 36px; border-top: 1px solid rgba(26,48,112,0.08); }
</style>
</head>
<body>
  <div class="wrap">
    <div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(26,48,112,0.10);box-shadow:0 4px 24px rgba(26,48,112,0.08);">
      <div style="height:5px;background:linear-gradient(90deg,#2a52a0,#4a9db5,#00a87a);"></div>

      <div style="padding:32px 36px 8px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        ${ZAP_LOGO_DATA_URI ? `<img src="${ZAP_LOGO_DATA_URI}" alt="ZAP by Checkmarx" style="height:56px;width:auto;flex-shrink:0;" />` : ''}
        <div style="flex:1;min-width:240px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#4a9db5;margin-bottom:6px;">QCypher Technologies · Weekly Security Scan</div>
          <h1 style="font-size:26px;font-weight:800;margin:0;letter-spacing:-0.01em;">Vulnerability Scan Report</h1>
        </div>
      </div>
      <div style="padding:12px 36px 8px;display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:#5b6072;">
        <span><strong style="color:#171a2b;">Site</strong> &nbsp;${escapeHtml(targetUrl)}</span>
        <span><strong style="color:#171a2b;">Generated</strong> &nbsp;${escapeHtml(generatedOn)}</span>
        <span><strong style="color:#171a2b;">Scanner</strong> &nbsp;OWASP ZAP ${escapeHtml(zapVersion)} (passive baseline)</span>
        ${runUrl ? `<span><a href="${escapeHtml(runUrl)}">View workflow run →</a></span>` : ''}
      </div>
      <div style="height:20px;"></div>

      <div class="section">
        ${sectionHeader('01', 'Severity Overview', 'How many findings, and how urgent — at a glance.')}
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          ${statCard('Critical', SEVERITY_COUNT.Critical, 'Critical')}
          ${statCard('High', SEVERITY_COUNT.High, 'High')}
          ${statCard('Medium', SEVERITY_COUNT.Medium, 'Medium')}
          ${statCard('Low', SEVERITY_COUNT.Low, 'Low')}
          ${statCard('Info', SEVERITY_COUNT.Info, 'Info')}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;">
          <div style="flex-shrink:0;">
            ${donutChart()}
            ${severityLegend()}
          </div>
          <div style="flex:1;min-width:280px;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:14px;">Findings by instance count</div>
            ${barChart()}
          </div>
        </div>
      </div>

      ${orderedAlerts.length > 0 ? `
      <div class="section">
        ${sectionHeader('02', 'Summary Table', 'Every finding, numbered — click any row to jump to its full detail.')}
        ${summaryTable()}
      </div>` : ''}

      ${insights.length > 0 ? `
      <div class="section">
        ${sectionHeader('03', 'Scan Insights', "ZAP's own signals about scan coverage and site behavior — not vulnerabilities.")}
        ${insightsSection()}
      </div>` : ''}

      <div class="section">
        ${sectionHeader(insights.length > 0 ? '04' : '03', 'Findings — Full Detail', 'Grouped by severity, numbered to match the summary table above.')}
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
