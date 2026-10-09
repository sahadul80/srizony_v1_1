import { contentData } from '../data/data'
import type { PageData } from '../types/entityType'

export const aliases: Record<string, string> = {
  '/category/news':'/news','/category/projects':'/projects','/notices':'/notice','/about':'/about-us',
  '/partners':'/partners-networks','/partners-and-networks':'/partners-networks','/govorning-body':'/governing-body',
  '/good-govornance':'/good-governance','/executive-secratariat':'/executive-secretariat',
  '/organizetional-development':'/organizational-development','/student-looan':'/student-loan',
  '/job-circulars':'/job-circular','/career':'/job-circular','/donate-now':'/donate',
}

export function resolvePagePath(path: string) { return aliases[path] ?? path }
export function getPage(path: string): PageData | null { return contentData.allPages[resolvePagePath(path)] ?? null }
export function getPageDisplay(path: string) {
  const canonicalSlug = resolvePagePath(path)
  const page = contentData.allPages[canonicalSlug] ?? null
  return { page, canonicalSlug, notFound: !page }
}
export function getAllPagePaths() { return Object.keys(contentData.allPages) }
