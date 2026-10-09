import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, withDbRetry } from '@/lib/db'
import { ensureCmsSchema } from './ensureSchema'
import { COMPONENTS, CORE_KEYS, NEWS_COMPONENTS, SLUG_PATTERN, storageKeys, type ContentComponent, type ContentRecord, type ContentValues, type FeedItem } from './components'

type Row = Record<string, any>
const isoDate = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10))
const database = () => { if (!db) throw new Error('DATABASE_URL is not configured'); return db }

export class ContentError extends Error { constructor(message: string, public status = 400, public field?: string) { super(message) } }

export function isComponent(value: unknown): value is ContentComponent { return typeof value === 'string' && value in COMPONENTS }

function toRecord(row: Row): ContentRecord {
  const attrs = (row.attributes && typeof row.attributes === 'object' ? row.attributes : {}) as Record<string, unknown>
  const values: ContentValues = {
    title_en: row.title_en || '', title_bn: row.title_bn || '', summary_en: row.summary_en || '', summary_bn: row.summary_bn || '',
    body_en: row.body_en || '', body_bn: row.body_bn || '', image: row.image_src || '', date: isoDate(row.published_at),
  }
  for (const [k, v] of Object.entries(attrs)) values[k] = v == null ? '' : String(v)
  return { id: Number(row.id), component: row.component, slug: row.slug, status: row.status, values, publishedAt: isoDate(row.published_at), updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '') }
}

/** Validates form values against the component's field definitions and splits core columns from attributes. */
export function validateValues(component: ContentComponent, slug: string, input: Record<string, unknown>) {
  const def = COMPONENTS[component]
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) throw new ContentError('Slug must use lowercase letters, numbers and single hyphens (e.g. safe-water-project).', 400, 'slug')
  const clean: ContentValues = {}
  for (const field of def.fields) {
    const keys = field.bilingual ? [`${field.key}_en`, `${field.key}_bn`] : [field.key]
    for (const key of keys) {
      const raw = input[key]
      const value = raw == null ? '' : String(raw).trim()
      const label = field.bilingual ? `${field.label} (${key.endsWith('_en') ? 'English' : 'বাংলা'})` : field.label
      if (field.required && !value && (!field.bilingual || key.endsWith('_en'))) throw new ContentError(`${label} is required.`, 400, key)
      if (field.max && value.length > field.max) throw new ContentError(`${label} must be ${field.max} characters or fewer.`, 400, key)
      if (value) {
        if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ContentError(`${label} must be a valid date.`, 400, key)
        if (field.type === 'number' && !/^\d+(\.\d+)?$/.test(value)) throw new ContentError(`${label} must be a number.`, 400, key)
        if (field.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) throw new ContentError(`${label} must be a valid email.`, 400, key)
        if (field.type === 'select' && !field.options?.includes(value)) throw new ContentError(`${label} has an unsupported value.`, 400, key)
        if (['image', 'url'].includes(field.type) && (/^(data|blob|javascript):/i.test(value) || !/^(\/|https:\/\/)/i.test(value))) throw new ContentError(`${label} must start with / or https:// (no embedded media).`, 400, key)
      }
      clean[key] = value
    }
  }
  const attributes: Record<string, string> = {}
  for (const key of storageKeys(def)) if (!CORE_KEYS.includes(key) && clean[key]) attributes[key] = clean[key]
  return { clean, attributes }
}

export async function slugTaken(component: ContentComponent, slug: string, excludeId?: number) {
  await ensureCmsSchema()
  const r = await withDbRetry(() => database().execute(sql`SELECT id FROM cms_content_items WHERE component = ${component} AND slug = ${slug} ${excludeId ? sql`AND id <> ${excludeId}` : sql``} LIMIT 1`))
  return r.rows.length > 0
}

export async function listItems(component?: ContentComponent, q = ''): Promise<ContentRecord[]> {
  await ensureCmsSchema()
  const like = `%${q.trim().toLowerCase()}%`
  const r = await withDbRetry(() => database().execute(sql`
    SELECT * FROM cms_content_items
    WHERE ${component ? sql`component = ${component}` : sql`TRUE`}
      AND (${q.trim() ? sql`lower(title_en || ' ' || title_bn || ' ' || slug) LIKE ${like}` : sql`TRUE`})
    ORDER BY published_at DESC, id DESC LIMIT 1000`))
  return (r.rows as Row[]).map(toRecord)
}

export async function getItem(id: number) {
  await ensureCmsSchema()
  const r = await withDbRetry(() => database().execute(sql`SELECT * FROM cms_content_items WHERE id = ${id} LIMIT 1`))
  return r.rows[0] ? toRecord(r.rows[0] as Row) : null
}

function touch() { revalidatePath('/', 'layout') }

export async function createItem(component: ContentComponent, slug: string, input: Record<string, unknown>) {
  const { clean, attributes } = validateValues(component, slug, input)
  if (await slugTaken(component, slug)) throw new ContentError(`The slug "${slug}" is already used by another ${COMPONENTS[component].label.toLowerCase()}.`, 409, 'slug')
  const r = await withDbRetry(() => database().execute(sql`
    INSERT INTO cms_content_items (component, slug, title_en, title_bn, summary_en, summary_bn, body_en, body_bn, image_src, published_at, attributes)
    VALUES (${component}, ${slug}, ${clean.title_en}, ${clean.title_bn || clean.title_en}, ${clean.summary_en || ''}, ${clean.summary_bn || ''}, ${clean.body_en || ''}, ${clean.body_bn || ''}, ${clean.image || null}, ${clean.date}::date, ${JSON.stringify(attributes)}::jsonb)
    RETURNING *`))
  touch()
  return toRecord(r.rows[0] as Row)
}

export async function updateItem(id: number, slug: string, input: Record<string, unknown>, expectedUpdatedAt?: string) {
  const existing = await getItem(id)
  if (!existing) throw new ContentError('This item no longer exists.', 404)
  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== new Date(existing.updatedAt).getTime()) throw new ContentError('This item changed in another session. Reload it before saving.', 409)
  const { clean, attributes } = validateValues(existing.component, slug, input)
  if (slug !== existing.slug && (await slugTaken(existing.component, slug, id))) throw new ContentError(`The slug "${slug}" is already in use.`, 409, 'slug')
  const preservedSystemAttributes = Object.fromEntries(['fieldNews', 'seedSample'].filter((key) => existing.values[key]).map((key) => [key, existing.values[key]]))
  const mergedAttributes = { ...attributes, ...preservedSystemAttributes }
  const r = await withDbRetry(() => database().execute(sql`
    UPDATE cms_content_items SET slug = ${slug}, title_en = ${clean.title_en}, title_bn = ${clean.title_bn || clean.title_en},
      summary_en = ${clean.summary_en || ''}, summary_bn = ${clean.summary_bn || ''}, body_en = ${clean.body_en || ''}, body_bn = ${clean.body_bn || ''},
      image_src = ${clean.image || null}, published_at = ${clean.date}::date, attributes = ${JSON.stringify(mergedAttributes)}::jsonb, updated_at = now()
    WHERE id = ${id} RETURNING *`))
  touch()
  return toRecord(r.rows[0] as Row)
}

export async function setItemStatus(id: number, status: 'published' | 'draft' | 'hidden') {
  await ensureCmsSchema()
  const r = await withDbRetry(() => database().execute(sql`UPDATE cms_content_items SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING *`))
  if (!r.rows[0]) throw new ContentError('This item no longer exists.', 404)
  touch()
  return toRecord(r.rows[0] as Row)
}

export async function deleteItem(id: number) {
  await ensureCmsSchema()
  const r = await withDbRetry(() => database().execute(sql`DELETE FROM cms_content_items WHERE id = ${id} RETURNING id`))
  if (!r.rows[0]) throw new ContentError('This item no longer exists.', 404)
  touch()
}

const FIELD_NEWS_ENGLISH: Record<string, { title: string; summary: string }> = {
  'community-health-and-nutrition-update': { title: 'Health and Nutrition Update', summary: 'Community health and nutrition are vital to everyday wellbeing. This update shares information about health awareness, nutrition and access to essential care.' },
  'livelihood-and-enterprise-update': { title: 'Livelihood and Enterprise Update', summary: 'Explore updates on livelihood support, small enterprises, practical skills and financial inclusion that can help households strengthen their economic security.' },
  'education-and-skills-update': { title: 'Education and Skills Update', summary: 'This update brings together information about literacy, access to learning, vocational skills and educational opportunities for children, young people and adults.' },
  'community-rights-and-governance-update': { title: 'Rights and Governance Update', summary: 'Read updates on rights awareness, safeguarding, community participation and accountable local services that support safer, more inclusive communities.' },
  'climate-resilience-update': { title: 'Climate Resilience Update', summary: 'This update covers climate adaptation, environmental care, sustainable agriculture, clean energy and disaster preparedness for resilient livelihoods.' },
  'community-partnership-update': { title: 'Community Partnership Update', summary: 'Discover updates about collaboration between community groups, institutions and development partners working toward shared priorities and local initiatives.' },
}
const hasEnglishCopy = (value: unknown) => typeof value === 'string' && /[A-Za-z]{2}/.test(value) && !/[\u0980-\u09FF]{4}/.test(value)

function toFeed(row: Row): FeedItem {
  const rec = toRecord(row)
  const v = rec.values
  const file = v.file || v.link || ''
  const copy = FIELD_NEWS_ENGLISH[rec.slug]
  const englishTitle = hasEnglishCopy(v.title_en) ? v.title_en : copy?.title || 'Srizony Foundation Update'
  const englishSummary = hasEnglishCopy(v.summary_en) ? v.summary_en : copy?.summary || (hasEnglishCopy(v.body_en) ? v.body_en : `Read the latest information about ${englishTitle.toLowerCase()}, programme activities and community updates from Srizony Foundation.`)
  const banglaTitle = v.title_bn || v.title_en || englishTitle
  const banglaSummary = v.summary_bn || v.body_bn || v.summary_en || englishSummary
  return { id: rec.id, component: rec.component, slug: rec.slug, title: { en: englishTitle, bn: banglaTitle }, summary: { en: englishSummary, bn: banglaSummary }, image: v.image || undefined, date: rec.publishedAt, href: file || undefined, deadline: v.deadline || undefined }
}

/** Published items of the given components, newest first. Used by public pages (server side). */
export async function getPublishedFeed(components: ContentComponent[], limit = 60): Promise<FeedItem[]> {
  if (!db || !components.length) return []
  try {
    await ensureCmsSchema()
    const list = sql.join(components.map((c) => sql`${c}`), sql`, `)
    const r = await withDbRetry(() => database().execute(sql`
      SELECT * FROM cms_content_items WHERE status = 'published' AND component IN (${list})
        AND (component <> 'job' OR attributes->>'deadline' IS NULL OR (attributes->>'deadline')::date >= CURRENT_DATE)
      ORDER BY published_at DESC, id DESC LIMIT ${limit}`))
    return (r.rows as Row[]).map(toFeed)
  } catch (error) { console.error('Content feed failed', error); return [] }
}


/** Published CMS project items flagged as field news. These cards are edited from the CMS. */
export async function getPublishedFieldNews(limit = 12): Promise<FeedItem[]> {
  if (!db) return []
  try {
    await ensureCmsSchema()
    const safeLimit = Math.max(2, Math.min(30, Math.trunc(limit) || 12))
    const r = await withDbRetry(() => database().execute(sql`
      SELECT * FROM cms_content_items
      WHERE status = 'published'
        AND component = 'project'
        AND attributes->>'fieldNews' = 'true'
      ORDER BY published_at DESC, sort_order ASC, id DESC
      LIMIT ${safeLimit}
    `))
    return (r.rows as Row[]).map(toFeed)
  } catch (error) {
    console.error('CMS field-news feed failed', error)
    return []
  }
}

/** News = projects + notices + reports + job posts, sorted by date. */
export const getNewsFeed = (limit = 60) => getPublishedFeed(NEWS_COMPONENTS, limit)
