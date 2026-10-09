import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession, hasAdminRole } from '@/lib/adminAuth'
import { getCmsEditorData, getThemeConfig, saveDocument } from '@/lib/site'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const paletteSchema = z.record(z.string(), hex)

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const config = await getThemeConfig()
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasAdminRole(admin, 'admin')) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const result = z.object({ name: z.string().min(1).max(40), palette: paletteSchema }).safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid palette.' }, { status: 400 })
  const config = await getThemeConfig()
  const current = config.themes as Record<string, any>
  const next = { ...current, [result.data.name]: { ...(current[result.data.name] || current.forest), ...result.data.palette } }
  try {
    const content = await getCmsEditorData()
    await saveDocument('site-global', { ...(content.global || {}), themes: next }, 'global')
    return NextResponse.json({ ok: true, themes: next })
  } catch {
    return NextResponse.json({ error: 'Database update failed.' }, { status: 503 })
  }
}
