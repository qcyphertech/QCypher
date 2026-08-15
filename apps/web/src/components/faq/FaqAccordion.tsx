'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { FAQ_CATEGORIES } from '@/lib/faq-data'

export function FaqAccordion() {
  const [query, setQuery] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ_CATEGORIES
    return FAQ_CATEGORIES
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length > 0)
  }, [query])

  const totalMatches = filtered.reduce((n, c) => n + c.items.length, 0)

  return (
    <div>
      <div className="faq-search-wrap">
        <div className="faq-search">
          <Search size={18} className="faq-search-icon" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpenKey(null) }}
            placeholder="Search questions — try “cancel”, “billing”, “data”…"
          />
          {query && (
            <button className="faq-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {query && (
        <p className="faq-result-count">
          {totalMatches === 0 ? 'No matches — try a different word.' : `${totalMatches} matching question${totalMatches === 1 ? '' : 's'}`}
        </p>
      )}

      {filtered.map(cat => (
        <div key={cat.id} className="faq-category" id={cat.id}>
          <h2 className="faq-category-title">{cat.label}</h2>
          <div className="faq-list">
            {cat.items.map((item, i) => {
              const key = `${cat.id}-${i}`
              const open = openKey === key || !!query
              return (
                <div key={key} className={`faq-item ${open ? 'faq-item-open' : ''}`}>
                  <button
                    className="faq-question"
                    onClick={() => setOpenKey(openKey === key ? null : key)}
                    aria-expanded={open}
                  >
                    <span>{item.q}</span>
                    <span className="faq-chevron-wrap"><ChevronDown size={15} className="faq-chevron" /></span>
                  </button>
                  {open && <p className="faq-answer">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
