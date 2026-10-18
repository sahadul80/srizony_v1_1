import { and, eq, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mediaItems } from '@/lib/db/schema'
import { getObject, getPrivateStorageBucket, getPublicAssetsBucket, getPublicObjectUrl } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeContentType(value: string | null | undefined, key: string) {
  if (value && /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(value)) return value
  const extension = key.toLowerCase().split('.').pop()
  const types: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    avif: 'image/avif', gif: 'image/gif', svg: 'image/svg+xml',
  }
  return extension ? types[extension] || 'application/octet-stream' : 'application/octet-stream'
}

/**
 * Compatibility endpoint for legacy page fields containing uploads-bucket URLs.
 * It never grants access by object key alone: a ready, public image row must match.
 * Once a row has been migrated to `public-assets`, it redirects to the public URL
 * and no longer streams the image through the Next.js server.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params
  const key = Array.isArray(parts) ? parts.join('/') : ''
  if (!db || !key.startsWith('media/') || key.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const [media] = await db.select({
      storageKey: mediaItems.storageKey,
      storageBucket: mediaItems.storageBucket,
      src: mediaItems.src,
      contentType: mediaItems.contentType,
      sizeBytes: mediaItems.sizeBytes,
      status: mediaItems.status,
      isPublic: mediaItems.isPublic,
      kind: mediaItems.kind,
    }).from(mediaItems).where(and(
      or(eq(mediaItems.storageKey, key), eq(mediaItems.src, key)),
      eq(mediaItems.status, 'ready'),
      eq(mediaItems.isPublic, true),
      eq(mediaItems.kind, 'image'),
    )).limit(1)

    if (!media) return new NextResponse('Public image not found', { status: 404 })

    const objectKey = media.storageKey || media.src
    if (!objectKey || /^https?:\/\//i.test(objectKey) || objectKey.startsWith('data:') || objectKey.startsWith('/')) {
      return new NextResponse('Media storage key is invalid', { status: 404 })
    }
    const bucket = media.storageBucket || getPrivateStorageBucket()

    if (bucket === getPublicAssetsBucket()) {
      return NextResponse.redirect(getPublicObjectUrl(objectKey, bucket), {
        status: 307,
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400' },
      })
    }

    const object = await getObject(objectKey, bucket)
    if (!object.Body || object.ContentLength === 0) {
      return new NextResponse('Media object is empty or unavailable', { status: 502 })
    }

    const headers = new Headers({
      'Content-Type': safeContentType(object.ContentType || media.contentType, objectKey),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    })
    const contentLength = object.ContentLength ?? media.sizeBytes
    if (typeof contentLength === 'number' && Number.isFinite(contentLength) && contentLength >= 0) {
      headers.set('Content-Length', String(contentLength))
    }
    if (object.ETag) headers.set('ETag', object.ETag)
    if (object.LastModified) headers.set('Last-Modified', object.LastModified.toUTCString())
    return new Response(object.Body.transformToWebStream(), { status: 200, headers })
  } catch (error) {
    const details = error && typeof error === 'object'
      ? error as { name?: string; $metadata?: { httpStatusCode?: number } }
      : {}
    const code = details.name || 'UnknownStorageError'
    const upstreamStatus = details.$metadata?.httpStatusCode
    console.error('Legacy public media resolution failed', { key, code, upstreamStatus })
    if (code === 'NoSuchKey' || code === 'NotFound' || upstreamStatus === 404) {
      return new NextResponse('Media object not found in configured storage bucket', { status: 404 })
    }
    if (code === 'AccessDenied' || upstreamStatus === 403) {
      return new NextResponse('Server storage credentials cannot read this object. Verify that the credentials belong to this branch and include storage:read.', { status: 502 })
    }
    return new NextResponse('Media storage is unavailable. Check the storage configuration.', { status: 503 })
  }
}
