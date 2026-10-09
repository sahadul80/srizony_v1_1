import { NextResponse } from 'next/server'
import { getPublicSiteSnapshot } from '@/lib/site'
export async function GET() {
  const site = await getPublicSiteSnapshot('/')
  return NextResponse.json({ primaryNav: site.global.primaryNav, navGroups: site.global.navGroups, ui: site.global.ui }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
