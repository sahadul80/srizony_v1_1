import { NextResponse } from 'next/server'
import { getNewsFeed } from '@/lib/cms/content'

/** Public news = projects, notices, reports and job posts, newest first. */
export async function GET(req: Request) {
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get('limit')) || 30))
  return NextResponse.json({ items: await getNewsFeed(limit) }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
