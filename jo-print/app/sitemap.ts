import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jo-print.com'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/printing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/printing/upload`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/printing/quote`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/books`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/teachers`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/shops`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/shops/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  return staticRoutes
}
