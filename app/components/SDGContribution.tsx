'use client'
import React from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Pause, Play, Coins, Wheat, HeartPulse, GraduationCap, HandHeart, Droplets, SunMedium, BriefcaseBusiness } from 'lucide-react'
import { useSite } from './SiteProvider'
import { localizeDigits } from '../../lib/utils'
import { limitWords } from '../../data/landingImages'
import styles from '../css_extra/SDGContribution.module.css'
import { SDG_BACKGROUND_URLS } from '../../data/landingImages'


const AUTOPLAY_MS = 6000

const iconMap = [Coins, Wheat, HeartPulse, GraduationCap, HandHeart, Droplets, SunMedium, BriefcaseBusiness]

// Goal backgrounds come from the shared landing image plan so none repeats a hero or card picture.
const SDG_BACKGROUND_IMAGES: Record<string, string> = SDG_BACKGROUND_URLS

export default function SDGContribution({ heading, body, home = false }: { heading?: { en: string; bn: string }; body?: { en: string; bn: string }; home?: boolean }) {
  const { lang, site } = useSite()
  const steps = site?.global.SDGsteps || []
  const total = steps.length

  const [active, setActive] = React.useState(0)
  const [playing, setPlaying] = React.useState(true) // person's choice (play / pause button)
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [touching, setTouching] = React.useState(false)
  const [inView, setInView] = React.useState(true)
  const [tabVisible, setTabVisible] = React.useState(true)
  const sectionRef = React.useRef<HTMLElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const railRef = React.useRef<HTMLOListElement>(null)
  const targetRef = React.useRef<number | null>(null) // index we are animating towards
  const rafRef = React.useRef(0)

  const t = (en: string, bn: string) => (lang === 'en' ? en : bn)
  const num = (n: number | string) => localizeDigits(String(n), lang)

  /* Move to a slide: the browser handles the smooth scroll + snap */
  const go = React.useCallback((i: number, jump = false) => {
    const el = viewportRef.current
    if (!el || !total) return
    const next = Math.max(0, Math.min(total - 1, i))
    targetRef.current = next
    setActive(next)
    if (jump) { // wrap-around: jump instead of scrolling back through every slide
      el.style.scrollBehavior = 'auto'
      el.scrollLeft = next * el.clientWidth
      el.style.scrollBehavior = ''
    } else {
      el.scrollTo({ left: next * el.clientWidth })
    }
  }, [total])

  /* ---- Autoplay ---- */
  // start paused for people who prefer reduced motion
  React.useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPlaying(false)
  }, [])

  // pause when the slider is off-screen or the tab is hidden
  React.useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  React.useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const paused = hovered || focused || touching
  const running = playing && total > 1 && inView && tabVisible

  // one timer per slide: advances, then loops back to the first step
  React.useEffect(() => {
    if (!running || paused) return
    const id = window.setTimeout(() => {
      active >= total - 1 ? go(0, true) : go(active + 1)
    }, AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [running, paused, active, total, go])

  /* Keep `active` in sync when the person swipes / drags the scrollbar */
  const onScroll = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const el = viewportRef.current
      if (!el || !el.clientWidth) return
      const idx = Math.round(el.scrollLeft / el.clientWidth)
      if (targetRef.current !== null) {
        if (idx === targetRef.current) targetRef.current = null
        return // ignore in-between positions while a button-triggered scroll runs
      }
      setActive(prev => (prev === idx ? prev : idx))
    })
  }
  const releaseTarget = () => { targetRef.current = null } // person took over (touch / wheel)
  const onTouchStart = () => { releaseTarget(); setTouching(true) }
  const onTouchEnd = () => setTouching(false)

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  /* Keep the active chip visible in the (scrollable) step rail on small screens */
  React.useEffect(() => {
    const rail = railRef.current
    const chip = rail?.children[active] as HTMLElement | undefined
    if (!rail || !chip || rail.scrollWidth <= rail.clientWidth) return
    rail.scrollTo({ left: chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
  }, [active])

  /* Keep the slide aligned if the width changes (rotate phone, resize window) */
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      el.style.scrollBehavior = 'auto'
      el.scrollLeft = active * el.clientWidth
      el.style.scrollBehavior = ''
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(total - 1) }
  }

  if (!total) return null

  const progress = total > 1 ? active / (total - 1) : 1

  return (
    <section ref={sectionRef} className={`section-shell ${home ? styles.homeSdg : ''}`} aria-roledescription="carousel" aria-label={t('Sustainable Development Goals contribution', 'টেকসই উন্নয়ন লক্ষ্যে অবদান')}>
      <div className="section-head">
        <h2>{heading?.[lang]}</h2>
        <p className="hidden sm:flex">{body?.[lang]}</p>
      </div>

      <div
        className={styles.slider}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false) }}
      >
        {/* Step rail */}
        <ol className={styles.rail} ref={railRef} style={{ '--steps': total } as React.CSSProperties}>
          {steps.map((s, i) => {
            const label = lang === 'en' ? s.en : s.bn
            return (
              <li className={styles.railItem} key={s.n}>
                <button
                  type="button"
                  className={`${styles.chip} ${i === active ? styles.active : ''} ${i < active ? styles.done : ''}`}
                  onClick={() => go(i)}
                  aria-current={i === active ? 'step' : undefined}
                  aria-label={`${i + 1}. ${label}`}
                  title={label}
                >
                  <span className={styles.chipNum}>{localizeDigits(s.n, lang)}</span>
                  <span className={styles.chipLabel}>{label}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className={styles.progress} aria-hidden="true">
          {running ? (
            <span
              key={active} /* restart the bar on every slide */
              className={styles.progressFill}
              data-timer="true"
              data-paused={paused}
              style={{ '--delay': `${AUTOPLAY_MS}ms` } as React.CSSProperties}
            />
          ) : (
            <span className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
          )}
        </div>

        {/* Slides: native scroll-snap, so swiping works on touch with no JS */}
        <div
          className={styles.viewport}
          ref={viewportRef}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          onWheel={releaseTarget}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="group"
          aria-live={playing && !paused ? 'off' : 'polite'}
          aria-label={t('Use left and right arrow keys to change step', 'ধাপ পরিবর্তন করতে বাম ও ডান তীর কী ব্যবহার করুন')}
        >
          {steps.map((s, i) => {
            const Icon = iconMap[i] || Coins
            const isActive = i === active
            return (
              <article
                className={styles.slide}
                key={s.n}
                data-active={isActive}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${total}`}
                aria-hidden={!isActive}
              >
                <div className={styles.visual} style={{ '--sdg-background-image': `url("${SDG_BACKGROUND_IMAGES[s.n] || SDG_BACKGROUND_IMAGES['1']}")` } as React.CSSProperties}>
                  <span className={styles.ghostNum} aria-hidden="true">{localizeDigits(s.n, lang)}</span>
                  <div className={styles.iconTile}><Icon size={44} aria-hidden="true" /></div>
                </div>
                <div className={styles.copy}>
                  <h3 className={styles.title}>{lang === 'en' ? s.en : s.bn}</h3>
                  <p className="hidden sm:inline">{lang === 'en' ? s.enText : s.bnText}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button type="button" className={`${styles.navBtn} ${styles.prev}`} onClick={() => go(active - 1)} disabled={active === 0} aria-label={t('Previous step', 'পূর্ববর্তী ধাপ')}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{t('Previous', 'পূর্ববর্তী')}</span>
          </button>

          <div className={styles.dots}>
            {total > 1 && (
              <button
                type="button"
                className={styles.playBtn}
                onClick={() => setPlaying(p => !p)}
                aria-pressed={!playing}
                aria-label={playing ? t('Pause auto-play', 'স্বয়ংক্রিয় স্লাইড বন্ধ করুন') : t('Start auto-play', 'স্বয়ংক্রিয় স্লাইড চালু করুন')}
              >
                {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
              </button>
            )}
            {steps.map((s, i) => (
              <button
                type="button"
                className={styles.dot}
                key={s.n}
                onClick={() => go(i)}
                aria-current={i === active ? 'true' : undefined}
                aria-label={`${t('Go to step', 'ধাপে যান')} ${num(i + 1)}`}
              />
            ))}
          </div>

          <button type="button" className={`${styles.navBtn} ${styles.primary} ${styles.next}`} onClick={() => go(active + 1)} disabled={active === total - 1} aria-label={t('Next step', 'পরবর্তী ধাপ')}>
            <span>{t('Next', 'পরবর্তী')}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}