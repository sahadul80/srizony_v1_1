import type { MetadataRoute } from 'next'
import { getCmsMenuIndex } from '@/lib/site'

const base = 'https://srizonyfoundation.org.bd'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getCmsMenuIndex()
  const pages = index.availablePages.filter((page) => page.status !== 'draft' && page.status !== 'archived')
  const entries: MetadataRoute.Sitemap = []
  for (const page of pages) {
    const path = page.slug === '/' ? '' : page.slug
    const modified = page.updatedAt ? new Date(page.updatedAt) : undefined
    entries.push({ url: `${base}${path}`, lastModified: modified, changeFrequency: page.slug === '/' ? 'weekly' : 'monthly', priority: page.slug === '/' ? 1 : page.slug.startsWith('/news') ? 0.8 : 0.6 })
    entries.push({ url: `${base}/bn${path}`, lastModified: modified, changeFrequency: page.slug === '/' ? 'weekly' : 'monthly', priority: page.slug === '/' ? 0.9 : 0.5 })
  }
  return entries
}
