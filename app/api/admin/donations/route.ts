import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { getAdminSession } from '@/lib/adminAuth'
import { db, withDbRetry } from '@/lib/db'
import { donations } from '@/lib/db/schema'
import { ensureDonationsSchema } from '@/lib/db/ensureOperationalSchema'

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const database = db
  if (!database) return NextResponse.json({ items: [] })

  try {
    await ensureDonationsSchema()
    const items = await withDbRetry(() => database.select().from(donations).orderBy(desc(donations.createdAt)).limit(200))
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load donations.' }, { status: 503 })
  }
}
