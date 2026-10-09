import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { getAdminSession } from '@/lib/adminAuth'
import { db, withDbRetry } from '@/lib/db'
import { formUsers } from '@/lib/db/schema'

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const database = db
  if (!database) return NextResponse.json({ items: [] })

  try {
    const items = await withDbRetry(() => database.select().from(formUsers).orderBy(desc(formUsers.updatedAt)).limit(500))
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load form users.' }, { status: 503 })
  }
}
