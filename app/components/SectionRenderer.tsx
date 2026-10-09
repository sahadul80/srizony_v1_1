'use client'
import Link from 'next/link'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  X,
} from 'lucide-react'
import type { Lang, MediaItem, Section, UIContent } from '../../types/entityType'
import React from 'react'
import { useSite } from './SiteProvider'
import { MediaImage, VideoBlock, LinkedMedia } from './Media'
import Diagram from './Diagram'
import SDGContribution from './SDGContribution'
import JourneyTimeline from './JourneyTimeline'
import DonationForm from './DonationForm'
import { localizeDigits } from '../../lib/utils'
import { fallbackCardImage } from '../../data/landingImages'
import ContentCard from './ContentCard'
import QueryForm from './QueryForm'
import s from '../css_extra/SectionRenderer.module.css'

type Bi = { en: string; bn: string }

const tx = (lang: Lang, v: Bi) => localizeDigits(v[lang], lang)
const cx = (...c: Array<string | false | undefined | null>) => c.filter(Boolean).join(' ')
const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href)
const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Section wrapper: fades/slides in the first time it scrolls into view. */
function Sec({
  className,
  children,
  flush,
}: {
  className?: string
  children: React.ReactNode
  flush?: boolean
}) {
  const ref = React.useRef<HTMLElement>(null)
  const [state, setState] = React.useState<'init' | 'hidden' | 'shown'>('init')

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // already on screen (or motion not wanted): leave it alone, no flash
    if (reduce || el.getBoundingClientRect().top < window.innerHeight * 0.92 || !('IntersectionObserver' in window)) {
      setState('shown')
      return
    }
    setState('hidden')
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className={cx(s.sec, flush && s.flush, className)} data-r={state === 'init' ? undefined : state}>
      {children}
    </section>
  )
}

function Head({
  eyebrow,
  heading,
  body,
  lang,
  as: Tag = 'h2',
  compact,
}: {
  eyebrow?: Bi
  heading?: Bi
  body?: Bi
  lang: Lang
  as?: 'h2' | 'h3'
  compact?: boolean
}) {
  if (!eyebrow && !heading && !body) return null
  return (
    <header className={cx(s.head, compact && s.headCompact)}>
      {eyebrow && <span className={s.eyebrow}>{tx(lang, eyebrow)}</span>}
      {heading && <Tag className={s.h2}>{tx(lang, heading)}</Tag>}
      {body && <p className={s.lede}>{tx(lang, body)}</p>}
    </header>
  )
}

function ActionLink({ href, label, className = 'btn primary' }: { href: string; label: string; className?: string }) {
  const external = isExternal(href)
  const web = href.startsWith('http')
  const props = { className, target: web ? '_blank' : undefined, rel: web ? 'noreferrer' : undefined }
  return external ? (
    <a href={href} {...props}>
      {label}
      <ArrowRight size={16} />
    </a>
  ) : (
    <Link href={href} {...props}>
      {label}
      <ArrowRight size={16} />
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Collection (projects / news) with search + category chips           */
/* ------------------------------------------------------------------ */

type CollectionItem = {
  title: Bi
  body?: Bi
  image?: MediaItem
  href?: string
  tag?: Bi
}

type RawRecord = Record<string, unknown>

function readLocalized(value: unknown, lang: Lang): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(part => readLocalized(part, lang)).filter(Boolean).join(' ').trim()
  if (!value || typeof value !== 'object') return ''
  const record = value as RawRecord
  const preferred = record[lang]
  const fallback = record.en || record.bn
  return (typeof preferred === 'string' && preferred.trim() ? preferred : typeof fallback === 'string' ? fallback : '').trim()
}

function readBilingual(value: unknown, fallbackEn?: unknown, fallbackBn?: unknown): Bi {
  if (Array.isArray(value)) {
    const result = { en: readLocalized(value, 'en'), bn: readLocalized(value, 'bn') }
    return { en: result.en || readLocalized(fallbackEn, 'en') || readLocalized(fallbackBn, 'bn'), bn: result.bn || readLocalized(fallbackBn, 'bn') || readLocalized(fallbackEn, 'en') }
  }
  const record = value && typeof value === 'object' ? value as RawRecord : {}
  const plain = typeof value === 'string' ? value : ''
  const en = readLocalized(record.en, 'en') || readLocalized(fallbackEn, 'en') || readLocalized(record.bn, 'bn') || readLocalized(fallbackBn, 'bn') || plain.trim()
  const bn = readLocalized(record.bn, 'bn') || readLocalized(fallbackBn, 'bn') || readLocalized(record.en, 'en') || readLocalized(fallbackEn, 'en') || plain.trim()
  return { en, bn }
}

function readMedia(value: unknown, title: Bi): MediaItem | undefined {
  if (typeof value === 'string' && value.trim()) return { src: value.trim(), alt: title, kind: 'image' }
  if (!value || typeof value !== 'object') return undefined
  const raw = value as RawRecord
  const srcValue = raw.src ?? raw.url ?? raw.source ?? raw.path ?? raw.imageUrl ?? raw.image_url ?? raw.imageSrc ?? raw.image_src
  if (typeof srcValue !== 'string' || !srcValue.trim()) return undefined
  const altValue = raw.alt ?? raw.altText ?? raw.alt_text
  const alt = typeof altValue === 'string'
    ? { en: altValue || title.en, bn: altValue || title.bn }
    : readBilingual(altValue, title.en, title.bn)
  const captionValue = raw.caption ?? raw.caption_en ?? raw.caption_bn
  const caption = captionValue ? readBilingual(captionValue, raw.caption_en, raw.caption_bn) : undefined
  const hoverSrc = typeof raw.hoverSrc === 'string' ? raw.hoverSrc : typeof raw.hover_src === 'string' ? raw.hover_src : undefined
  return { src: srcValue.trim(), alt, caption, hoverSrc, kind: 'image' }
}

function MediaCard({ item, lang, readMore }: { item: CollectionItem; lang: Lang; readMore: string }) {
  const raw = item as unknown as RawRecord
  const title = readBilingual(raw.title, raw.title_en ?? raw.titleEn, raw.title_bn ?? raw.titleBn)
  title.en = title.en || title.bn
  title.bn = title.bn || title.en
  if (!title.en && !title.bn) return null
  const href = typeof raw.href === 'string' ? raw.href : typeof raw.url === 'string' ? raw.url : undefined
  const body = [
    readBilingual(raw.body, raw.body_en, raw.body_bn),
    readBilingual(raw.summary, raw.summary_en, raw.summary_bn),
    readBilingual(raw.excerpt, raw.excerpt_en, raw.excerpt_bn),
    readBilingual(raw.description, raw.description_en, raw.description_bn),
  ].find(candidate => candidate.en || candidate.bn) || { en: '', bn: '' }
  body.en = body.en || body.bn
  body.bn = body.bn || body.en
  const bodyText = readLocalized(body, lang)
  const tagFromFields = readBilingual(raw.tag, raw.tag_en, raw.tag_bn)
  const category = readBilingual(raw.category)
  const tag = { en: tagFromFields.en || category.en, bn: tagFromFields.bn || category.bn }
  const imageCandidates = [raw.image, raw.media, raw.photo, raw.coverImage, raw.cover_image, raw.imageSrc, raw.image_src, raw.image_url, raw.imageUrl]
  const image = imageCandidates.map(candidate => readMedia(candidate, title)).find((candidate): candidate is MediaItem => Boolean(candidate))
    || { src: fallbackCardImage(title, href), alt: title, kind: 'image' as const }
  const inner = (
    <>
      <div className={s.cardMedia}>
        <MediaImage item={image} />
        {(tag.en || tag.bn) && <span className={s.cardTag}>{tx(lang, tag)}</span>}
      </div>
      <div className={s.cardBody}>
        <h3>{tx(lang, title)}</h3>
        {bodyText && <p>{bodyText}</p>}
        {href && (
          <span className={s.more}>
            {readMore}
            <ArrowRight size={16} />
          </span>
        )}
      </div>
    </>
  )
  return href ? (
    <Link href={href} className={cx(s.card, s.cardLink)}>{inner}</Link>
  ) : (
    <article className={s.card}>{inner}</article>
  )
}

const LABELS: Record<string, Bi> = {
  all: { en: 'All', bn: 'সব' },
  health: { en: 'Health', bn: 'স্বাস্থ্য' },
  education: { en: 'Education', bn: 'শিক্ষা' },
  livelihood: { en: 'Livelihood', bn: 'জীবিকা' },
  climate: { en: 'Climate', bn: 'জলবায়ু' },
  rights: { en: 'Rights', bn: 'অধিকার' },
  enterprise: { en: 'Enterprise', bn: 'এন্টারপ্রাইজ' },
}

const TERMS: Record<string, string[]> = {
  health: ['health', 'hospital', 'nutrition'],
  education: ['education', 'literacy', 'skills', 'learning'],
  livelihood: ['livelihood', 'agri', 'agriculture', 'enterprise', 'micro finance', 'remittance', 'housing'],
  climate: ['climate', 'solar', 'cook stove', 'afforestation', 'disaster', 'water', 'sanitation'],
  rights: ['rights', 'governance', 'children', 'disability'],
  enterprise: ['enterprise', 'printing', 'development center', 'remittance', 'micro finance'],
}

function CollectionFilters({
  items,
  lang,
  kind,
  heading,
  ui,
}: {
  items: CollectionItem[]
  lang: Lang
  kind: 'projects' | 'news'
  heading: Bi
  ui: UIContent
}) {
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const readMore = ui[lang]?.readMore || (lang === 'en' ? 'Read More' : 'আরও পড়ুন')
  const categories = kind === 'news' ? ['all', '2026', '2025', '2024'] : ['all', 'health', 'education', 'livelihood', 'climate', 'rights', 'enterprise']
  const label = (v: string) => (LABELS[v] ? LABELS[v][lang] : localizeDigits(v, lang))

  const filtered = items.filter((item) => {
    const hay = `${item.title.en} ${item.title.bn} ${item.body?.en || ''} ${item.body?.bn || ''} ${item.tag?.en || ''}`.toLowerCase()
    if (query.trim() && !hay.includes(query.trim().toLowerCase())) return false
    if (filter === 'all') return true
    if (kind === 'news') return (item.tag?.en || '').startsWith(filter)
    return (TERMS[filter] || []).some((x) => hay.includes(x))
  })

  const noun = kind === 'news' ? (lang === 'en' ? 'news' : 'সংবাদ') : lang === 'en' ? 'projects' : 'প্রকল্প'

  return (
    <>
      <div className={s.toolbar}>
        <div className={s.toolbarTop}>
          <h2 className={s.toolbarTitle}>{tx(lang, heading)}</h2>
          <span className={s.count} aria-live="polite">
            {localizeDigits(String(filtered.length), lang)} / {localizeDigits(String(items.length), lang)}
          </span>
        </div>

        <label className={s.search}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'en' ? `Search ${noun}…` : `${noun} খুঁজুন…`}
            aria-label={lang === 'en' ? `Search ${noun}` : `${noun} খুঁজুন`}
          />
          {query && (
            <button type="button" className={s.clear} onClick={() => setQuery('')} aria-label={lang === 'en' ? 'Clear search' : 'মুছুন'}>
              <X size={14} />
            </button>
          )}
        </label>

        <div className={s.chips} role="group" aria-label={lang === 'en' ? 'Filter by category' : 'বিভাগ অনুযায়ী ফিল্টার'}>
          {categories.map((c) => (
            <button key={c} type="button" className={cx(s.chip, filter === c && s.chipOn)} aria-pressed={filter === c} onClick={() => setFilter(c)}>
              {label(c)}
            </button>
          ))}
        </div>
      </div>

      <div className={s.collectionGrid}>
        {filtered.map((item, i) => (
          <MediaCard key={`${item.title.en}-${i}`} item={item} lang={lang} readMore={readMore} />
        ))}
      </div>

      {!filtered.length && <div className={s.empty}>{lang === 'en' ? 'No matching results found.' : 'কোনো মিল পাওয়া যায়নি।'}</div>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Horizontal scroller with prev/next                                  */
/* ------------------------------------------------------------------ */

function ScrollRow({ children, lang, autoplay = false }: { children: React.ReactNode; lang: Lang; autoplay?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [edge, setEdge] = React.useState({ start: true, end: false })
  const [paused, setPaused] = React.useState(false)
  const [reduce, setReduce] = React.useState(false)

  const update = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  React.useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    update()
    const el = ref.current
    if (!el || !('ResizeObserver' in window)) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update])

  React.useEffect(() => {
    const el = ref.current
    if (!el || !autoplay || paused || reduce) return
    const id = window.setInterval(() => {
      const row = ref.current
      if (!row || row.children.length < 2) return
      const first = row.children[0] as HTMLElement
      const styles = window.getComputedStyle(row)
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
      const step = first.getBoundingClientRect().width + gap
      const maxScroll = row.scrollWidth - row.clientWidth
      if (maxScroll <= 4) return
      const atEnd = row.scrollLeft >= maxScroll - 8
      row.scrollTo({ left: atEnd ? 0 : Math.min(row.scrollLeft + step, maxScroll), behavior: 'smooth' })
    }, 4000)
    return () => window.clearInterval(id)
  }, [autoplay, paused, reduce, children])

  const by = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <div className={s.scrollWrap}>
      <div className={s.scrollNav}>
        <button type="button" onClick={() => by(-1)} disabled={edge.start} aria-label={lang === 'en' ? 'Previous' : 'পূর্ববর্তী'}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" onClick={() => by(1)} disabled={edge.end} aria-label={lang === 'en' ? 'Next' : 'পরবর্তী'}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        ref={ref}
        className={s.scroller}
        onScroll={update}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false) }}
      >
        {children}
      </div>
    </div>
  )
}


function NoticeScroller({
  items,
  lang,
  autoplay = false,
}: {
  items: Array<{ date: string; title: Bi; body?: Bi; href?: string }>
  lang: Lang
  autoplay?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [reduce, setReduce] = React.useState(false)

  React.useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  React.useEffect(() => {
    const el = ref.current
    if (!el || !autoplay || reduce || items.length < 2) return
    const id = window.setInterval(() => {
      const cards = Array.from(el.children) as HTMLElement[]
      if (cards.length < 2) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 4) return
      const atEnd = el.scrollLeft >= maxScroll - 8
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
        return
      }
      const step = Math.max(280, el.clientWidth * 0.78)
      el.scrollTo({ left: Math.min(el.scrollLeft + step, maxScroll), behavior: 'smooth' })
    }, 4000)
    return () => window.clearInterval(id)
  }, [autoplay, reduce, items.length])

  return (
    <div className={s.noticeScrollerWrap}>
      <div className={s.noticeScroller} ref={ref}>
        {items.map((item, i) => (
          <article className={s.noticeCard} key={`${item.title.en}-${i}`}>
            <time className={s.noticeCardDate}>{localizeDigits(item.date, lang)}</time>
            <h3 className={s.noticeCardTitle}>
              {item.href ? <Link href={item.href}>{tx(lang, item.title)}</Link> : tx(lang, item.title)}
            </h3>
          </article>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main renderer                                                       */
/* ------------------------------------------------------------------ */

export default function SectionRenderer({ section, home = false }: { section: Section; home?: boolean }) {
  const { lang, site } = useSite()
  const ui = site!.global.ui
  const readMore = ui[lang]?.readMore || (lang === 'en' ? 'Read More' : 'আরও পড়ুন')

  /* ---- stats ---- */
  if (section.type === 'stats')
    return (
      <Sec flush>
        <div className={s.stats}>
          {section.items.map((x) => (
            <div className={s.stat} key={x.label.en}>
              <strong>{localizeDigits(x.value, lang)}</strong>
              <span>{tx(lang, x.label)}</span>
              {x.note && <small>{tx(lang, x.note)}</small>}
            </div>
          ))}
        </div>
      </Sec>
    )

  /* ---- rich text ---- */
  if (section.type === 'richText')
    return (
      <Sec className={cx(s.split, section.reverse && s.reverse, home && s.homeLegacy)}>
        <div className={s.prose}>
          {section.eyebrow && <span className={s.eyebrow}>{tx(lang, section.eyebrow)}</span>}
          {section.heading && <h2 className={s.h2}>{tx(lang, section.heading)}</h2>}
          {section.body.map((p, i) => (
            <p key={i} className={i === 0 ? s.leadP : undefined}>
              {tx(lang, p)}
            </p>
          ))}
        </div>
        {section.image && (
          <div className={s.media}>
            <LinkedMedia item={section.image} />
          </div>
        )}
      </Sec>
    )

  /* ---- cards ---- */
  if (section.type === 'cards') {
    const impact = section.variant === 'impact'
    const homeFeatureCards = home && impact
    const homeEnterprises = home && section.heading?.en.trim().toLowerCase() === 'srizony enterprises'
    const enterpriseItems = homeFeatureCards ? section.items.filter((item) => item.href?.startsWith('/enterprise/')) : []
    const primaryItems = homeFeatureCards ? section.items.filter((item) => !item.href?.startsWith('/enterprise/')) : section.items
    const cardGrid = (items: typeof section.items, columns: number, keyPrefix: string) => (
      <div className={cx(s.cardGrid, homeFeatureCards && s.homeFeatureGrid, impact && 'impact-grid')} data-cols={columns}>
        {items.map((item, i) => (
          <ContentCard
            key={`${keyPrefix}-${item.title.en}-${i}`}
            item={item}
            mobileTitleOnly={home || impact}
            horizontalFeature={Boolean(homeFeatureCards)}
            iconOnly={impact}
          />
        ))}
      </div>
    )
    return (
      <Sec className={cx(homeFeatureCards && s.homePrograms, homeEnterprises && s.homeEnterprises)}>
        <Head eyebrow={section.eyebrow} heading={section.heading} lang={lang} />
        {cardGrid(primaryItems, section.columns || 3, 'program')}
        {enterpriseItems.length > 0 && (
          <div className={s.enterpriseGroup}>
            <h3 className={s.homeProgramSubheading}>{lang === 'en' ? 'Enterprise Development' : 'এন্টারপ্রাইজ উন্নয়ন'}</h3>
            {cardGrid(enterpriseItems, 4, 'enterprise')}
          </div>
        )}
      </Sec>
    )
  }

  /* ---- carousel / collection ---- */
  if (section.type === 'carousel') {
    const collection = section.presentation === 'collection'
    const kind = section.collectionKind || 'projects'
    return (
      <Sec className={cx(collection ? s.collection : undefined, home && section.presentation === 'scroller' && s.homeFieldNews)}>
        <Head
          eyebrow={home && section.presentation === 'scroller' ? undefined : section.eyebrow}
          heading={collection ? undefined : section.heading}
          body={section.body}
          lang={lang}
          compact={collection}
        />
        {collection ? (
          <CollectionFilters items={section.items} lang={lang} heading={section.heading!} ui={ui} kind={kind} />
        ) : (
          <ScrollRow lang={lang} autoplay={home && section.presentation === 'scroller'}>
            {section.items.map((item, i) => (
              <MediaCard key={`${item.title.en}-${i}`} item={item} lang={lang} readMore={readMore} />
            ))}
          </ScrollRow>
        )}
      </Sec>
    )
  }

  /* ---- reports ---- */
  if (section.type === 'reports') {
    const items = section.items.filter((item) => item.title?.en || item.title?.bn || item.file)
    return (
      <Sec>
        <Head eyebrow={section.eyebrow} heading={section.heading} body={section.body} lang={lang} />
        <div className={s.reports}>
          {items.map((item, i) => (
            <article className={s.report} key={`${item.title.en}-${i}`}>
              <div className={s.reportIcon}>
                <FileText size={22} />
              </div>
              <div className={s.reportCopy}>
                <div className={s.reportMeta}>
                  {item.category && <span className={s.pill}>{tx(lang, item.category)}</span>}
                  {item.publishedAt && <time>{localizeDigits(item.publishedAt, lang)}</time>}
                </div>
                <h3>{tx(lang, item.title)}</h3>
                {item.description && <p>{tx(lang, item.description)}</p>}
              </div>
              {item.file ? (
                <a className={s.download} href={item.file} target="_blank" rel="noreferrer">
                  <Download size={16} />
                  <span>{lang === 'en' ? 'Download' : 'ডাউনলোড'}</span>
                </a>
              ) : (
                <span className={s.pending}>{lang === 'en' ? 'Document pending' : 'নথি অপেক্ষমাণ'}</span>
              )}
            </article>
          ))}
        </div>
        {!items.length && (
          <div className={s.empty}>
            {lang === 'en'
              ? 'Official reports will appear here after publication through the CMS.'
              : 'CMS-এর মাধ্যমে প্রকাশের পর অফিসিয়াল রিপোর্ট এখানে দেখা যাবে।'}
          </div>
        )}
      </Sec>
    )
  }

  /* ---- gallery ---- */
  if (section.type === 'gallery')
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />
        <div className={s.gallery} data-cols={section.columns || 3}>
          {section.items.map((item, i) => (
            <MediaImage key={i} item={item} className={cx('media-image', 'gallery-item', s.galleryItem)} />
          ))}
        </div>
      </Sec>
    )

    /* ---- timeline ---- */
  if (section.type === 'timeline' && section.variant === 'journey')
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />
        <JourneyTimeline heading={section.heading} items={section.items} />
      </Sec>
    )

  if (section.type === 'timeline')
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />

        <ol className="sf-content-timeline">
          {section.items.map((x, i) => (
            <li
              className="sf-content-timeline-item"
              key={i}
            >
              <span className="sf-content-timeline-year">
                {localizeDigits(x.year, lang)}
              </span>

              <span
                className="sf-content-timeline-dot"
                aria-hidden="true"
              />

              <div className="sf-content-timeline-body">
                <h3>{tx(lang, x.title)}</h3>
                <p>{tx(lang, x.body)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Sec>
    )

  /* ---- diagram ---- */
  if (section.type === 'diagram')
    return section.variant === 'sdg' ? <SDGContribution heading={section.heading} body={section.body} /> : <Diagram section={section} />

  /* ---- table ---- */
  if (section.type === 'table')
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />
        <div className={s.tableWrap} tabIndex={0} role="region" aria-label={section.heading ? tx(lang, section.heading) : undefined}>
          <table className={s.table}>
            <thead>
              <tr>
                {section.headers.map((h) => (
                  <th key={h.en} scope="col">
                    {tx(lang, h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} data-label={section.headers[j] ? tx(lang, section.headers[j]) : undefined}>
                      {tx(lang, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>
    )

  /* ---- video ---- */
  if (section.type === 'video')
    return (
      <Sec>
        <Head heading={section.heading} body={section.body} lang={lang} />
        <div className={s.video}>
          <VideoBlock
            poster={section.poster}
            embedUrl={section.embedUrl}
            sourceUrl={section.sourceUrl}
            heading={section.heading && tx(lang, section.heading)}
            body={section.body && tx(lang, section.body)}
          />
        </div>
      </Sec>
    )

  /* ---- CTA ---- */
  if (section.type === 'cta')
    return (
      <Sec>
        <div className={s.cta}>
          <div className={s.ctaCopy}>
            <span className={s.ctaEyebrow}>{lang === 'en' ? 'Take Action' : 'এখনই উদ্যোগ নিন'}</span>
            <h2>{tx(lang, section.heading)}</h2>
            <p>{tx(lang, section.body)}</p>
          </div>
          <div className={s.ctaActions}>
            <ActionLink href={section.primary.href} label={tx(lang, section.primary.label)} className={s.ctaPrimary} />
            {section.secondary && (
              <ActionLink href={section.secondary.href} label={tx(lang, section.secondary.label)} className={s.ctaGhost} />
            )}
          </div>
        </div>
      </Sec>
    )

  /* ---- notices ---- */
  if (section.type === 'noticeList')
    return (
      <Sec className={cx(home && s.homeNotices)}>
        <Head heading={section.heading} lang={lang} />
        <NoticeScroller items={section.items || []} lang={lang} autoplay={home ? true : section.autoplay} />
      </Sec>
    )

  /* ---- content feed (projects / products / team / news, loaded server-side from the CMS) ---- */
  if (section.type === 'contentFeed') {
    const KIND: Record<string, Bi> = {
      project: { en: 'Project', bn: 'প্রকল্প' }, product: { en: 'Product / Service', bn: 'পণ্য ও সেবা' }, team: { en: 'Team', bn: 'টিম' },
      notice: { en: 'Notice', bn: 'নোটিশ' }, report: { en: 'Report', bn: 'প্রতিবেদন' }, job: { en: 'Job', bn: 'চাকরি' },
    }
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />
        <div className={s.notices}>
          {(section.items || []).map((item) => (
            <article className={s.notice} key={`${item.component}-${item.id}`}>
              <time className={s.noticeDate}>{localizeDigits(item.date, lang)}</time>
              <div className={s.noticeCopy}>
                <small>{tx(lang, KIND[item.component] ?? { en: item.component, bn: item.component })}{item.deadline ? ` · ${item.deadline}` : ''}</small>
                <h3>{item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer">{tx(lang, item.title)}</a> : tx(lang, item.title)}</h3>
                {item.summary[lang] && <p>{tx(lang, item.summary)}</p>}
              </div>
              {item.href && (
                <a href={item.href} className={s.noticeGo} target="_blank" rel="noopener noreferrer" aria-label={tx(lang, item.title)}>
                  <ExternalLink size={18} />
                </a>
              )}
            </article>
          ))}
          {!(section.items || []).length && <p>{lang === 'en' ? 'Nothing to show yet.' : 'এখনও কিছু নেই।'}</p>}
        </div>
      </Sec>
    )
  }

  /* ---- contact ---- */
  if (section.type === 'contact') {
    const addrLink = mapsLink(section.address.en)
    return (
      <Sec>
        <Head heading={section.heading} lang={lang} />

        <div className={s.contactGrid}>
          {/* Left: Large Contact Form */}
          <div className={s.query}>
            <QueryForm />
          </div>

          {/* Right: Contact Details */}
          <div className={s.contactInfo}>
            <div className={s.contactItem}>
              <span className={s.contactIcon}>
                <MapPin size={18} />
              </span>

              <div>
                <strong>{ui[lang].address}</strong>

                <a
                  href={addrLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tx(lang, section.address)}
                </a>
              </div>
            </div>

            <div className={s.contactItem}>
              <span className={s.contactIcon}>
                <Phone size={18} />
              </span>

              <div>
                <strong>{ui[lang].phone}</strong>

                {section.phones.map((p) => (
                  <a
                    key={p}
                    href={`tel:${p.replace(/[^+\d]/g, '')}`}
                  >
                    {localizeDigits(p, lang)}
                  </a>
                ))}
              </div>
            </div>

            <div className={s.contactItem}>
              <span className={s.contactIcon}>
                <Mail size={18} />
              </span>

              <div>
                <strong>{ui[lang].email}</strong>

                {section.emails.map((e) => (
                  <a
                    key={e}
                    href={`mailto:${e}`}
                  >
                    {e}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Google Map */}
          <div className={s.mapCard}>
            <iframe
              className={s.map}
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                section.address.en
              )}&output=embed`}
              title="Srizony Foundation Head Office map"
            />

            <a
              className={s.mapOpen}
              href={addrLink}
              target="_blank"
              rel="noreferrer"
            >
              {tx(
                lang,
                section.mapLabel || {
                  en: 'Open in Google Maps',
                  bn: 'গুগল ম্যাপে খুলুন',
                }
              )}

              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {section.locations && (
          <div className={s.locations}>
            <Head
              compact
              as="h2"
              eyebrow={{
                en: 'Site & Operational Footprint',
                bn: 'প্রধান কার্যালয় ও কার্যক্রমের বিস্তৃতি',
              }}
              heading={{
                en: 'Locations you can open in Google Maps',
                bn: 'গুগল ম্যাপে দেখা যায় এমন অবস্থানসমূহ',
              }}
              lang={lang}
            />

            <div className={s.locationGrid}>
              {section.locations.map((loc, i) => (
                <article
                  className={s.location}
                  key={i}
                >
                  <span className={s.kind}>
                    {loc.kind === 'site'
                      ? lang === 'en'
                        ? 'HEAD OFFICE'
                        : 'প্রধান কার্যালয়'
                      : loc.kind === 'branch'
                        ? lang === 'en'
                          ? 'BRANCH'
                          : 'শাখা'
                        : lang === 'en'
                          ? 'FOOTPRINT'
                          : 'কার্যক্রমের এলাকা'}
                  </span>

                  <h3>{tx(lang, loc.name)}</h3>

                  <p>{tx(lang, loc.address)}</p>

                  <a
                    href={mapsLink(loc.mapQuery)}
                    target="_blank"
                    rel="noreferrer"
                    className={s.more}
                  >
                    {tx(lang, {
                      en: 'Open in Google Maps',
                      bn: 'গুগল ম্যাপে খুলুন',
                    })}

                    <MapPin size={16} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}
      </Sec>
    )
  }

  /* ---- donation ---- */
  if (section.type === 'donation')
    return (
      <Sec>
        <Head heading={section.heading} body={section.body} lang={lang} />
        <DonationForm />
      </Sec>
    )

  return null
}