import { NextResponse } from 'next/server'
import { getPublicSiteSnapshot } from '@/lib/site'
export async function GET() {
  const site = await getPublicSiteSnapshot('/')
  return NextResponse.json({ page: site.page, hero: site.global.homeHero, global: site.global }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
