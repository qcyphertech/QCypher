import type { Metadata } from 'next'

// Temporarily kept out of search results while the team section is hidden
// (see SHOW_TEAM in page.tsx). Remove this file and re-add '/about' to
// sitemap.ts when the team comes back.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
