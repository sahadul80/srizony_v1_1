import { NextResponse } from 'next/server'
import { getPublicSiteSnapshot } from '@/lib/site'
export async function GET() {
  const site = await getPublicSiteSnapshot('/')
  return NextResponse.json({ media: site.global.media }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
