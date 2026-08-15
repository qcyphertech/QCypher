'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat, Pause, Play, X, Pencil } from 'lucide-react'
import { pauseRecurringJob, resumeRecurringJob, cancelRecurringJob, type RecurringJob } from '@/lib/actions/recurring-jobs'
import { CreateRecurringJobModal } from '@/components/contacts/CreateRecurringJobModal'
import { formatTimeLabel } from '@/lib/recurrence'

type CatalogItem = { id: string; name: string; description: string | null; base_price: number }

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually', custom: 'Custom',
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
}

// next_scheduled_date is a plain date (no time) — format in UTC or
// negative-offset timezones (all of the US) display one day early.
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function RecurringJobsSection({
  contactId,
  tenantId,
  businessName,
  catalogItems,
  jobs,
}: {
  contactId: string
  tenantId: string
  businessName: string
  catalogItems: CatalogItem[]
  jobs: RecurringJob[]
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<RecurringJob | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handlePause(id: string) {
    setBusyId(id)
    await pauseRecurringJob(id)
    setBusyId(null)
    router.refresh()
  }
  async function handleResume(id: string) {
    setBusyId(id)
    await resumeRecurringJob(id)
    setBusyId(null)
    router.refresh()
  }
  async function handleCancel(id: string) {
    if (!confirm('Cancel this recurring job? Future appointments will stop being scheduled.')) return
    setBusyId(id)
    await cancelRecurringJob(id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Recurring Jobs</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-accent px-2.5 py-1.5 rounded-lg hover:bg-accent/10"
        >
          <Repeat className="w-3.5 h-3.5" /> Schedule recurring job
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-[14px] text-[hsl(var(--muted-foreground))]">No recurring jobs set up for this contact yet.</p>
      ) : (
        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))] overflow-hidden">
          {jobs.map(job => (
            <div key={job.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">{job.title}</p>
                <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                  {FREQUENCY_LABEL[job.frequency]} · ${Number(job.amount).toFixed(2)} · Next: {fmtDate(job.next_scheduled_date)}{job.scheduled_time ? ` at ${formatTimeLabel(job.scheduled_time)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[13px] px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLE[job.status]}`}>
                  {job.status}
                </span>
                {job.status === 'active' && (
                  <button
                    onClick={() => handlePause(job.id)}
                    disabled={busyId === job.id}
                    title="Pause series"
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
                  >
                    <Pause className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </button>
                )}
                {job.status === 'paused' && (
                  <button
                    onClick={() => handleResume(job.id)}
                    disabled={busyId === job.id}
                    title="Resume series"
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </button>
                )}
                {job.status !== 'cancelled' && (
                  <button
                    onClick={() => setEditingJob(job)}
                    disabled={busyId === job.id}
                    title="Edit series"
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] disabled:opacity-40"
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </button>
                )}
                {job.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancel(job.id)}
                    disabled={busyId === job.id}
                    title="Cancel series"
                    className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateRecurringJobModal
          contactId={contactId}
          tenantId={tenantId}
          businessName={businessName}
          catalogItems={catalogItems}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); router.refresh() }}
        />
      )}

      {editingJob && (
        <CreateRecurringJobModal
          contactId={contactId}
          tenantId={tenantId}
          businessName={businessName}
          catalogItems={catalogItems}
          editJob={editingJob}
          onClose={() => setEditingJob(null)}
          onCreated={() => { setEditingJob(null); router.refresh() }}
        />
      )}
    </div>
  )
}
