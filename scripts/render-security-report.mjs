#!/usr/bin/env node
// Renders a modern, self-contained HTML security report from the same
// counts.json/findings.json the ZAP workflow already produces via jq.
// Built as our own template (rather than customizing zap-baseline.py's
// bundled Jinja2 report) so we have full design control — brand colors,
// a severity donut, a top-findings bar chart — without depending on
// ZAP's internal templating engine. No external libs/CDNs: this file is
// meant to be downloaded and opened locally, so charts are hand-drawn
// inline SVG computed from the counts.
//
// Usage: node render-security-report.mjs <counts.json> <findings.json> <out.html> <targetUrl> <scanDate> <runUrl>

import { readFileSync, writeFileSync } from 'node:fs'

const [, , countsPath, findingsPath, outPath, targetUrl, scanDate, runUrl] = process.argv

const counts = JSON.parse(readFileSync(countsPath, 'utf8'))
const findings = JSON.parse(readFileSync(findingsPath, 'utf8'))

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info']
const SEVERITY_COLOR = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#0284c7',
  Info: '#8b93a7',
}
const SEVERITY_COUNT = {
  Critical: counts.critical ?? 0,
  High: counts.high ?? 0,
  Medium: counts.medium ?? 0,
  Low: counts.low ?? 0,
  Info: counts.info ?? 0,
}
const total = SEVERITY_ORDER.reduce((sum, s) => sum + SEVERITY_COUNT[s], 0)

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
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

// --- Bar chart: top finding types by occurrence ---------------------------
function barChart() {
  const byType = new Map()
  for (const f of findings) {
    const key = f.vulnerabilityType || 'Unnamed finding'
    const existing = byType.get(key)
    if (!existing || SEVERITY_ORDER.indexOf(f.severity) < SEVERITY_ORDER.indexOf(existing.severity)) {
      byType.set(key, { severity: f.severity, count: (existing?.count ?? 0) + 1 })
    } else {
      existing.count += 1
    }
  }
  const rows = [...byType.entries()]
    .sort((a, b) => b[1].count - a[1].count || SEVERITY_ORDER.indexOf(a[1].severity) - SEVERITY_ORDER.indexOf(b[1].severity))
    .slice(0, 8)

  if (rows.length === 0) {
    return `<div style="color:#5b6072;font-size:14px;padding:24px 0;">No findings to chart.</div>`
  }
  const maxCount = Math.max(...rows.map(([, v]) => v.count))
  return rows.map(([name, v]) => {
    const pct = Math.max(6, Math.round((v.count / maxCount) * 100))
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="width:220px;flex-shrink:0;font-size:13px;color:#171a2b;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div style="flex:1;background:#eef0f5;border-radius:6px;height:20px;position:relative;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${SEVERITY_COLOR[v.severity]};border-radius:6px;"></div>
        </div>
        <div style="width:24px;flex-shrink:0;font-size:13px;font-weight:700;color:#171a2b;">${v.count}</div>
      </div>`
  }).join('\n')
}

// --- Findings list, grouped by severity -----------------------------------
function findingsList() {
  if (findings.length === 0) {
    return `<div style="text-align:center;padding:48px 24px;color:#5b6072;">
      <div style="font-size:15px;font-weight:700;color:#171a2b;margin-bottom:4px;">No findings on this scan</div>
      <div style="font-size:13px;">Nothing to review — clean pass.</div>
    </div>`
  }
  return SEVERITY_ORDER.filter(s => findings.some(f => f.severity === s)).map(sev => {
    const items = findings.filter(f => f.severity === sev)
    const cards = items.map(f => `
      <div style="padding:16px 20px;border-left:3px solid ${SEVERITY_COLOR[sev]};background:#fff;border-radius:0 10px 10px 0;margin-bottom:10px;box-shadow:0 1px 2px rgba(26,48,112,0.06);">
        <div style="font-size:14px;font-weight:700;color:#171a2b;margin-bottom:4px;">${escapeHtml(f.vulnerabilityType || 'Unnamed finding')}</div>
        ${f.affectedUrl ? `<div style="font-size:12px;color:#5b6072;margin-bottom:6px;word-break:break-all;">${escapeHtml(f.affectedUrl)}</div>` : ''}
        ${f.description ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;margin-bottom:6px;">${f.description.replace(/<\/?p>/g, '')}</div>` : ''}
        ${f.remediationAdvice ? `<div style="font-size:13px;color:#3a3f52;line-height:1.6;"><span style="font-weight:700;">Remediation: </span>${f.remediationAdvice.replace(/<\/?p>/g, ' ')}</div>` : ''}
      </div>`).join('\n')
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${SEVERITY_COLOR[sev]};"></span>
          <span style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#171a2b;">${sev}</span>
          <span style="font-size:12px;color:#5b6072;font-weight:600;">(${items.length})</span>
        </div>
        ${cards}
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

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QCypher Security Scan Report — ${escapeHtml(scanDate)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #f8f9fc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    color: #171a2b;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 40px 24px 64px; }
  a { color: #2a52a0; }
</style>
</head>
<body>
  <div class="wrap">
    <div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(26,48,112,0.10);box-shadow:0 4px 24px rgba(26,48,112,0.08);">
      <div style="height:5px;background:linear-gradient(90deg,#2a52a0,#4a9db5,#00a87a);"></div>
      <div style="padding:32px 36px 8px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#4a9db5;margin-bottom:8px;">QCypher Technologies · Weekly Security Scan</div>
        <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;letter-spacing:-0.01em;">Vulnerability Scan Report</h1>
        <div style="font-size:14px;color:#5b6072;">
          <strong style="color:#171a2b;">${escapeHtml(targetUrl)}</strong> &middot; ${escapeHtml(scanDate)} &middot; OWASP ZAP baseline (passive)
          ${runUrl ? ` &middot; <a href="${escapeHtml(runUrl)}">View workflow run</a>` : ''}
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
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#5b6072;margin-bottom:14px;">Top findings by type</div>
          ${barChart()}
        </div>
      </div>

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
