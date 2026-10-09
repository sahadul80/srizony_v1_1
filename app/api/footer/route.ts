import { NextResponse } from 'next/server'
import { getPublicSiteSnapshot } from '@/lib/site'
export async function GET() {
  const site = await getPublicSiteSnapshot('/')
  const g = site.global
  return NextResponse.json({ primaryNav: g.primaryNav, navGroups: g.navGroups, ui: g.ui, contactInfo: g.contactInfo, logo: g.images.logo }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
