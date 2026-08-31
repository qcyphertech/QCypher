import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/', '/auth/', '/portal/', '/q/', '/pay/', '/invoice/', '/recurring/', '/paymentcallback',
          '/dashboard', '/contacts', '/orders', '/calendar', '/overview', '/inventory', '/catalog',
          '/payments', '/templates', '/settings', '/account', '/admin',
        ],
      },
    ],
    sitemap: 'https://www.qcyphertech.com/sitemap.xml',
  }
}
