'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ChevronRight, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { parseCsv, CRM_FIELDS, type CsvRow } from '@/lib/csv-parser'
import { checkDuplicates, commitImport, type ParsedContact, type ImportRow } from '@/lib/actions/imports'

type Step = 'upload' | 'map' | 'preview' | 'done'

export function ImportWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [filename, setFilename] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [parsed, setParsed] = useState<ParsedContact[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a .csv file.')
      return
    }
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows } = parseCsv(text)
      setHeaders(h)
      setCsvRows(rows)

      // Auto-map obvious column names
      const auto: Record<string, string> = {}
      h.forEach(col => {
        const lower = col.toLowerCase().replace(/[\s_-]/g, '')
        const match = CRM_FIELDS.find(f => {
          if (f.key === '_skip') return false
          const fKey = f.key.replace(/_/g, '')
          const fLabel = f.label.toLowerCase().replace(/[\s_()-]/g, '')
          return lower === fKey || lower === fLabel ||
            lower.includes(fKey) || fKey.includes(lower)
        })
        auto[col] = match?.key ?? '_skip'
      })
      setMapping(auto)
      setStep('map')
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  async function handlePreview() {
    setLoading(true)
    const rows: ImportRow[] = csvRows.map(row => {
      const out: Record<string, string> = {}
      headers.forEach(h => {
        const field = mapping[h]
        if (field && field !== '_skip') out[field] = row[h] ?? ''
      })
      return out as ImportRow
    })
    const result = await checkDuplicates(rows)
    setParsed(result)
    setStep('preview')
    setLoading(false)
  }

  async function handleCommit() {
    setLoading(true)
    const toImport = parsed.filter(r => r._errors.length === 0)
    const res = await commitImport(filename, toImport)
    setResult({ imported: res.imported, skipped: res.skipped })
    setStep('done')
    setLoading(false)
  }

  const valid = parsed.filter(r => r._errors.length === 0)
  const invalid = parsed.filter(r => r._errors.length > 0)
  const dupes = parsed.filter(r => r._duplicate)

  return (
    <div className="max-w-[52.5rem] mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span style={{
              color: step === s ? 'hsl(var(--foreground))' : undefined,
              fontWeight: step === s ? 600 : undefined,
            }}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <ChevronRight size={14} />}
          </span>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Not sure about the format?</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Download our template — fill it in and upload it below.
              </p>
            </div>
            <a
              href="/contacts-template.csv"
              download="qcypher-contacts-template.csv"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '10px', fontSize: '13px',
                fontWeight: 700, whiteSpace: 'nowrap',
                border: 'none',
                background: '#00a87a',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              ↓ Download template
            </a>
          </div>
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-12 cursor-pointer transition-colors"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <Upload size={32} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <div className="text-center">
              <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                Drop your CSV file here
              </p>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                or click to browse — .csv files only
              </p>
            </div>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        </div>
      )}

      {/* Step: Map columns */}
      {step === 'map' && (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
            <div>
              <p className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Map columns from "{filename}"</p>
              <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {csvRows.length} rows detected. Match each column to a CRM field.
              </p>
            </div>
            <div className="space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="w-40 text-sm truncate font-mono rounded px-2 py-1"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>
                    {h}
                  </span>
                  <ChevronRight size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <select
                    value={mapping[h] ?? '_skip'}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {CRM_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-xl text-sm border"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              Back
            </button>
            <button
              onClick={handlePreview}
              disabled={loading || !Object.values(mapping).some(v => v === 'first_name')}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {loading ? 'Checking...' : 'Preview Import →'}
            </button>
          </div>
          {!Object.values(mapping).some(v => v === 'first_name') && (
            <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>
              Map at least one column to "First Name" to continue.
            </p>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ready to import', value: valid.length, color: 'hsl(var(--badge-green-text))' },
              { label: 'Will be skipped', value: invalid.length, color: 'hsl(var(--destructive))' },
              { label: 'Duplicates found', value: dupes.length, color: 'hsl(var(--badge-lead-text))' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl border p-4 text-center"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Invalid rows */}
          {invalid.length > 0 && (
            <div className="rounded-2xl border p-4 space-y-2"
              style={{ borderColor: 'hsl(var(--destructive))', background: 'hsl(var(--card))' }}>
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                <AlertCircle size={14} /> {invalid.length} rows cannot be imported
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {invalid.map(r => (
                  <p key={r._row} className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Row {r._row}: {r._errors.join(', ')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates */}
          {dupes.length > 0 && (
            <div className="rounded-2xl border p-4 space-y-2"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                {dupes.length} possible duplicates (will still be imported as new contacts)
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {dupes.map(r => (
                  <p key={r._row} className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Row {r._row} — matches existing: {r._duplicate?.first_name} {r._duplicate?.last_name}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {valid.length > 0 && (
            <div className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--muted))' }}>
                      {['First Name', 'Last Name', 'Email', 'Phone', 'Company'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                          style={{ color: 'hsl(var(--muted-foreground))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--foreground))' }}>{r.first_name}</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.last_name ?? '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.email ?? '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.phone ?? '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{r.company ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {valid.length > 10 && (
                <p className="text-xs text-center py-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  + {valid.length - 10} more
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('map')}
              className="px-4 py-2 rounded-xl text-sm border"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              Back
            </button>
            <button
              onClick={handleCommit}
              disabled={loading || valid.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {loading ? 'Importing...' : `Import ${valid.length} contacts`}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="rounded-2xl border p-8 flex flex-col items-center gap-4 text-center"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <CheckCircle2 size={40} style={{ color: 'hsl(var(--badge-green-text))' }} />
          <div>
            <p className="text-xl font-black" style={{ color: 'hsl(var(--foreground))' }}>
              Import complete
            </p>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {result.imported} contacts added
              {result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setFilename(''); setCsvRows([]); setHeaders([]); setParsed([]); setResult(null) }}
              className="px-4 py-2 rounded-xl text-sm border flex items-center gap-2"
              style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
              <RefreshCw size={14} /> Import another
            </button>
            <button
              onClick={() => router.push('/contacts')}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              View contacts →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
