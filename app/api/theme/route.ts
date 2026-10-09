import { NextResponse } from 'next/server'
import { getThemeConfig } from '@/lib/site'
export async function GET() {
  const config = await getThemeConfig()
  return NextResponse.json(config, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
