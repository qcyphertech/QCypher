'use client'

import { TEMPLATE_VARIABLES } from '@/lib/template-interpolate'

/**
 * Click-to-insert row of merge-tag chips, shown above a template body (or
 * subject) textarea/input. Inserts {{key}} at the current cursor position
 * rather than appending to the end, so it's safe to use mid-edit.
 */
export function MergeTagPicker({ targetRef }: {
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>
}) {
  function insert(key: string) {
    const el = targetRef.current
    if (!el) return
    const tag = `{{${key}}}`
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + tag + el.value.slice(end)

    // Native setter, not el.value = — React's controlled-input tracking
    // needs the value change dispatched through its own input event
    // listener to notice a value set outside of onChange, or the state
    // update this triggers would be silently dropped on the next render.
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
    setter.call(el, next)
    el.dispatchEvent(new Event('input', { bubbles: true }))

    el.focus()
    requestAnimationFrame(() => el.setSelectionRange(start + tag.length, start + tag.length))
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map(v => (
        <button
          key={v.key}
          type="button"
          onClick={() => insert(v.key)}
          className="text-[13px] font-semibold px-2.5 py-1 rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}
