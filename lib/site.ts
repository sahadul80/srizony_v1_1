import { sql } from 'drizzle-orm'
import { revalidatePath, unstable_cache } from 'next/cache'
import { contentData, systemData, donationInfo, SDGsteps } from '@/data/data'
import { db, withDbRetry } from '@/lib/db'
import type { NavGroup, NavItem, PageData } from '@/types/entityType'
import { getPublishedFeed, getPublishedFieldNews } from '@/lib/cms/content'

export type CmsDocumentKey = 'site-global' | `page:${string}` | 'ui'

const aliases: Record<string, string> = {
  '/category/news': '/news', '/category/projects': '/projects', '/notices': '/notice', '/about': '/about-us',
  '/partners': '/partners-networks', '/partners-and-networks': '/partners-networks', '/govorning-body': '/governing-body',
  '/good-govornance': '/good-governance', '/executive-secratariat': '/executive-secretariat',
  '/organizetional-development': '/organizational-development', '/student-looan': '/student-loan',
  '/job-circulars': '/job-circular', '/career': '/job-circular', '/donate-now': '/donate',
}

export function resolvePagePath(path: string) { return aliases[path] ?? (path || '/') }

// During `next build` a production database may not have been seeded yet.
// Keep the build deterministic by using the bundled content only for build-time
// static generation. Runtime requests still require the CMS database unless
// CMS_STATIC_FALLBACK=true is explicitly enabled.
function isProductionBuild() { return process.env.NEXT_PHASE === 'phase-production-build' }

function jsonb(value: unknown) { return sql`${JSON.stringify(value ?? null)}::jsonb` }

async function readDocumentsUncached(keys: string[], publishedOnly = false) {
  const database = db
  if (!database || keys.length === 0 || isProductionBuild()) return new Map<string, unknown>()
  const result = new Map<string, unknown>()
  const globalRequested = keys.includes('site-global')
  const pageSlugs = keys.filter((key) => key.startsWith('page:')).map((key) => key.slice('page:'.length))
  if (globalRequested) {
    const global = await withDbRetry(() => database.execute(sql`SELECT value FROM site_global_state WHERE id = 1 LIMIT 1`))
    if (global.rows[0]) result.set('site-global', (global.rows[0] as Record<string, unknown>).value)
  }
  if (pageSlugs.length) {
    const pages = await withDbRetry(() => database.execute(sql`
      SELECT slug, render_cache, status, sort_order, updated_at
      FROM pages
      WHERE slug IN (${sql.join(pageSlugs.map((slug) => sql`${slug}`), sql`, `)})
        ${publishedOnly ? sql`AND status = 'published'` : sql``}
    `))
    for (const row of pages.rows as Array<Record<string, unknown>>) {
      const status = String(row.status || 'published')
      const meta = {
        status,
        sortOrder: Number(row.sort_order || 0),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
      }
      if (publishedOnly && status !== 'published') {
        result.set(`page:${String(row.slug)}`, { __cmsMeta: meta, __unpublished: true })
        continue
      }
      if (row.render_cache && typeof row.render_cache === 'object') {
        result.set(`page:${String(row.slug)}`, { ...(row.render_cache as Record<string, unknown>), __cmsMeta: meta })
      }
    }
  }
  return result
}

async function readDocuments(keys: string[], publishedOnly = false) {
  return readDocumentsUncached(keys, publishedOnly)
}

async function readPublicDocumentsCached(slug: string) {
  // The homepage reuses the canonical enterprise cards and field-news carousel
  // from their own pages, so load those page snapshots alongside the homepage.
  const keys = [`site-global`, `page:${slug}`]
  if (slug === '/') keys.push('page:/enterprise-development', 'page:/social-development')
  const map = await readDocuments(keys, true)
  return Object.fromEntries(map.entries())
}

const cachedPublicDocuments = unstable_cache(
  async (slug: string) => readPublicDocumentsCached(slug),
  ['srizony-public-site-v3-home-references'],
  { revalidate: 60, tags: ['site-content'] },
)

async function getCmsNavigation(): Promise<{ primaryNav: NavItem[]; navGroups: NavGroup[] }> {
  const database = db
  if (process.env.CMS_STATIC_FALLBACK === 'true' || isProductionBuild()) return { primaryNav: systemData.primaryNav, navGroups: systemData.navGroups }
  if (!database) throw new Error('DATABASE_URL is required to render public navigation. Configure the database and run npm run db:bootstrap.')
  const rows = await withDbRetry(() => database.execute(sql`
    SELECT g.id AS group_id, g.key AS group_key, g.label_en AS group_label_en, g.label_bn AS group_label_bn, g.sort_order AS group_sort_order,
           i.id AS item_id, i.parent_id, i.label_en, i.label_bn, i.href, i.featured, i.sort_order
    FROM nav_groups g
    LEFT JOIN nav_items i ON i.group_id = g.id
    ORDER BY g.sort_order ASC, i.parent_id NULLS FIRST, i.sort_order ASC, i.id ASC
  `))
  type Row = Record<string, unknown>
  const groups = new Map<number, { key: string; label: { en: string; bn: string }; sort: number; items: Row[] }>()
  for (const row of rows.rows as Row[]) {
    const groupId = Number(row.group_id)
    if (!groups.has(groupId)) groups.set(groupId, { key: String(row.group_key), label: { en: String(row.group_label_en), bn: String(row.group_label_bn) }, sort: Number(row.group_sort_order || 0), items: [] })
    if (row.item_id != null) groups.get(groupId)!.items.push(row)
  }
  const buildItems = (items: Row[], parentId: number | null): NavItem[] => items.filter((row) => (row.parent_id == null ? parentId === null : Number(row.parent_id) === parentId)).sort((a,b) => Number(a.sort_order||0)-Number(b.sort_order||0) || Number(a.item_id)-Number(b.item_id)).map((row) => {
    const children = buildItems(items, Number(row.item_id))
    return { label: { en: String(row.label_en), bn: String(row.label_bn) }, href: String(row.href), featured: Boolean(row.featured), children: children.length ? children : undefined }
  })
  const orderedGroups = Array.from(groups.values()).sort((a,b) => a.sort-b.sort)
  const primaryGroup = orderedGroups.find((group) => group.key === 'primary')
  const primaryNav = primaryGroup ? buildItems(primaryGroup.items, null) : []
  const navGroups = orderedGroups.filter((group) => group.key !== 'primary').map((group) => ({ label: group.label, items: buildItems(group.items, null) }))

  // A database menu may have been seeded before the current multi-level
  // hierarchy was introduced. Public runtime navigation must stay database-backed;
  // never substitute the bundled menu when the CMS menu is incomplete.
  const flattenHrefs = (items: NavItem[]): string[] => items.flatMap((item) => [item.href, ...(item.children ? flattenHrefs(item.children) : [])])
  const availableHrefs = new Set([...flattenHrefs(primaryNav), ...navGroups.flatMap((group) => flattenHrefs(group.items))])
  const requiredHrefs = [
    '/', '/projects', '/news', '/notice', '/contact', '/donate',
    '/about-us', '/founders-footprint', '/awards-recognition', '/partners-networks', '/senior-management', '/operational-structure',
    '/at-a-glance', '/impact-on-sdg', '/governing-body', '/good-governance',
    '/social-development', '/health-program', '/education-program', '/human-rights', '/human-resource', '/climate-change', '/agriculture-livelihood',
    '/organizational-development', '/women-business-loan', '/small-enterprise-loan', '/agri-development-loan', '/household-migrant-loan', '/rural-development-loan', '/job-holders-loan', '/student-loan',
    '/enterprise-development', '/enterprise/srizony-hospital', '/enterprise/srizony-university', '/enterprise/srizony-polytechnic', '/enterprise/srizony-printing-press', '/enterprise/srizony-filling-station', '/enterprise/srizony-internet', '/enterprise/srizony-computer-garden', '/enterprise/srizony-motors',
    '/microfinance-program', '/job-circular',
  ]
  const whoWeAreGroup = navGroups.find((group) => group.label.en.trim().toLowerCase() === 'who we are')
  const whatWeDoGroup = navGroups.find((group) => group.label.en.trim().toLowerCase() === 'what we do')
  const hasDirectLink = (items: NavItem[] | undefined, href: string) => Boolean(items?.some((item) => item.href === href))
  const hasNestedLink = (items: NavItem[] | undefined, parentHref: string, childHref: string) =>
    Boolean(items?.find((item) => item.href === parentHref)?.children?.some((child) => child.href === childHref))
  const whoDirectLinks = ['/about-us', '/at-a-glance', '/impact-on-sdg', '/good-governance']
  const whatDirectLinks = ['/social-development', '/organizational-development', '/enterprise-development', '/microfinance-program', '/job-circular']
  const requiredParentChildLinks: Array<[NavItem[] | undefined, string, string]> = [
    ...['/founders-footprint', '/awards-recognition', '/partners-networks', '/senior-management', '/operational-structure', '/governing-body'].map((child) => [whoWeAreGroup?.items, '/about-us', child] as [NavItem[] | undefined, string, string]),
    ...['/health-program', '/education-program', '/human-rights', '/human-resource', '/climate-change', '/agriculture-livelihood'].map((child) => [whatWeDoGroup?.items, '/social-development', child] as [NavItem[] | undefined, string, string]),
    ...['/women-business-loan', '/small-enterprise-loan', '/agri-development-loan', '/household-migrant-loan', '/rural-development-loan', '/job-holders-loan', '/student-loan'].map((child) => [whatWeDoGroup?.items, '/organizational-development', child] as [NavItem[] | undefined, string, string]),
    ...['/enterprise/srizony-hospital', '/enterprise/srizony-university', '/enterprise/srizony-polytechnic', '/enterprise/srizony-printing-press', '/enterprise/srizony-filling-station', '/enterprise/srizony-internet', '/enterprise/srizony-computer-garden', '/enterprise/srizony-motors'].map((child) => [whatWeDoGroup?.items, '/enterprise-development', child] as [NavItem[] | undefined, string, string]),
  ]
  const hasCurrentHierarchy = primaryNav[0]?.href === '/' && Boolean(whoWeAreGroup && whatWeDoGroup)
    && whoDirectLinks.every((href) => hasDirectLink(whoWeAreGroup?.items, href))
    && whatDirectLinks.every((href) => hasDirectLink(whatWeDoGroup?.items, href))
    && requiredParentChildLinks.every(([items, parent, child]) => hasNestedLink(items, parent, child))
  const currentItems = [...primaryNav, ...navGroups.flatMap((group) => group.items)]
  const flattenItems = (items: NavItem[]): NavItem[] => items.flatMap((item) => [item, ...(item.children ? flattenItems(item.children) : [])])
  const itemsByHref = new Map<string, NavItem>(flattenItems(currentItems).map((item) => [item.href, item] as const))
  const requiredLabels: Record<string, string> = {
    '/': 'Home', '/projects': 'Projects', '/news': 'News', '/notice': 'Notices', '/contact': 'Contact', '/donate': 'Donate Now',
    '/about-us': 'About Us', '/founders-footprint': 'Founders Footprint', '/awards-recognition': 'Awards & Recognition',
    '/partners-networks': 'Partners & Networks', '/senior-management': 'Senior Management', '/operational-structure': 'Operational Structure',
    '/at-a-glance': 'At A Glance', '/impact-on-sdg': 'Impact on SDG', '/governing-body': 'Governing Body', '/good-governance': 'Good Governance',
    '/social-development': 'Social Development', '/health-program': 'Health Program', '/education-program': 'Education Program',
    '/human-rights': 'Human Rights', '/human-resource': 'Human Resource', '/climate-change': 'Climate Change', '/agriculture-livelihood': 'Agriculture & Livelihood',
    '/organizational-development': 'Organizational Development', '/women-business-loan': 'Women Business Loans', '/small-enterprise-loan': 'Small Enterprise Loans',
    '/agri-development-loan': 'Agriculture Loans', '/household-migrant-loan': 'Household Migrant Loans', '/rural-development-loan': 'Rural Development Loans',
    '/job-holders-loan': 'Job Holder Loans', '/student-loan': 'Student Loans', '/enterprise-development': 'Enterprise Development',
    '/enterprise/srizony-hospital': 'Srizony Hospital', '/enterprise/srizony-university': 'Srizony University',
    '/enterprise/srizony-polytechnic': 'Srizony Polytechnic', '/enterprise/srizony-printing-press': 'Srizony Printing Press',
    '/enterprise/srizony-filling-station': 'Srizony Filling Station', '/enterprise/srizony-internet': 'Srizony Internet',
    '/enterprise/srizony-computer-garden': 'Srizony Computer Garden', '/enterprise/srizony-motors': 'Srizony Motors',
    '/microfinance-program': 'Micro-finance Program', '/job-circular': 'Career / Job',
  }
  const labelsMatch = Object.entries(requiredLabels).every(([href, label]) => itemsByHref.get(href)?.label.en.trim() === label)
  const groupLabelsMatch = whoWeAreGroup?.label.en.trim() === 'Who We Are' && whatWeDoGroup?.label.en.trim() === 'What We Do'

  if (requiredHrefs.some((href) => !availableHrefs.has(href)) || !hasCurrentHierarchy || !labelsMatch || !groupLabelsMatch) {
    throw new Error('CMS navigation is missing required destinations, labels, or parent-child links. Run npm run db:seed to synchronize the database menu, or correct it in the CMS.')
  }

  if (!primaryNav.length && !navGroups.length) {
    throw new Error('CMS navigation is empty. Run npm run db:seed to populate navigation in PostgreSQL before serving public content.')
  }
  return { primaryNav, navGroups }
}

async function savePage(database: NonNullable<typeof db>, slug: string, value: unknown, actorEmail?: string, expectedUpdatedAt?: string) {
  const data = (value || {}) as Partial<PageData>
  const status = data.status && ['draft', 'published', 'archived'].includes(data.status) ? data.status : 'published'
  const sortOrder = Number.isInteger(data.sortOrder) && Number(data.sortOrder) >= 0 ? Number(data.sortOrder) : 0
  const titleEn = data.title?.en || slug
  const titleBn = data.title?.bn || titleEn
  const subtitleEn = data.subtitle?.en || null
  const subtitleBn = data.subtitle?.bn || null
  const heroTone = data.heroTone || null
  const metaDescriptionEn = data.metaDescription?.en || null
  const metaDescriptionBn = data.metaDescription?.bn || null
  const storedValue = { ...(value as Record<string, unknown>), status, sortOrder }
  if (expectedUpdatedAt) {
    const current = await withDbRetry(() => database.execute(sql`SELECT updated_at FROM pages WHERE slug = ${slug} LIMIT 1`))
    const currentUpdatedAt = current.rows[0] && String((current.rows[0] as Record<string, unknown>).updated_at || '')
    if (!currentUpdatedAt || new Date(currentUpdatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw new Error('CMS_CONFLICT')
  }

  await withDbRetry(() => database.execute(sql`
    WITH existing AS (
      SELECT id, render_cache
      FROM pages
      WHERE slug = ${slug}
      FOR UPDATE
    ), revision AS (
      INSERT INTO page_revisions (page_id, version, content, created_by)
      SELECT existing.id, COALESCE((SELECT MAX(version) FROM page_revisions WHERE page_id = existing.id), 0) + 1, existing.render_cache, ${actorEmail || null}
      FROM existing
      WHERE existing.render_cache IS NOT NULL
    ), upserted AS (
      INSERT INTO pages (
        slug, title_en, title_bn, subtitle_en, subtitle_bn,
        hero_tone, meta_description_en, meta_description_bn,
        render_cache, status, sort_order, updated_at
      ) VALUES (
        ${slug}, ${titleEn}, ${titleBn}, ${subtitleEn}, ${subtitleBn},
        ${heroTone}, ${metaDescriptionEn}, ${metaDescriptionBn},
        ${jsonb(storedValue)}, ${status}, ${sortOrder}, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title_en = EXCLUDED.title_en, title_bn = EXCLUDED.title_bn,
        subtitle_en = EXCLUDED.subtitle_en, subtitle_bn = EXCLUDED.subtitle_bn,
        hero_tone = EXCLUDED.hero_tone, meta_description_en = EXCLUDED.meta_description_en,
        meta_description_bn = EXCLUDED.meta_description_bn, render_cache = EXCLUDED.render_cache,
        status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, updated_at = now()
      RETURNING id
    )
    SELECT id FROM upserted
  `))
}

export async function saveDocument(key: string, value: unknown, type: string, actorEmail?: string, expectedUpdatedAt?: string) {
  const database = db
  if (!database) throw new Error('DATABASE_URL is not configured')
  if (key === 'site-global') {
    if (expectedUpdatedAt) {
      const current = await withDbRetry(() => database.execute(sql`SELECT updated_at FROM site_global_state WHERE id = 1 LIMIT 1`))
      const currentUpdatedAt = current.rows[0] && String((current.rows[0] as Record<string, unknown>).updated_at || '')
      if (!currentUpdatedAt || new Date(currentUpdatedAt).getTime() !== new Date(expectedUpdatedAt).getTime()) throw new Error('CMS_CONFLICT')
    }
    await withDbRetry(() => database.execute(sql`
      INSERT INTO site_global_state (id, value, updated_at) VALUES (1, ${jsonb(value)}, now())
      ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `))
    revalidatePath('/', 'layout')
    return
  }
  if (key.startsWith('page:')) {
    const slug = resolvePagePath(key.slice('page:'.length))
    await savePage(database, slug, value, actorEmail, expectedUpdatedAt)
    revalidatePath(slug === '/' ? '/' : slug)
    revalidatePath(slug === '/' ? '/bn' : `/bn${slug}`)
    return
  }
  throw new Error(`Unsupported CMS document type: ${type}`)
}

export async function syncCmsMenuContent() {
  const database = db
  if (!database) return
  for (const page of Object.values(contentData.allPages)) await savePage(database, page.slug, page)
}

export async function deleteDocument(key: string) {
  const database = db
  if (!database) throw new Error('DATABASE_URL is not configured')
  if (key === 'site-global') {
    await withDbRetry(() => database.execute(sql`DELETE FROM site_global_state WHERE id = 1`))
    return
  }
  if (key.startsWith('page:')) {
    await withDbRetry(() => database.execute(sql`DELETE FROM pages WHERE slug = ${resolvePagePath(key.slice('page:'.length))}`))
    return
  }
  throw new Error('Unsupported CMS document key.')
}

function normalizeGlobal(value: any) { return value && typeof value === 'object' ? value : null }

async function getDatabaseSdgSteps() {
  if (!db) return []
  try {
    const result = await withDbRetry(() => db!.execute(sql`SELECT id, number_value, en, bn, en_text, bn_text FROM sdg_steps ORDER BY sort_order ASC, id ASC`))
    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      n: String(row.number_value ?? row.id),
      en: String(row.en ?? ''),
      bn: String(row.bn ?? row.en ?? ''),
      enText: String(row.en_text ?? ''),
      bnText: String(row.bn_text ?? row.en_text ?? ''),
    }))
  } catch (error) {
    console.error('Could not load SDG content from PostgreSQL', error)
    return []
  }
}

export async function getPublicSiteSnapshot(path = '/') {
  const canonicalSlug = resolvePagePath(path)
  // Public content never silently falls back to data.ts at runtime. Use the bundled
  // catalogue only during the build or when an operator explicitly enables preview mode.
  const useStaticFallback = process.env.CMS_STATIC_FALLBACK === 'true' || isProductionBuild()
  const cachedDocs = useStaticFallback ? {} : await cachedPublicDocuments(canonicalSlug)
  const docs = new Map<string, unknown>(Object.entries(cachedDocs))
  const globalOverride = normalizeGlobal(docs.get('site-global'))
  const rawPageOverride = docs.get(`page:${canonicalSlug}`) as (Partial<PageData> & { __cmsMeta?: { status?: string; sortOrder?: number; updatedAt?: string }; __unpublished?: boolean }) | undefined
  const pageOverride = rawPageOverride ? { ...rawPageOverride } : undefined
  if (pageOverride) { delete pageOverride.__cmsMeta; delete pageOverride.__unpublished }

  const serializableDonationInfo = donationInfo.map(({ icon: _icon, ...item }) => ({ ...item, icon: item.id }))
  const sdgSteps = useStaticFallback ? SDGsteps.map(({ Icon: _Icon, ...step }) => step) : await getDatabaseSdgSteps()
  const override = globalOverride || {}
  const navigation = useStaticFallback ? { primaryNav: systemData.primaryNav, navGroups: systemData.navGroups } : await getCmsNavigation()
  const overrideUi = override.ui && typeof override.ui === 'object' ? override.ui as Record<string, any> : {}
  const themeOverrides = override.themes && typeof override.themes === 'object' ? override.themes as Record<string, unknown> : {}
  const mergedThemes = Object.fromEntries(Object.entries(systemData.themes).map(([name, base]) => [name, { ...base, ...(themeOverrides[name] && typeof themeOverrides[name] === 'object' ? themeOverrides[name] : {}) }]))
  const customThemeEntries = Object.entries(themeOverrides).filter(([name]) => !(name in systemData.themes)).map(([name, value]) => [name, value])
  const global = {
    ...(useStaticFallback ? systemData : { primaryNav: [], navGroups: [], themes: systemData.themes, ui: systemData.ui }), ...override, ...navigation,
    // The seeded PostgreSQL global snapshot is the source of truth for payment options; bundled entries are only a missing-field bootstrap default.
    donationInfo: Array.isArray(override.donationInfo) ? override.donationInfo : Array.isArray(override.paymentInfo) ? override.paymentInfo : serializableDonationInfo,
    SDGsteps: sdgSteps,
    ui: { ...systemData.ui, ...overrideUi, en: { ...systemData.ui.en, ...(overrideUi.en || {}) }, bn: { ...systemData.ui.bn, ...(overrideUi.bn || {}) } },
    themes: { ...mergedThemes, ...Object.fromEntries(customThemeEntries) },
  }
  const fallbackPage = useStaticFallback ? (contentData.allPages[canonicalSlug] ?? null) : null
  if (rawPageOverride?.__unpublished) return { global, page: null, canonicalSlug, notFound: true, updatedAt: rawPageOverride.__cmsMeta?.updatedAt || null }
  let page = pageOverride ? ({ ...fallbackPage, ...pageOverride } as PageData) : fallbackPage

  // Keep the essential home-page story intact when an older CMS page override
  // predates one or more of the current homepage sections. In particular, an
  // empty or absent notice list must never remove the Notice & Circular rail.
  if (canonicalSlug === '/' && page) {
    // Bundled page content is only a build-time preview. At runtime, a published database page is authoritative.
    const bundledHome = useStaticFallback ? contentData.allPages['/'] : null
    const bundledSections = bundledHome?.sections || []
    const currentSections = [...(page.sections || [])]
    type HomeSection = PageData['sections'][number]
    const ensureHomeSection = (
      matches: (section: HomeSection) => boolean,
      isEmpty?: (section: HomeSection) => boolean,
    ) => {
      const fallback = bundledSections.find(matches)
      if (!fallback) return
      const currentIndex = currentSections.findIndex(matches)
      if (currentIndex < 0) currentSections.push(fallback)
      else if (isEmpty?.(currentSections[currentIndex])) currentSections[currentIndex] = fallback
    }
    ensureHomeSection((section) => section.type === 'richText')
    ensureHomeSection((section) => section.type === 'diagram' && section.variant === 'sdg')
    ensureHomeSection((section) => section.type === 'cards' && section.variant === 'impact', (section) => section.type === 'cards' && !(section.items || []).length)

    // Pull the exact card collection and field-news carousel from their published database pages.
    // Bundled page content is considered only in production-build or explicit preview mode.
    const resolveReferencePage = (slug: string): PageData | null => {
      const fallback = useStaticFallback ? (contentData.allPages[slug] ?? null) : null
      const raw = docs.get(`page:${slug}`) as (Partial<PageData> & { __cmsMeta?: unknown; __unpublished?: boolean }) | undefined
      if (!raw || raw.__unpublished) return fallback
      const cleaned = { ...raw }
      delete cleaned.__cmsMeta
      delete cleaned.__unpublished
      return { ...fallback, ...cleaned } as PageData
    }
    const enterprisePage = resolveReferencePage('/enterprise-development')
    const bundledEnterprisePage = useStaticFallback ? contentData.allPages['/enterprise-development'] : null
    const enterpriseFallback = enterprisePage?.sections.find((section) => section.type === 'cards' && (section.heading?.en || '').trim().toLowerCase() === 'srizony enterprises')
      ?? enterprisePage?.sections.find((section) => section.type === 'cards' && section.items.some((item) => item.href?.startsWith('/enterprise/')))
      ?? bundledEnterprisePage?.sections.find((section) => section.type === 'cards')
    if (enterpriseFallback?.type === 'cards') {
      const homeEnterpriseCards = { ...enterpriseFallback, heading: { en: 'Srizony Enterprises', bn: 'সৃজনী উদ্যোগসমূহ' } }
      const enterpriseIndex = currentSections.findIndex((section) => section.type === 'cards' && ((section.heading?.en || '').trim().toLowerCase() === 'srizony enterprises' || (section.variant !== 'impact' && section.items.some((item) => item.href?.startsWith('/enterprise/')))))
      if (enterpriseIndex < 0) currentSections.push(homeEnterpriseCards)
      else currentSections[enterpriseIndex] = homeEnterpriseCards
    }

    const socialPage = resolveReferencePage('/social-development')
    const bundledSocialPage = useStaticFallback ? contentData.allPages['/social-development'] : null
    const newsFallback = socialPage?.sections.find((section) => section.type === 'carousel' && (section.heading?.en || '').trim().toLowerCase() === 'news from the field')
      ?? socialPage?.sections.find((section) => section.type === 'carousel')
      ?? bundledSocialPage?.sections.find((section) => section.type === 'carousel' && (section.heading?.en || '').trim().toLowerCase() === 'news from the field')
      ?? bundledSocialPage?.sections.find((section) => section.type === 'carousel')
    if (newsFallback?.type === 'carousel') {
      const homeFieldNews = {
        ...newsFallback,
        eyebrow: undefined,
        heading: { en: 'News from the Field', bn: 'মাঠপর্যায়ের সংবাদ' },
        body: undefined,
        presentation: 'scroller' as const,
      }
      const newsIndex = currentSections.findIndex((section) => section.type === 'carousel' && (section.heading?.en || '').trim().toLowerCase() === 'news from the field')
      if (newsIndex < 0) currentSections.push(homeFieldNews)
      else currentSections[newsIndex] = homeFieldNews
    }

    page = { ...page, sections: currentSections }
  }

  // Field-news cards are managed as CMS project items. The JSON page snapshot keeps the
  // section layout, while published CMS items supply its live cards at runtime.
  if (!useStaticFallback && page && (canonicalSlug === '/' || canonicalSlug === '/social-development')) {
    const fieldItems = await getPublishedFieldNews(12)
    if (fieldItems.length > 0) {
      page = {
        ...page,
        sections: page.sections.map((section) => {
          const isFieldNews = section.type === 'carousel' && (
            (section.heading?.en || '').trim().toLowerCase() === 'news from the field'
            || canonicalSlug === '/social-development'
          )
          if (!isFieldNews || section.type !== 'carousel') return section
          return {
            ...section,
            eyebrow: undefined,
            heading: { en: 'News from the Field', bn: 'মাঠপর্যায়ের সংবাদ' },
            body: undefined,
            presentation: 'scroller' as const,
            items: fieldItems.map((entry) => ({
              title: entry.title,
              body: entry.summary,
              // Keep cards structurally complete if an editor publishes an item before attaching a photo.
              // This is only a remote stock-image presentation placeholder; all story text remains CMS data.
              image: { src: entry.image || 'https://images.unsplash.com/photo-1766858669684-4e501b3b9f9f?auto=format&fit=crop&w=1600&q=85', alt: entry.title },
              href: entry.href || `/news/${entry.slug}`,
              tag: { en: entry.date, bn: entry.date },
            })),
          }
        }),
      }
    }
  }

  if (canonicalSlug === '/reports' && page && (!page.sections?.some((section) => section.type === 'reports'))) {
    const reportFallback = (fallbackPage?.sections || []).find((section) => section.type === 'reports')
    const legacyCta = page.sections?.find((section) => section.type === 'cta')
    page = reportFallback ? { ...page, sections: legacyCta ? [reportFallback, legacyCta] : [reportFallback] } : page
  }
  if (page && !isProductionBuild() && page.sections?.some((section) => section.type === 'contentFeed')) {
    // Content feeds are filled on the server so components never call an API for their data.
    page = { ...page, sections: await Promise.all(page.sections.map(async (section) => section.type === 'contentFeed' ? { ...section, items: await getPublishedFeed(section.components) } : section)) }
  }
  return { global, page, canonicalSlug, notFound: !page, updatedAt: rawPageOverride?.__cmsMeta?.updatedAt || null }
}

export async function getThemeConfig() {
  const docs = await readDocuments(['site-global'])
  const override = normalizeGlobal(docs.get('site-global'))
  const themeOverrides = override?.themes && typeof override.themes === 'object' ? override.themes as Record<string, unknown> : {}
  const mergedThemes = Object.fromEntries(Object.entries(systemData.themes).map(([name, base]) => [name, { ...base, ...(themeOverrides[name] && typeof themeOverrides[name] === 'object' ? themeOverrides[name] : {}) }]))
  const customThemeEntries = Object.entries(themeOverrides).filter(([name]) => !(name in systemData.themes))
  return { themes: { ...mergedThemes, ...Object.fromEntries(customThemeEntries) } }
}

export function getFallbackGlobal() {
  return { ...systemData, donationInfo: donationInfo.map(({ icon: _icon, ...item }) => ({ ...item, icon: item.id })), SDGsteps: SDGsteps.map(({ Icon: _Icon, ...step }) => step) }
}

async function getAvailableMenus() {
  const navigation = await getCmsNavigation()
  const normalize = (items: NavItem[]): any[] => items.map((item) => ({ label: item.label, href: item.href, children: Array.isArray(item.children) ? normalize(item.children) : undefined }))
  return [{ key: 'primary', label: { en: 'Main Navigation', bn: 'প্রধান নেভিগেশন' }, items: normalize(navigation.primaryNav) }, ...navigation.navGroups.map((group) => ({ key: group.label.en, label: group.label, items: normalize(group.items) }))]
}

export async function getCmsEditorData(slug?: string) {
  if (!slug) {
    const docs = await readDocuments(['site-global'])
    const database = db
    let updatedAt: string | undefined
    if (database) {
      const result = await withDbRetry(() => database.execute(sql`SELECT updated_at FROM site_global_state WHERE id = 1 LIMIT 1`))
      updatedAt = result.rows[0] && String((result.rows[0] as Record<string, unknown>).updated_at || '')
    }
    return { global: normalizeGlobal(docs.get('site-global')) || getFallbackGlobal(), updatedAt }
  }
  const canonicalSlug = resolvePagePath(slug)
  const docs = await readDocuments([`page:${canonicalSlug}`])
  const override = docs.get(`page:${canonicalSlug}`) as Record<string, unknown> | undefined
  const meta = override?.__cmsMeta
  if (override) delete override.__cmsMeta
  return { slug: canonicalSlug, fallback: getFallbackPage(canonicalSlug), override: override || null, meta: meta || null }
}

export async function getCmsMenuIndex() {
  const fallbackPages = Object.values(contentData.allPages)
  const database = db
  if (!database || isProductionBuild()) return { availablePages: fallbackPages.map((page) => ({ slug: page.slug, title: page.title, subtitle: page.subtitle, status: 'published', sortOrder: 0 })), availableMenus: await getAvailableMenus() }
  try {
    const rows = await withDbRetry(() => database.execute(sql`
      SELECT slug, title_en, title_bn, subtitle_en, subtitle_bn, status, updated_at, sort_order
      FROM pages ORDER BY sort_order ASC, slug ASC
    `))
    const availablePages = new Map<string, any>()
    if (process.env.CMS_STATIC_FALLBACK === 'true' || isProductionBuild()) fallbackPages.forEach((page) => availablePages.set(page.slug, { slug: page.slug, title: page.title, subtitle: page.subtitle, status: 'published', sortOrder: 0 }))
    for (const raw of rows.rows as Array<Record<string, unknown>>) {
      const slug = String(raw.slug)
      const fallback = availablePages.get(slug)
      availablePages.set(slug, {
        slug, title: { en: String(raw.title_en || fallback?.title.en || slug), bn: String(raw.title_bn || fallback?.title.bn || '') },
        subtitle: raw.subtitle_en || raw.subtitle_bn ? { en: String(raw.subtitle_en || fallback?.subtitle?.en || ''), bn: String(raw.subtitle_bn || fallback?.subtitle?.bn || '') } : fallback?.subtitle,
        status: String(raw.status || 'published'), sortOrder: Number(raw.sort_order || 0),
        updatedAt: raw.updated_at instanceof Date ? raw.updated_at.toISOString() : String(raw.updated_at || ''),
      })
    }
    return { availablePages: Array.from(availablePages.values()), availableMenus: await getAvailableMenus() }
  } catch (error) {
    console.error('CMS menu index read failed', error)
    throw error instanceof Error ? error : new Error('Unable to read CMS menu index.')
  }
}

export async function getAllCmsContent() {
  const fallbackPages = Object.values(contentData.allPages)
  const fallbackGlobal = getFallbackGlobal()
  const database = db
  if (!database || isProductionBuild()) return {
    global: fallbackGlobal,
    overrides: {},
    availablePages: fallbackPages.map((page) => ({ slug: page.slug, title: page.title, subtitle: page.subtitle, status: 'published', sortOrder: 0 })),
    availableMenus: await getAvailableMenus(),
  }
  try {
    const [globalResult, pageResult] = await Promise.all([
      withDbRetry(() => database.execute(sql`SELECT value FROM site_global_state WHERE id = 1 LIMIT 1`)),
      withDbRetry(() => database.execute(sql`SELECT slug, render_cache, status FROM pages ORDER BY sort_order ASC, slug ASC`)),
    ])
    const overrides = new Map<string, unknown>()
    for (const raw of pageResult.rows as Array<Record<string, unknown>>) {
      if (raw.render_cache && typeof raw.render_cache === 'object') overrides.set(String(raw.slug), raw.render_cache)
    }
    const availablePages = new Map<string, any>()
    const useStaticFallback = process.env.CMS_STATIC_FALLBACK === 'true' || isProductionBuild()
    if (useStaticFallback) fallbackPages.forEach((page) => availablePages.set(page.slug, { slug: page.slug, title: page.title, subtitle: page.subtitle, status: 'published' }))
    for (const raw of pageResult.rows as Array<Record<string, unknown>>) {
      if (String(raw.status || 'published') !== 'published') continue
      const slug = String(raw.slug)
      const page = overrides.get(slug) as any
      if (page && typeof page === 'object') availablePages.set(slug, { slug, title: page.title || { en: slug, bn: slug }, subtitle: page.subtitle, status: raw.status || 'published' })
    }
    const normalizedGlobal = normalizeGlobal((globalResult.rows[0] as Record<string, unknown> | undefined)?.value)
    if (!normalizedGlobal && !useStaticFallback) throw new Error('CMS global state is missing. Run the database seed before serving CMS content.')
    return { global: (normalizedGlobal || fallbackGlobal) as any, overrides: Object.fromEntries(overrides.entries()), availablePages: Array.from(availablePages.values()), availableMenus: await getAvailableMenus() }
  } catch (error) {
    console.error('CMS content read failed', error)
    throw error instanceof Error ? error : new Error('Unable to read CMS content.')
  }
}

export function getFallbackPage(slug: string) { return contentData.allPages[resolvePagePath(slug)] ?? null }
export type PublicSiteGlobal = Awaited<ReturnType<typeof getPublicSiteSnapshot>>['global']
