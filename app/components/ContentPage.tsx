'use client'

import Link from 'next/link'
import { CalendarDays, ChevronRight, Clock3, Home as HomeIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSite } from './SiteProvider'
import SectionRenderer from './SectionRenderer'
import HomeHero from './HomeHero'
import { dedupeLandingSections, prepareHeroSlides } from '../../data/landingImages'
import LogoLoader from './LogoLoader'

export default function ContentPage({ slug }: { slug: string }) {
  const pathname = usePathname() || '/'
  const { lang, site, loading, error, refresh } = useSite()
  const [clockNow, setClockNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setClockNow(new Date())
    update()
    const id = window.setInterval(update, 1_000)
    return () => window.clearInterval(id)
  }, [])

  const t = (value?: { en: string; bn: string }) =>
    value?.[lang] || ''

  const canonicalPath =
    pathname === '/bn'
      ? '/'
      : pathname.startsWith('/bn/')
        ? pathname.slice(3) || '/'
        : pathname

  if (loading || !site || (site.canonicalSlug !== canonicalPath && !error)) {
    return (
      <LogoLoader
        fullScreen
        label={
          lang === 'en'
            ? 'Loading content'
            : 'কনটেন্ট লোড হচ্ছে'
        }
      />
    )
  }

  if (error) {
    return (
      <section className="page-state container">
        <div className="state-card">
          <h1>
            {lang === 'en'
              ? 'Page Load Failed'
              : 'এই পেজটি লোড করা যায়নি'}
          </h1>

          <p>{error}</p>

          <button
            className="btn primary"
            type="button"
            onClick={() => void refresh()}
          >
            {lang === 'en' ? 'Try again' : 'আবার চেষ্টা করুন'}
          </button>
        </div>
      </section>
    )
  }

  if (site.notFound || !site.page) {
    return (
      <section className="page-state container">
        <div className="state-card">
          <h1>
            {lang === 'en'
              ? 'Page not found'
              : 'পেজ পাওয়া যায়নি'}
          </h1>

          <Link className="btn primary" href="/">
            {lang === 'en'
              ? 'Back home'
              : 'হোমে ফিরুন'}
          </Link>
        </div>
      </section>
    )
  }

  const page = site.page
  const uniquePageSections = dedupeLandingSections(page.sections, page.heroImage ? [{ image: page.heroImage }] : [], page.slug)
  const { ui, homeHero } = site.global

  /**
   * Always determine home from the actual browser route.
   * This avoids rendering the previous page's sections after
   * navigating back to /.
   */
  if (canonicalPath === '/') {
    const sourceJourney = page.sections.find((section) => section.type === 'timeline' && (section.heading?.en || '').trim().toLowerCase() === 'our journey')
    const sourceWho = page.sections.find((section) => section.type === 'cards' && section.variant === 'impact')
    const sourceSdg = page.sections.find((section) => section.type === 'diagram' && section.variant === 'sdg')
    const sourceEnterprises = page.sections.find((section) => section.type === 'cards' && (section.heading?.en || '').trim().toLowerCase() === 'srizony enterprises')
      ?? page.sections.find((section) => section.type === 'cards' && section.variant !== 'impact' && section.items.some((item) => item.href?.startsWith('/enterprise/')))
    const sourceFieldNews = page.sections.find((section) => section.type === 'carousel' && (section.heading?.en || '').trim().toLowerCase() === 'news from the field')

    // Homepage order: hero, legacy, journey, who we are, SDG impact, enterprises, field news.
    const landingSections = [sourceJourney, sourceWho, sourceSdg, sourceEnterprises, sourceFieldNews]
      .filter((section): section is (typeof page.sections)[number] => Boolean(section))
      .map((section) => {
        const value = section.type === 'timeline' ? { ...section, variant: 'journey' as const } : section
        if (value.type === 'richText') {
          return {
            ...value,
            eyebrow: undefined,
            body: value.body,
            image: value.image,
          }
        }
        if (value.type === 'cards' && value.variant === 'impact') {
          return {
            ...value,
            eyebrow: undefined,
            variant: 'impact' as const,
            items: (value.items || []).filter((item) => !item.href?.startsWith('/enterprise/')),
          }
        }
        if (value.type === 'diagram') {
          return { ...value, variant: 'sdg' as const }
        }
        if (value.type === 'cards') {
          return { ...value, eyebrow: undefined, variant: 'default' as const }
        }
        if (value.type === 'carousel') {
          return {
            ...value,
            eyebrow: undefined,
            body: value.body,
            presentation: 'scroller' as const,
          }
        }
        return value
      })

    // Preserve complete CMS headings; typography and container width handle long titles.
    const compactTitle = (value: { en: string; bn: string }) => value
    const heroSlides = prepareHeroSlides(homeHero.slides)
    const limited = landingSections.map((section) => {
      const withHeading = 'heading' in section && section.heading ? { ...section, heading: compactTitle(section.heading) } : section
      if (withHeading.type === 'cards' || withHeading.type === 'carousel') {
        return { ...withHeading, items: withHeading.items.map((item) => ({ ...item, title: compactTitle(item.title) })) } as typeof withHeading
      }
      if (withHeading.type === 'timeline') {
        return { ...withHeading, items: withHeading.items.map((item) => ({ ...item, title: compactTitle(item.title) })) } as typeof withHeading
      }
      return withHeading
    })
    const cleanSections = dedupeLandingSections(limited, heroSlides)

    return (
      <>
        <HomeHero data={{ ...homeHero, slides: heroSlides }} />

        <main className="content-shell">
          {cleanSections.map((section, index) => (
            <SectionRenderer
              key={index}
              section={section!}
              home
            />
          ))}
        </main>
      </>
    )
  }

  const parts = (canonicalPath || page.slug).split('/').filter(Boolean)

  // Use real parent pages, rather than assuming the first URL segment is
  // always a published page (enterprise detail pages live under a different
  // collection page).
  const parent = canonicalPath.startsWith('/enterprise/')
    ? '/enterprise-development'
    : parts.length > 1
      ? `/${parts[0]}`
      : ''

  const parentTitle =
    parent === '/about-us'
      ? {
          en: 'About Us',
          bn: 'আমাদের সম্পর্কে',
        }
      : parent === '/what-we-do'
        ? {
            en: 'What We Do',
            bn: 'আমরা যা করি',
          }
        : parent === '/projects'
          ? {
              en: 'Projects',
              bn: 'প্রকল্পসমূহ',
            }
          : parent === '/news'
            ? {
                en: 'News',
                bn: 'সংবাদ',
              }
            : parent === '/enterprise-development'
              ? {
                  en: 'Enterprise Development',
                  bn: 'এন্টারপ্রাইজ উন্নয়ন',
                }
              : parent
                ? {
                    en: parts[0].replace(/-/g, ' '),
                    bn: parts[0].replace(/-/g, ' '),
                  }
                : null

  // Breadcrumb links deliberately perform a regular navigation. This avoids
  // stale CMS client state on route changes and preserves the Bangla URL.
  const localePrefix = pathname === '/bn' || pathname.startsWith('/bn/') ? '/bn' : ''
  const breadcrumbHref = (target: string) => {
    const normalized = target === '/' ? '' : target.startsWith('/') ? target : `/${target}`
    return `${localePrefix}${normalized}` || '/'
  }

  return (
    <div
      className={[
        'content-page-wrapper',
        page.slug === '/social-development' ||
        page.slug === '/social-enterprise'
          ? 'social-cards-page'
          : '',
        page.slug === '/enterprise-development'
          ? 'enterprise-development-page'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <section className="page-breadcrumb-band">
        <div className="container page-breadcrumb-layout">
          <div className="page-breadcrumb-copy">
            <nav
              className="breadcrumb-nav"
              aria-label={lang === 'en' ? 'Breadcrumb' : 'ব্রেডক্রাম্ব'}
            >
              <a
                href={breadcrumbHref('/')}
                className="breadcrumb-home"
                aria-label={ui[lang].home}
              >
                <HomeIcon size={15} aria-hidden="true" />
                <span>{ui[lang].home}</span>
              </a>

              {parentTitle && (
                <>
                  <ChevronRight size={14} aria-hidden="true" />
                  <a href={breadcrumbHref(parent)}>{t(parentTitle)}</a>
                </>
              )}

              <ChevronRight size={14} aria-hidden="true" />
              <span className="breadcrumb-current" aria-current="page">{t(page.title)}</span>
            </nav>

            <div className="inner-page-heading">
              <span className="eyebrow">
                {t({
                  en: 'Srizony Foundation',
                  bn: 'সৃজনী ফাউন্ডেশন',
                })}
              </span>
              <h1>{t(page.title)}</h1>
              {page.subtitle && <p>{t(page.subtitle)}</p>}
            </div>
          </div>

          <div className="breadcrumb-tools" aria-label={lang === 'en' ? 'Bangladesh date and time' : 'বাংলাদেশের তারিখ ও সময়'}>
            <div className="breadcrumb-tool breadcrumb-calendar-card" aria-label={lang === 'en' ? 'Bangladesh date and time' : 'বাংলাদেশের তারিখ ও সময়'}>
              <div>
                <CalendarDays className="breadcrumb-tool-icon" size={24} aria-hidden="true" />
                <Clock3 className="breadcrumb-tool-icon" size={24} aria-hidden="true" />
              </div>
              <span className="breadcrumb-tool-copy">
                <time className="breadcrumb-tool-value breadcrumb-date-value" dateTime={clockNow?.toISOString()}>
                  {clockNow ? new Intl.DateTimeFormat(lang === 'en' ? 'en-BD' : 'bn-BD', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(clockNow) : (lang === 'en' ? 'Today' : 'আজ')}
                  {clockNow ? new Intl.DateTimeFormat(lang === 'en' ? 'en-BD' : 'bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }).format(clockNow) : '--:--:--'}
                </time>
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="content-shell">
        {uniquePageSections.map((section, index) => (
          <SectionRenderer
            key={index}
            section={section}
          />
        ))}
      </main>
    </div>
  )
}