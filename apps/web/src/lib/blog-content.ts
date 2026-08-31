// Plain (non-'use server') helpers shared between the super-admin blog
// actions (apps/web/src/lib/actions/blog.ts) and the weekly generation
// cron (apps/web/src/app/api/cron/generate-weekly-blog/route.ts). A
// 'use server' file may only export async functions — a topic-pool
// constant or a sync helper exported from one gets silently replaced with
// undefined wherever it's imported — so anything plain/sync has to live
// here instead.

import { stripHtmlTitle } from '@/lib/blog-excerpt'

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function extractTitle(html: string): string {
  const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  return (m?.[1] ?? 'Untitled').replace(/<[^>]+>/g, '').trim()
}

export function extractExcerpt(html: string): string {
  const text = stripHtmlTitle(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 160)
}

// Covers QCypher's existing customer base (trades) and every expansion
// vertical from the /solutions pages, plus general small-business
// operating topics — the brief was "relevant to all our customers and
// even more customers from all different types of business."
export const QCYPHER_TOPIC_POOL = [
  'How automated review requests actually help a small service business',
  'What a missed-call text-back does and why it matters',
  'The real cost of manual scheduling for a small team',
  'Why small businesses are ditching spreadsheets for a real CRM',
  'What "all-in-one" software actually means for a small business owner',
  'How online booking reduces no-shows for appointment-based businesses',
  'Inventory tracking 101 for small businesses that don\'t have a warehouse',
  'How plumbers can stop losing jobs to missed calls',
  'Why HVAC contractors need seasonal maintenance reminders, not memory',
  'A simple system for electricians to track parts across jobs',
  'How salons and spas can fill more chairs with online booking',
  'Why coaches and consultants lose leads without a fast follow-up system',
  'How small retail shops can avoid running out of stock',
  'What event planners need to track besides just the calendar date',
  'How to write a proposal template you can reuse for every new client',
  'The difference between a CRM and a scheduling app, and why you might need both',
  'How review requests timed right actually get more 5-star reviews',
  'Why "email first, text second" gets better response rates for customer follow-ups',
  'A beginner\'s guide to setting reorder points for retail inventory',
  'What a rental tracking system should actually track',
  'How much time manual invoicing actually costs a small business owner',
  'Why a real website still matters even if you\'re active on social media',
  'Signs it\'s time to switch from spreadsheets to dedicated CRM software',
  'How small businesses can use automation without losing the personal touch',
]

export function qcypherBlogPrompt(topic: string): string {
  return `You are writing for QCypher Technologies' own blog (qcyphertech.com), a company that builds an all-in-one CRM/website/scheduling/inventory platform for small businesses — service trades (plumbers, HVAC, electricians), salons and spas, coaches and consultants, retail shops, and event planners.

Topic: ${topic}

Requirements:
- 600-900 words
- Structure: one <h1> title, an intro, 2-3 <h2> sections, a closing paragraph
- Educational tone, not a sales pitch — mention QCypher by name at most once
- Do not invent statistics, customer names, specific numbers, or feature claims not already implied by the topic
- Do not claim point-of-sale/checkout or Shopify integration — those don't exist in the product
- Output ONLY raw HTML using <h1>, <h2>, <p>, <ul>/<li> — no markdown, no code fences`
}

// Deterministic, stateless weekly rotation — no DB tracking needed to
// avoid repeats. Same topic every week until the whole pool cycles
// (24 topics ≈ 6 months before any repeat at a weekly cadence).
const ROTATION_EPOCH = Date.UTC(2026, 0, 1)
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function pickWeeklyTopic(pool: string[] = QCYPHER_TOPIC_POOL, now: number = Date.now()): string {
  const weekIndex = Math.floor((now - ROTATION_EPOCH) / WEEK_MS)
  const idx = ((weekIndex % pool.length) + pool.length) % pool.length
  return pool[idx]
}
