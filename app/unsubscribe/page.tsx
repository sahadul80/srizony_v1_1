import type { Metadata } from 'next'
import UnsubscribeContent from '@/components/pages/UnsubscribeContent'

export const metadata: Metadata = { title: 'Newsletter preferences', description: 'Manage your Srizony Foundation newsletter subscription.' }

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ status?: string; token?: string }> }) {
  const params = await searchParams
  return <UnsubscribeContent status={params.status || ''} token={params.token} />
}
