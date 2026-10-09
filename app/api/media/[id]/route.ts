import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mediaItems } from '@/lib/db/schema'
import { getObjectUrl } from '@/lib/storage'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0 || !db) return new NextResponse('Not found', { status: 404 })

  const [media] = await db.select({ storageKey: mediaItems.storageKey, src: mediaItems.src, contentType: mediaItems.contentType, status: mediaItems.status }).from(mediaItems).where(eq(mediaItems.id, numericId)).limit(1)
  if (!media || media.status !== 'ready') return new NextResponse('Not found', { status: 404 })
  const key = media.storageKey || media.src
  if (!key || /^https?:\/\//i.test(key) || key.startsWith('data:')) return new NextResponse('Not found', { status: 404 })

  try {
    const url = await getObjectUrl(key, 300)
    const response = NextResponse.redirect(url, 307)
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=300')
    if (media.contentType) response.headers.set('Content-Type', media.contentType)
    return response
  } catch {
    return new NextResponse('Media unavailable', { status: 503 })
  }
}
