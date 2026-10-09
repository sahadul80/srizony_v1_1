'use client'

import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import type { HeroData, Lang } from '../../types/entityType'
import { useSite } from './SiteProvider'
import SafeImage from './SafeImage'
import { prepareHeroSlides } from '../../data/landingImages'
import s from '../css_extra/HomeHero.module.css'

const digits = (value: string, lang: Lang) =>
  lang === 'bn' ? value.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]) : value

export default function HomeHero({ data }: { data: HeroData }) {
  const { lang } = useSite()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [holding, setHolding] = useState(false)
  const [reduced, setReduced] = useState(false)
  const startX = useRef<number | null>(null)
  const rail = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Curated, de-duplicated rail: every slide has its own picture and a title of at most three words.
  const slides = useMemo(() => prepareHeroSlides(data.slides), [data.slides])
  const count = slides.length
  const slide = slides[index] || slides[0]
  const interval = data.autoplayInterval || 6000
  const canPlay = !!data.autoplay && count > 1 && !reduced
  const running = canPlay && !paused && !holding

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Keep the active tile inside the rail (scrolls the rail only, never the page).
  useEffect(() => {
    const el = rail.current
    const tile = thumbRefs.current[index]
    if (!el || !tile) return
    const target = tile.offsetLeft - (el.clientWidth - tile.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, target), behavior: reduced ? 'auto' : 'smooth' })
  }, [index, reduced, count])

  // Mouse wheel scrolls the rail sideways when it overflows.
  useEffect(() => {
    const el = rail.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0
      if (atStart || atEnd) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [count])

  if (!slide) return null

  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn)
  const t = (x: { en: string; bn: string }) => x[lang]
  const go = (i: number) => setIndex(((i % count) + count) % count)

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      startX.current = e.clientX
      setHolding(true)
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer capture is an enhancement */ }
    }
  }
  const onPointerUp = (e: PointerEvent) => {
    if (startX.current === null) return
    const dx = e.clientX - startX.current
    startX.current = null
    setHolding(false)
    if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1))
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (count < 2) return
    if (e.key === 'ArrowRight') go(index + 1)
    if (e.key === 'ArrowLeft') go(index - 1)
  }

  return (
    <section className={s.hero} data-lang={lang} aria-label={tr('Featured work', 'নির্বাচিত কার্যক্রম')}>
      <div className={`container ${s.inner}`}>
        <div
          className={s.stage}
          role="group"
          aria-roledescription="carousel"
          aria-label={tr('Featured work', 'নির্বাচিত কার্যক্রম')}
          onKeyDown={onKeyDown}
          onPointerEnter={e => e.pointerType === 'mouse' && setHolding(true)}
          onPointerLeave={() => setHolding(false)}
          onFocus={e => e.target.matches(':focus-visible') && setHolding(true)}
          onBlur={() => setHolding(false)}
        >
          <div
            className={`${s.frame} ${canPlay ? s.kb : ''}`}
            style={{ '--dur': `${interval + 700}ms` } as CSSProperties}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { startX.current = null; setHolding(false) }}
          >
            {slides.map((sl, i) => (
              <div
                key={sl.id}
                className={`${s.slide} ${i === index ? s.slideOn : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${count}`}
                aria-hidden={i !== index}
              >
                <SafeImage
                  src={sl.image}
                  alt={t(sl.title)}
                  fallbackTitle={t(sl.title)}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={s.image}
                />
              </div>
            ))}

            <div className={s.shade} aria-hidden="true" />

            <div className={s.titlePanel}>
              <h1 className={s.title}>{t(slide.title)}</h1>
            </div>

            {count > 1 && (
              <div
                className={s.thumbs}
                ref={rail}
                role="group"
                aria-label={tr('Choose a slide', 'স্লাইড বেছে নিন')}
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
              >
                {slides.map((sl, i) => {
                  const active = i === index
                  return (
                    <button
                      key={sl.id}
                      ref={node => { thumbRefs.current[i] = node }}
                      type="button"
                      className={`${s.thumb} ${active ? s.thumbOn : ''}`}
                      onClick={() => go(i)}
                      aria-current={active ? 'true' : undefined}
                      aria-label={`${tr('Slide', 'স্লাইড')} ${digits(String(i + 1), lang)}: ${t(sl.title)}`}
                    >
                      <SafeImage src={sl.image} alt="" fallbackTitle="" fill sizes="96px" className={s.thumbImg} />
                      <span className={s.thumbBar}>
                        {active && (
                          <span
                            key={`${index}-${canPlay}`}
                            className={`${s.fill} ${canPlay ? s.fillRun : s.fillDone}`}
                            style={{ animationDuration: `${interval}ms`, animationPlayState: running ? 'running' : 'paused' }}
                            onAnimationEnd={() => go(index + 1)}
                          />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
