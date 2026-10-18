import type { Metadata } from 'next'
import SiteSearchPage from '@/components/pages/SiteSearchPage'

export const metadata: Metadata = { title: 'Search', robots: { index: true, follow: true } }

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams
  return <SiteSearchPage lang="en" query={params.q || ''} />
}
