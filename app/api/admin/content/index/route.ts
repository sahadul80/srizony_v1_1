import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { getCmsMenuIndex } from '@/lib/site'

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getCmsMenuIndex(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
