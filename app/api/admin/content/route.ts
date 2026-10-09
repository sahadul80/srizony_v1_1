import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession, hasAdminRole } from '@/lib/adminAuth'
import { getCmsEditorData, saveDocument } from '@/lib/site'
import { auditAdminAction } from '@/lib/security'

const slugSchema = z.string().regex(/^\/.+/)
const pageSchema = z.object({ scope: z.literal('page'), slug: slugSchema, data: z.record(z.string(), z.unknown()), expectedUpdatedAt: z.string().datetime().optional() })
const globalSchema = z.object({ scope: z.literal('global'), data: z.record(z.string(), z.unknown()), expectedUpdatedAt: z.string().datetime().optional() })

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } }, { status: 401 })
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  const scope = url.searchParams.get('scope')
  if (slug) return NextResponse.json(await getCmsEditorData(slug), { headers: { 'Cache-Control': 'no-store' } })
  if (scope === 'global') {
    const content = await getCmsEditorData()
    return NextResponse.json({ global: content.global || {}, updatedAt: content.updatedAt || undefined }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ ok: false, error: { code: 'INVALID_REQUEST', message: 'Use /api/admin/content/index for the CMS index.' } }, { status: 400 })
}

function containsEmbeddedMedia(value: unknown, key = ''): boolean {
  if (typeof value === 'string') {
    if (value.startsWith('data:') || value.startsWith('blob:')) return true
    const mediaKey = /^(src|image|heroimage|poster|file|hoverSrc|download|attachment)$/i.test(key)
    if (mediaKey && /^https?:\/\//i.test(value)) return true
    return false
  }
  if (Array.isArray(value)) return value.some((item) => containsEmbeddedMedia(item, key))
  if (value && typeof value === 'object') return Object.entries(value).some(([childKey, child]) => containsEmbeddedMedia(child, childKey))
  return false
}

export async function PUT(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } }, { status: 401 })
  if (!hasAdminRole(admin, 'admin', 'editor')) return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Editor permission required.' } }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (containsEmbeddedMedia(body)) {
    return NextResponse.json({ ok: false, error: { code: 'MEDIA_UPLOAD_REQUIRED', message: 'Embedded Base64/blob media is not accepted. Upload files through the CMS media library first.' } }, { status: 400 })
  }

  const pageResult = pageSchema.safeParse(body)
  const globalResult = globalSchema.safeParse(body)
  try {
    if (pageResult.success) {
      await saveDocument(`page:${pageResult.data.slug}`, pageResult.data.data, 'page', admin.email, pageResult.data.expectedUpdatedAt)
      await auditAdminAction({ actorEmail: admin.email, action: 'content.save', entity: 'page', entityId: pageResult.data.slug, request: req })
      return NextResponse.json({ ok: true })
    }
    if (globalResult.success) {
      await saveDocument('site-global', globalResult.data.data, 'global', admin.email, globalResult.data.expectedUpdatedAt)
      await auditAdminAction({ actorEmail: admin.email, action: 'content.save', entity: 'site-global', request: req })
      return NextResponse.json({ ok: true })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'CMS_CONFLICT') return NextResponse.json({ ok: false, error: { code: 'CMS_CONFLICT', message: 'This content changed in another session. Reload the latest version before saving.' } }, { status: 409 })
    console.error('CMS content update failed', error)
    return NextResponse.json({ ok: false, error: { code: 'CMS_WRITE_FAILED', message: error instanceof Error ? error.message : 'Database update failed.' } }, { status: 503 })
  }
  return NextResponse.json({ ok: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid CMS payload.' } }, { status: 400 })
}
