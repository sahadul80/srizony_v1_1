'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { prepareHeroSlides } from '@/data/landingImages'
import type { HeroData, HeroSlide, Lang, PageData } from '@/types/entityType'
import SafeImage from '@/components/ui/SafeImage'
import ConfiguredLink from '@/components/ui/ConfiguredLink'
import Container from '@/components/containers/Container'

export default function Hero({ hero, lang, slidesOverride, tone = 'green' }: { hero: HeroData; lang: Lang; slidesOverride?: HeroSlide[]; tone?: PageData['heroTone'] }) {
  // An explicitly empty CMS list is intentional; do not silently resurrect the bundled slides.
  const slideSource = slidesOverride !== undefined ? slidesOverride : (hero.slides ?? [])
  const slides = useMemo(() => prepareHeroSlides(slideSource), [slideSource])
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const heroRef = useRef<HTMLElement | null>(null)
  const touchX = useRef<number | null>(null)
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn)
  const activeSlide = count ? slides[index % count] : undefined
  const actionFor = (href: string): 'route' | 'external' | 'anchor' => /^https?:\/\//i.test(href) ? 'external' : href.startsWith('#') || href.includes('#') ? 'anchor' : 'route'
  const go = useCallback((n: number) => count && setIndex(((n % count) + count) % count), [count])

  useEffect(() => {
    if (count < 2 || paused || hero.autoplay === false) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const raw = hero.autoplayInterval ?? 6500
    const ms = Math.max(4500, raw < 100 ? raw * 1000 : raw)
    const id = window.setInterval(() => setIndex((v) => (v + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [count, paused, hero.autoplay, hero.autoplayInterval])

  // Gentle parallax: the photo drifts slower than the page.
  useEffect(() => {
    const el = heroRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        el.style.setProperty('--py', `${Math.min(window.scrollY, 900) * 0.25}px`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (!count) return null

  return (
    <section
      ref={heroRef}
      className={`sf-hero sf-hero--tone-${tone ?? 'green'}`}
      aria-roledescription="carousel"
      aria-label={tr('Photo gallery', 'ছবির গ্যালারি')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="sf-hero-slides">
        {slides.map((s, i) => {
          const near = i === index || i === (index + 1) % count || i === (index - 1 + count) % count
          return (
            <div key={s.id} className={`sf-hero-slide ${i === index ? 'is-on' : ''}`} aria-hidden={i !== index}>
              {near && <SafeImage src={s.image} alt={i === index ? s.alt?.[lang] ?? s.title?.[lang] ?? '' : ''} fill sizes="100vw" priority={i === 0} className="sf-cover" />}
            </div>
          )
        })}
      </div>
      <div className="sf-hero-shade" />

      {hero.copyVisible !== false && hero.copyRemoved !== true && <div className="sf-hero-body">
        <Container className="sf-hero-content">
          {hero.eyebrow?.[lang] && <span className="sf-hero-eyebrow">{hero.eyebrow[lang]}</span>}
          {(hero.headingLineOne?.[lang] || hero.headingLineTwo?.[lang]) && <h1 className="sf-hero-title">{hero.headingLineOne?.[lang] && <span>{hero.headingLineOne[lang]}</span>}{hero.headingLineTwo?.[lang] && <span>{hero.headingLineTwo[lang]}</span>}</h1>}
          {hero.description?.[lang] && <p className="sf-hero-lead">{hero.description[lang]}</p>}
          <div className="sf-hero-actions">
            {hero.primaryAction?.label?.[lang] && hero.primaryAction?.href && <ConfiguredLink href={hero.primaryAction.href} action={actionFor(hero.primaryAction.href)} className="sf-btn sf-btn--primary">{hero.primaryAction.label[lang]}</ConfiguredLink>}
            {hero.secondaryAction?.label?.[lang] && hero.secondaryAction?.href && <ConfiguredLink href={hero.secondaryAction.href} action={actionFor(hero.secondaryAction.href)} className="sf-btn sf-btn--outline">{hero.secondaryAction.label[lang]}</ConfiguredLink>}
          </div>
        </Container>
      </div>}

      {activeSlide && (activeSlide.title?.[lang] || activeSlide.description?.[lang]) && <div className="sf-hero-bar"><Container className="sf-hero-bar-in">
        {activeSlide.href ? <ConfiguredLink href={activeSlide.href} action={actionFor(activeSlide.href)} className="sf-hero-caption">{activeSlide.description?.[lang] && <small>{activeSlide.description[lang]}</small>}{activeSlide.title?.[lang] && <strong>{activeSlide.title[lang]}</strong>}</ConfiguredLink> : <div className="sf-hero-caption">{activeSlide.description?.[lang] && <small>{activeSlide.description[lang]}</small>}{activeSlide.title?.[lang] && <strong>{activeSlide.title[lang]}</strong>}</div>}
        {count > 1 && <div className="sf-hero-ctrl" role="group" aria-label={tr('Slide controls', 'স্লাইড নিয়ন্ত্রণ')}>
          <button type="button" onClick={() => go(index - 1)} aria-label={tr('Previous photo', 'আগের ছবি')}><ChevronLeft size={20} /></button>
          <div className="sf-hero-dots">{slides.map((s, i) => <button key={s.id} type="button" className={i === index ? 'is-on' : ''} onClick={() => go(i)} aria-label={`${tr('Photo', 'ছবি')} ${i + 1}`} aria-current={i === index} />)}</div>
          <button type="button" onClick={() => go(index + 1)} aria-label={tr('Next photo', 'পরের ছবি')}><ChevronRight size={20} /></button>
        </div>}
      </Container></div>}
      {!activeSlide && count > 1 && <div className="sf-hero-ctrl" role="group" aria-label={tr('Slide controls', 'স্লাইড নিয়ন্ত্রণ')}><button type="button" onClick={() => go(index - 1)} aria-label={tr('Previous photo', 'আগের ছবি')}><ChevronLeft size={20} /></button><div className="sf-hero-dots">{slides.map((s, i) => <button key={s.id} type="button" className={i === index ? 'is-on' : ''} onClick={() => go(i)} aria-label={`${tr('Photo', 'ছবি')} ${i + 1}`} aria-current={i === index} />)}</div><button type="button" onClick={() => go(index + 1)} aria-label={tr('Next photo', 'পরের ছবি')}><ChevronRight size={20} /></button></div>}
      <span className="sf-hero-scroll" aria-hidden="true"><i /></span>
    </section>
  )
}

