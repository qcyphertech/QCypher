'use client'

import { useState, useTransition } from 'react'
import { ScanSearch } from 'lucide-react'
import { detectAiContent } from '@/lib/actions/ai-detection'

export function AiDetectionPanel() {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<{ confidence: number; reasoning: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function analyze() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const r = await detectAiContent(content)
        if (r.ok) setResult({ confidence: r.confidence, reasoning: r.reasoning })
        else setError(r.error)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  const scoreColor = result
    ? result.confidence >= 70 ? 'text-red-600 dark:text-red-400'
    : result.confidence >= 40 ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400'
    : ''

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">AI Content Detection</h2>
        <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
          Internal spot-check tool — paste text to get a rough AI-likelihood estimate. Not a certified detector, no history is kept.
        </p>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste blog content here (minimum 100 characters)…"
        rows={10}
        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/40"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={pending || content.trim().length < 100}
          className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
        >
          <ScanSearch className="w-4 h-4" />
          {pending ? 'Analyzing…' : 'Analyze'}
        </button>
        <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{content.trim().length} characters</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-[13px] text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className={`text-lg font-bold ${scoreColor}`}>Confidence: {result.confidence}% likely AI-generated</p>
          <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-2">{result.reasoning}</p>
        </div>
      )}
    </div>
  )
}
