import { NextResponse } from 'next/server'
import { z } from 'zod'
import { failure, requireAdmin } from '@/lib/cms/guard'
import { createMenu, deleteMenu, getNavigationTree, saveNavigationOrder, updateMenu, type MoveNode } from '@/lib/cms/navigation'
import { auditAdminAction } from '@/lib/security'

const fields = { labelEn: z.string().trim().min(1).max(120), labelBn: z.string().trim().max(120).default(''), slug: z.string().trim().max(160).default(''), contentTypes: z.array(z.string()).default([]) }
const createSchema = z.object({ groupKey: z.string().min(1).max(120), parentId: z.number().int().positive().nullable().default(null), ...fields })
const updateSchema = z.object({ id: z.number().int().positive(), ...fields })
const moveNode: z.ZodType<MoveNode> = z.lazy(() => z.object({ id: z.number().int().positive(), children: z.array(moveNode).optional() }))
const orderSchema = z.object({ groupKey: z.string().min(1), tree: z.array(moveNode) })
const noStore = { 'Cache-Control': 'no-store' }

export async function GET() {
  const { denied } = await requireAdmin()
  if (denied) return denied
  try { return NextResponse.json({ groups: await getNavigationTree() }, { headers: noStore }) } catch (e) { return failure(e, 'Unable to load navigation.') }
}

export async function POST(req: Request) {
  const guard = await requireAdmin('admin', 'editor')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const body = createSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Enter a menu name and choose at least one content component.' }, { status: 400 })
  try {
    const result = await createMenu(body.data, admin.email)
    await auditAdminAction({ actorEmail: admin.email, action: 'navigation.create', entity: 'nav_item', entityId: String(result.id), metadata: { slug: result.slug }, request: req })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) { return failure(e, 'Unable to create the menu.') }
}

export async function PUT(req: Request) {
  const guard = await requireAdmin('admin', 'editor')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const body = updateSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid menu details.' }, { status: 400 })
  try {
    await updateMenu(body.data.id, body.data, admin.email)
    await auditAdminAction({ actorEmail: admin.email, action: 'navigation.update', entity: 'nav_item', entityId: String(body.data.id), request: req })
    return NextResponse.json({ ok: true })
  } catch (e) { return failure(e, 'Unable to update the menu.') }
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin('admin', 'editor')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const body = orderSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid navigation order.' }, { status: 400 })
  try {
    await saveNavigationOrder(body.data.groupKey, body.data.tree)
    await auditAdminAction({ actorEmail: admin.email, action: 'navigation.reorder', entity: 'nav_group', entityId: body.data.groupKey, request: req })
    return NextResponse.json({ ok: true })
  } catch (e) { return failure(e, 'Unable to save the navigation order.') }
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin('admin', 'editor')
  if (guard.denied) return guard.denied
  const admin = guard.admin!
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Menu id is required.' }, { status: 400 })
  try {
    const result = await deleteMenu(id)
    await auditAdminAction({ actorEmail: admin.email, action: 'navigation.delete', entity: 'nav_item', entityId: String(id), metadata: result, request: req })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) { return failure(e, 'Unable to remove the menu.') }
}
