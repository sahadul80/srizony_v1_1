import type { Metadata } from 'next'
import ContentPage from './components/ContentPage'
import { getPublicSiteSnapshot } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const snapshot = await getPublicSiteSnapshot('/')
  const page = snapshot.page
  if (!page) return {}
  const description = page.metaDescription?.en || page.subtitle?.en
  return { title: page.title.en, description, alternates: { canonical: 'https://srizonyfoundation.org.bd/', languages: { en: 'https://srizonyfoundation.org.bd/', bn: 'https://srizonyfoundation.org.bd/bn' } }, openGraph: { title: page.title.en, description, url: 'https://srizonyfoundation.org.bd/', images: page.heroImage ? [{ url: page.heroImage }] : undefined } }
}

export default function Home() { return <ContentPage slug="/" /> }
