// Blog excerpts are derived from post HTML that starts with an <h1> title,
// so a naive tag-strip puts the title right back at the front of the
// preview text. Used both when generating a fresh excerpt (extractExcerpt
// in lib/actions/blog.ts) and when rendering already-stored excerpts that
// predate that fix, so both old and new posts display cleanly.
export function stripHtmlTitle(html: string): string {
  return html.replace(/<h1[^>]*>.*?<\/h1>/i, '')
}

export function cleanExcerpt(text: string, title: string): string {
  const t = text.trim()
  const titleTrim = title.trim()
  if (titleTrim && t.toLowerCase().startsWith(titleTrim.toLowerCase())) {
    return t.slice(titleTrim.length).replace(/^[\s\-–—:.]+/, '').trim()
  }
  return t
}
