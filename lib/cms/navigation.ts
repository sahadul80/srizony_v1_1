import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, withDbRetry } from '@/lib/db'
import { saveDocument } from '@/lib/site'
import type { PageData } from '@/types/entityType'
import { ensureCmsSchema } from './ensureSchema'
import { MENU_COMPONENTS, type ContentComponent } from './components'

type Row = Record<string, any>
export type NavNode = { id: number; labelEn: string; labelBn: string; slug: string; contentTypes: ContentComponent[]; children: NavNode[] }
export type NavGroupTree = { id: number; key: string; labelEn: string; labelBn: string; items: NavNode[] }
export class NavError extends Error { constructor(message: string, public status = 400) { super(message) } }

const MAX_DEPTH = 3
const SLUG = /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/
const RESERVED = /^\/(admin|api|bn|_next|search|unsubscribe)(\/|$)/
const database = () => { if (!db) throw new NavError('DATABASE_URL is not configured', 503); return db }
const run = (q: ReturnType<typeof sql>) => withDbRetry(() => database().execute(q))
const refresh = () => revalidatePath('/', 'layout')

function parseTypes(value: unknown): ContentComponent[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? (() => { try { return JSON.parse(value) } catch { return [] } })() : []
  return (list as unknown[]).filter((v): v is ContentComponent => MENU_COMPONENTS.includes(v as ContentComponent))
}

export function normalizeSlug(input: string) {
  const slug = '/' + input.trim().toLowerCase().replace(/^\/+|\/+$/g, '')
  if (!SLUG.test(slug) || RESERVED.test(slug) || slug.length > 160) throw new NavError('Slug must look like /our-work using lowercase letters, numbers and hyphens, and cannot use a reserved path.')
  return slug
}

function checkTypes(types: unknown) {
  const parsed = parseTypes(types)
  if (!parsed.length) throw new NavError('Select at least one content component (Project, Product / Service or Team).')
  return Array.from(new Set(parsed))
}

export async function getNavigationTree(): Promise<NavGroupTree[]> {
  await ensureCmsSchema()
  const rows = (await run(sql`
    SELECT g.id AS gid, g.key, g.label_en AS g_en, g.label_bn AS g_bn, g.sort_order AS g_sort,
           i.id, i.parent_id, i.label_en, i.label_bn, i.href, i.sort_order, i.content_types
    FROM nav_groups g LEFT JOIN nav_items i ON i.group_id = g.id
    ORDER BY g.sort_order, i.sort_order, i.id`)).rows as Row[]
  const groups = new Map<number, NavGroupTree & { flat: Row[] }>()
  for (const r of rows) {
    const gid = Number(r.gid)
    if (!groups.has(gid)) groups.set(gid, { id: gid, key: r.key, labelEn: r.g_en, labelBn: r.g_bn, items: [], flat: [] })
    if (r.id != null) groups.get(gid)!.flat.push(r)
  }
  const build = (flat: Row[], parent: number | null): NavNode[] => flat
    .filter((r) => (r.parent_id == null ? parent === null : Number(r.parent_id) === parent))
    .map((r) => ({ id: Number(r.id), labelEn: r.label_en, labelBn: r.label_bn, slug: r.href, contentTypes: parseTypes(r.content_types), children: build(flat, Number(r.id)) }))
  return Array.from(groups.values()).map(({ flat, ...g }) => ({ ...g, items: build(flat, null) }))
}

async function assertSlugFree(slug: string, excludeItemId?: number) {
  const nav = await run(sql`SELECT id FROM nav_items WHERE href = ${slug} ${excludeItemId ? sql`AND id <> ${excludeItemId}` : sql``} LIMIT 1`)
  if (nav.rows.length) throw new NavError(`The slug ${slug} is already used by another menu.`, 409)
  const page = await run(sql`SELECT id FROM pages WHERE slug = ${slug} LIMIT 1`)
  if (page.rows.length && !excludeItemId) throw new NavError(`A page already exists at ${slug}.`, 409)
}

function menuPage(slug: string, labelEn: string, labelBn: string, types: ContentComponent[], base?: Partial<PageData>): PageData {
  const sections = (base?.sections || []).filter((s) => (s as { type: string }).type !== 'contentFeed')
  if (types.length) sections.push({ type: 'contentFeed', heading: { en: labelEn, bn: labelBn }, components: types, items: [] } as never)
  return { subtitle: { en: '', bn: '' }, ...base, slug, title: { en: labelEn, bn: labelBn }, sections, status: 'published' } as PageData
}

async function loadPage(slug: string) {
  const r = await run(sql`SELECT render_cache FROM pages WHERE slug = ${slug} LIMIT 1`)
  const cache = (r.rows[0] as Row | undefined)?.render_cache
  return cache && typeof cache === 'object' ? (cache as Partial<PageData>) : undefined
}

export async function createMenu(input: { groupKey: string; parentId: number | null; labelEn: string; labelBn: string; slug: string; contentTypes: unknown }, actor: string) {
  await ensureCmsSchema()
  const labelEn = input.labelEn.trim(); const labelBn = (input.labelBn || '').trim() || labelEn
  if (!labelEn) throw new NavError('Menu name (English) is required.')
  const slug = normalizeSlug(input.slug || labelEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  const types = checkTypes(input.contentTypes)
  await assertSlugFree(slug)
  const group = (await run(sql`SELECT id FROM nav_groups WHERE key = ${input.groupKey} LIMIT 1`)).rows[0] as Row | undefined
  if (!group) throw new NavError('Navigation group not found.', 404)
  if (input.parentId) {
    const p = (await run(sql`WITH RECURSIVE up AS (SELECT id, parent_id, 1 AS depth FROM nav_items WHERE id = ${input.parentId} UNION ALL SELECT n.id, n.parent_id, up.depth + 1 FROM nav_items n JOIN up ON n.id = up.parent_id) SELECT MAX(depth)::int AS depth FROM up`)).rows[0] as Row
    if (!p?.depth) throw new NavError('Parent menu not found.', 404)
    if (Number(p.depth) >= MAX_DEPTH) throw new NavError(`Menus can be nested ${MAX_DEPTH} levels deep at most.`)
  }
  const inserted = (await run(sql`
    INSERT INTO nav_items (group_id, parent_id, label_en, label_bn, href, content_types, sort_order)
    VALUES (${Number(group.id)}, ${input.parentId}, ${labelEn}, ${labelBn}, ${slug}, ${JSON.stringify(types)}::jsonb,
      COALESCE((SELECT MAX(sort_order) + 1 FROM nav_items WHERE group_id = ${Number(group.id)} AND parent_id IS NOT DISTINCT FROM ${input.parentId}), 0))
    RETURNING id`)).rows[0] as Row
  try { await saveDocument(`page:${slug}`, menuPage(slug, labelEn, labelBn, types), 'page', actor) }
  catch (error) { await run(sql`DELETE FROM nav_items WHERE id = ${Number(inserted.id)}`); throw error }
  refresh()
  return { id: Number(inserted.id), slug }
}

export async function updateMenu(id: number, input: { labelEn: string; labelBn: string; slug: string; contentTypes: unknown }, actor: string) {
  await ensureCmsSchema()
  const item = (await run(sql`SELECT * FROM nav_items WHERE id = ${id} LIMIT 1`)).rows[0] as Row | undefined
  if (!item) throw new NavError('Menu not found.', 404)
  const labelEn = input.labelEn.trim(); const labelBn = (input.labelBn || '').trim() || labelEn
  if (!labelEn) throw new NavError('Menu name (English) is required.')
  const slug = normalizeSlug(input.slug)
  const types = checkTypes(input.contentTypes)
  const oldSlug = String(item.href)
  if (slug !== oldSlug) {
    await assertSlugFree(slug, id)
    if ((await run(sql`SELECT id FROM pages WHERE slug = ${slug} LIMIT 1`)).rows.length) throw new NavError(`A page already exists at ${slug}.`, 409)
  }
  const base = await loadPage(oldSlug)
  await run(sql`UPDATE nav_items SET label_en = ${labelEn}, label_bn = ${labelBn}, href = ${slug}, content_types = ${JSON.stringify(types)}::jsonb WHERE id = ${id}`)
  try {
    if (slug !== oldSlug) await run(sql`UPDATE pages SET slug = ${slug}, updated_at = now() WHERE slug = ${oldSlug}`)
    await saveDocument(`page:${slug}`, menuPage(slug, labelEn, labelBn, types, base), 'page', actor)
  } catch (error) {
    await run(sql`UPDATE nav_items SET label_en = ${item.label_en}, label_bn = ${item.label_bn}, href = ${oldSlug}, content_types = ${JSON.stringify(parseTypes(item.content_types))}::jsonb WHERE id = ${id}`)
    if (slug !== oldSlug) await run(sql`UPDATE pages SET slug = ${oldSlug} WHERE slug = ${slug}`)
    throw error
  }
  refresh()
}

/** Removes the menu, its submenus and the pages created for them. */
export async function deleteMenu(id: number) {
  await ensureCmsSchema()
  const removed = (await run(sql`
    WITH RECURSIVE tree AS (SELECT id, href FROM nav_items WHERE id = ${id} UNION ALL SELECT n.id, n.href FROM nav_items n JOIN tree t ON n.parent_id = t.id)
    SELECT id, href FROM tree`)).rows as Row[]
  if (!removed.length) throw new NavError('Menu not found.', 404)
  const ids = sql.join(removed.map((r) => sql`${Number(r.id)}`), sql`, `)
  await run(sql`DELETE FROM nav_items WHERE id IN (${ids})`)
  const slugs = removed.map((r) => String(r.href)).filter((s) => s !== '/')
  let pages = 0
  if (slugs.length) {
    const list = sql.join(slugs.map((s) => sql`${s}`), sql`, `)
    pages = (await run(sql`DELETE FROM pages WHERE slug IN (${list}) AND slug NOT IN (SELECT href FROM nav_items) RETURNING id`)).rows.length
  }
  refresh()
  return { menus: removed.length, pages }
}

export type MoveNode = { id: number; children?: MoveNode[] }

/** Persists the whole drag-and-drop tree of a group (parent/child + order). */
export async function saveNavigationOrder(groupKey: string, tree: MoveNode[]) {
  await ensureCmsSchema()
  const group = (await run(sql`SELECT id FROM nav_groups WHERE key = ${groupKey} LIMIT 1`)).rows[0] as Row | undefined
  if (!group) throw new NavError('Navigation group not found.', 404)
  const existing = new Set(((await run(sql`SELECT id FROM nav_items WHERE group_id = ${Number(group.id)}`)).rows as Row[]).map((r) => Number(r.id)))
  const flat: Array<{ id: number; parent: number | null; order: number }> = []
  const seen = new Set<number>()
  const walk = (nodes: MoveNode[], parent: number | null, depth: number) => {
    if (depth > MAX_DEPTH) throw new NavError(`Menus can be nested ${MAX_DEPTH} levels deep at most.`)
    nodes.forEach((n, order) => {
      const nid = Number(n.id)
      if (!existing.has(nid) || seen.has(nid)) throw new NavError('The navigation changed in another session. Reload and try again.', 409)
      seen.add(nid); flat.push({ id: nid, parent, order }); walk(n.children || [], nid, depth + 1)
    })
  }
  walk(tree, null, 1)
  if (seen.size !== existing.size) throw new NavError('The navigation changed in another session. Reload and try again.', 409)
  if (!flat.length) return
  const values = sql.join(flat.map((f) => sql`(${f.id}::bigint, ${f.parent}::bigint, ${f.order}::int)`), sql`, `)
  await run(sql`UPDATE nav_items n SET parent_id = v.parent_id, sort_order = v.sort_order FROM (VALUES ${values}) AS v(id, parent_id, sort_order) WHERE n.id = v.id`)
  refresh()
}
