'use client'

import type { CSSProperties } from 'react'
import type { Lang, PageData } from '@/types/entityType'
import { AREAS, AREAS_INTRO, type AreaCard } from '@/data/homeContent'
import Container from '@/components/containers/Container'
import ProjectCard from '@/components/home/ProjectCard'
import Reveal from '@/components/containers/Reveal'
import HomeSectionActions from '@/components/home/HomeSectionActions'

const normalizeHeading = (value?: string) => (value ?? '').trim().toLocaleLowerCase().replace(/[\s_-]+/g, ' ')
type CardsSection = Extract<PageData['sections'][number], { type: 'cards' }>


function resolveAreas(page: PageData): { intro: { eyebrow: { en: string; bn: string }; title: { en: string; bn: string } }; areas: AreaCard[]; section?: CardsSection } | null {
  const section = page.sections.find((item): item is CardsSection =>
    item.type === 'cards' && (item.homeComponent === 'developmentAreas' || normalizeHeading(item.heading?.en) === 'integrated development areas'),
  )
  if (section?.visible === false) return null
  if (!section) return { intro: AREAS_INTRO, areas: AREAS.map((area) => ({ ...area, image: '' })) }
  const items = Array.isArray(section.items) ? section.items : []
  if (!items.length) return { intro: { eyebrow: section.eyebrow ?? AREAS_INTRO.eyebrow, title: section.heading ?? AREAS_INTRO.title }, areas: [], section }

  const validIcons = new Set<AreaCard['icon']>(['heart', 'book', 'users', 'coins', 'sprout', 'store'])
  const areas = items.map((item, index) => {
    const fallback = AREAS.find((area) => area.href === item.href) ?? AREAS[index % AREAS.length]
    const chosenIcon = item.illustration ?? item.icon
    return {
      href: item.href ?? fallback.href,
      icon: typeof chosenIcon === 'string' && validIcons.has(chosenIcon as AreaCard['icon']) ? chosenIcon as AreaCard['icon'] : fallback.icon,
      title: item.title ?? fallback.title,
      body: item.body ?? fallback.body,
      chips: Array.isArray(item.chips) ? item.chips : item.tag ? [item.tag] : undefined,
      imageAlt: item.image?.alt ?? item.title ?? fallback.title,
      // An image is deliberately opt-in. The default landing page keeps its animated SVG art,
      // while an editor can replace a card's illustration with a chosen CMS image.
      image: item.image?.src ?? '',
    }
  })
  return {
    intro: { eyebrow: section.eyebrow ?? AREAS_INTRO.eyebrow, title: section.heading ?? AREAS_INTRO.title },
    areas,
    section,
  }
}

export default function DevelopmentAreas({ lang, page }: { lang: Lang; page: PageData }) {
  const resolved = resolveAreas(page)
  if (!resolved) return null
  const { intro, areas, section } = resolved
  return (
    <section className="sf-section sf-areas" aria-labelledby="sf-areas-title">
      <Container>
        <Reveal>
          <header className="sf-sec-head sf-sec-head--center">
            <span className="sf-eyebrow">{intro.eyebrow[lang]}</span>
            <h2 id="sf-areas-title" className="sf-h2">{intro.title[lang]}</h2>
          </header>
        </Reveal>
        {areas.length > 0 && <div className="sf-areas-grid" style={{ '--cols': section?.columns ?? 3 } as CSSProperties}>
          {areas.map((area, index) => <ProjectCard key={`${area.href}-${index}`} area={area} lang={lang} index={index} />)}
        </div>}
        <HomeSectionActions section={section} lang={lang} />
      </Container>
    </section>
  )
}
