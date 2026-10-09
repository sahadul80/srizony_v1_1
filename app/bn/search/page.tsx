import type { Metadata } from 'next'
import SiteSearchPage from '../../components/SiteSearchPage'

export const metadata: Metadata = { title: 'সার্চ', robots: { index: true, follow: true } }

export default async function BanglaSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams
  return <SiteSearchPage lang="bn" query={params.q || ''} />
}
