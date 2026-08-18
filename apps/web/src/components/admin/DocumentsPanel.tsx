'use client'

import { FileText, ExternalLink, Pencil, FolderGit2 } from 'lucide-react'
import { SectionHeader } from '@/components/admin/AdminPanelUI'

const REPO = 'https://github.com/qcyphertech/QCypher'

type DocEntry = { path: string; title: string; description: string }

// Mirrors docs/README.md's table — kept as a static list rather than read
// from the filesystem at request time, since Next.js's serverless output
// on Vercel doesn't guarantee arbitrary repo files outside app/public are
// present in the deployed bundle. Update both places together.
const POLICY_DOCS: DocEntry[] = [
  { path: 'docs/README.md', title: 'Docs Index', description: 'Index of every policy/process doc.' },
  { path: 'docs/gap-assessment.md', title: 'SOC 2 Gap Assessment', description: 'What controls actually exist vs. claimed.' },
  { path: 'docs/INCIDENT_RESPONSE_PLAYBOOK.md', title: 'Incident Response Playbook', description: 'What to do during a real security incident.' },
  { path: 'docs/change-management-policy.md', title: 'Change Management Policy', description: 'How code changes actually ship today.' },
  { path: 'docs/risk-register.md', title: 'Risk Register', description: 'Scored risks with real mitigations.' },
  { path: 'docs/data-classification-policy.md', title: 'Data Classification Policy', description: 'What data exists, who can access it, retention.' },
  { path: 'docs/vendor-risk-assessment.md', title: 'Vendor Risk Assessment', description: 'Every third-party service wired into the app.' },
  { path: 'docs/system-description.md', title: 'System Description', description: 'What QCypher is, architecture, data flow.' },
  { path: 'docs/staff-training.md', title: 'Staff Training', description: 'Onboarding checklist, ongoing practices, MFA recovery.' },
  { path: 'docs/common-criteria-mapping.md', title: 'Common Criteria Mapping', description: 'CC1-9 mapped to real controls.' },
  { path: 'docs/qa-checklist-status.md', title: 'QA Checklist Status', description: 'Item-by-item pre-audit checklist status.' },
  { path: 'docs/typescript-debt-assessment.md', title: 'TypeScript Debt Assessment', description: 'Error count history and root cause.' },
  { path: 'docs/incident-response-tabletop-drill.md', title: 'Incident Response Drill', description: 'Tabletop drill script (full + 10-min express).' },
  { path: 'docs/vendor-soc2-report-tracker.md', title: 'Vendor SOC 2 Report Tracker', description: 'Real request path for every vendor.' },
  { path: 'docs/policy-sign-off.md', title: 'Executive Policy Sign-Off', description: 'Sign-off process and record.' },
  { path: 'docs/auditor-selection.md', title: 'Auditor Selection', description: 'Shortlist, pricing, questions to ask.' },
  { path: 'docs/type1-vs-type2-decision.md', title: 'Type I vs Type II Decision', description: 'Trade-off analysis for which report to pursue.' },
  { path: 'docs/vercel-outage-runbook.md', title: 'Vercel Outage Runbook', description: 'Contingency if Vercel has an extended outage.' },
  { path: 'docs/ai-disclosure-policy.md', title: 'AI Disclosure Policy', description: 'Where AI is used, data handling, and disclosure compliance basis.' },
]

const EVIDENCE_DOCS: DocEntry[] = [
  { path: 'evidence/README.md', title: 'Evidence Repository', description: 'Structure and ground rules for the evidence trail.' },
  { path: 'evidence/policies/README.md', title: 'Evidence: Policies', description: 'Pointer from evidence back to /docs.' },
]

function DocRow({ doc }: { doc: DocEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold truncate">{doc.title}</p>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] truncate">{doc.description}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={`${REPO}/blob/main/${doc.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View
        </a>
        <a
          href={`${REPO}/edit/main/${doc.path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[13px] font-medium px-2.5 py-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </a>
      </div>
    </div>
  )
}

export function DocumentsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Documents</h2>
        <a
          href={`${REPO}/tree/main/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[14px] font-medium bg-accent text-white px-4 py-2 rounded-xl shadow-sm hover:bg-accent-hover transition-colors"
        >
          <FolderGit2 className="w-4 h-4" /> Open /docs on GitHub
        </a>
      </div>
      <p className="text-[14px] text-[hsl(var(--muted-foreground))] -mt-3">
        Every policy, assessment, and evidence doc lives as a real markdown
        file in the repo — <strong>View</strong> opens the rendered file,{' '}
        <strong>Edit</strong> opens GitHub's editor so a change becomes a
        real commit (or a draft PR if you don't have direct push access).
        Nothing here is a separate copy that can drift from what's
        actually in the repo.
      </p>

      <div>
        <SectionHeader icon={FileText} label="Policy & process docs" count={POLICY_DOCS.length} accent />
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          {POLICY_DOCS.map(doc => <DocRow key={doc.path} doc={doc} />)}
        </div>
      </div>

      <div>
        <SectionHeader icon={FolderGit2} label="Evidence repository" count={EVIDENCE_DOCS.length} />
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-soft overflow-hidden">
          {EVIDENCE_DOCS.map(doc => <DocRow key={doc.path} doc={doc} />)}
        </div>
        <a
          href={`${REPO}/tree/main/evidence`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[hsl(var(--muted-foreground))] hover:text-accent mt-2"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Browse the full evidence folder (dated entries per control)
        </a>
      </div>
    </div>
  )
}
