import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authorization = req.headers.get('authorization') || ''
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  if (!db) return NextResponse.json({ ok: false, error: 'Database is not configured.' }, { status: 503 })
  try {
    const result = await db.execute(sql`SELECT prune_srizony_analytics()`)
    await db.execute(sql`DELETE FROM auth_email_challenges WHERE expires_at < now() OR consumed_at < now() - interval '1 day'`)
    await db.execute(sql`DELETE FROM admin_login_attempts WHERE updated_at < now() - interval '30 days'`)
    return NextResponse.json({ ok: true, maintenance: 'completed' })
  } catch (error) {
    console.error('Maintenance failed', error)
    return NextResponse.json({ ok: false, error: 'Maintenance failed.' }, { status: 503 })
  }
}
