import type { MetadataRoute } from 'next'
import { INDUSTRIES } from '@/lib/industries-data'
import { ALTERNATIVES } from '@/lib/alternatives-data'

const BASE_URL = 'https://www.qcyphertech.com'

const STATIC_PAGES = ['', '/faq', '/about', '/security', '/privacy', '/terms', '/customers', '/refer', '/blog']

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = STATIC_PAGES.map(path => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.6,
  }))

  const industryEntries = INDUSTRIES.map(i => ({
    url: `${BASE_URL}/solutions/${i.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const alternativeEntries = ALTERNATIVES.map(a => ({
    url: `${BASE_URL}/alternatives/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticEntries, ...industryEntries, ...alternativeEntries]
}
