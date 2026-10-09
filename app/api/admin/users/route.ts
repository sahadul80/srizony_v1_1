import { NextResponse } from 'next/server'
import { z } from 'zod'
import { failure, requireAdmin } from '@/lib/cms/guard'
import { createUser, deleteUser, listUsers, updateUser } from '@/lib/cms/users'
import { auditAdminAction } from '@/lib/security'

const role = z.enum(['admin', 'editor', 'analyst'])

export async function GET() {
  const { denied } = await requireAdmin('admin')
  if (denied) return denied
  try { return NextResponse.json({ users: await listUsers() }, { headers: { 'Cache-Control': 'no-store' } }) } catch (e) { return failure(e, 'Unable to load CMS users.') }
}

export async function POST(req: Request) {
  const guard = await requireAdmin('admin')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const body = z.object({ email: z.email().max(254), password: z.string().min(1).max(200), role }).safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Enter a valid email, password and role.' }, { status: 400 })
  try {
    const user = await createUser(body.data, admin.email)
    await auditAdminAction({ actorEmail: admin.email, action: 'user.create', entity: 'cms_user', entityId: user.email, metadata: { role: user.role }, request: req })
    return NextResponse.json({ ok: true, user })
  } catch (e) { return failure(e, 'Unable to create the user.') }
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin('admin')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const body = z.object({ id: z.number().int().positive(), role: role.optional(), status: z.enum(['active', 'disabled']).optional(), password: z.string().max(200).optional() }).safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid user update.' }, { status: 400 })
  try {
    const user = await updateUser(body.data.id, body.data, admin.email)
    await auditAdminAction({ actorEmail: admin.email, action: 'user.update', entity: 'cms_user', entityId: user.email, metadata: { role: user.role, status: user.status, passwordChanged: Boolean(body.data.password) }, request: req })
    return NextResponse.json({ ok: true, user })
  } catch (e) { return failure(e, 'Unable to update the user.') }
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin('admin')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'User id is required.' }, { status: 400 })
  try {
    await deleteUser(id, admin.email)
    await auditAdminAction({ actorEmail: admin.email, action: 'user.delete', entity: 'cms_user', entityId: String(id), request: req })
    return NextResponse.json({ ok: true })
  } catch (e) { return failure(e, 'Unable to delete the user.') }
}
