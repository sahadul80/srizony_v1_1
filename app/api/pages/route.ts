import { NextResponse } from 'next/server'
import { getPublicSiteSnapshot, getAllCmsContent } from '@/lib/site'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') ?? '/'
  if (slug === '*') {
    const content = await getAllCmsContent()
    return NextResponse.json({ pages: content.availablePages, overrides: content.overrides }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  }
  return NextResponse.json(await getPublicSiteSnapshot(slug), { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
