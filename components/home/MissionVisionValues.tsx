'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { STORY, STORY_INTRO } from '@/data/homeContent'
import { localizeDigits } from '@/lib/utils'
import type { Lang, PageData } from '@/types/entityType'
import Illustration from '@/components/home/Illustration'
import HomeSectionActions from '@/components/home/HomeSectionActions'


/**
 * Pinned, scroll-driven sequence. The wrapper is N screens tall; the stage inside is sticky.
 * Scrolling advances the active step, and each step slides in from below while the previous
 * one slides up and fades. Dots / rail items jump to a step.
 */
type MissionSection = Extract<PageData['sections'][number], { type: 'cards' }>
const normalizeHeading = (value?: string) => (value ?? '').trim().toLocaleLowerCase().replace(/[\s_-]+/g, ' ')

export default function MissionVisionValues({ lang, page }: { lang: Lang; page: PageData }) {
  const source = page.sections.find((item): item is MissionSection => item.type === 'cards' && (item.homeComponent === 'missionVisionValues' || normalizeHeading(item.heading?.en) === 'mission, vision & values'))
  const sourceItems = Array.isArray(source?.items) ? source.items : []
  const steps = source ? sourceItems.map((item, i) => ({
    ...STORY[i % STORY.length],
    stepKey: `cms-step-${i}`,
    illustration: item.illustration,
    kicker: item.title ?? STORY[i % STORY.length].kicker,
    body: item.body ?? STORY[i % STORY.length].body,
    chips: Array.isArray(item.chips) ? item.chips : item.tag ? [item.tag] : STORY[i % STORY.length].chips,
  })) : STORY.map((step, i) => ({ ...step, stepKey: step.id, illustration: undefined }))
  const intro = { eyebrow: source?.eyebrow ?? STORY_INTRO.eyebrow, title: source?.heading ?? STORY_INTRO.title }
  const wrapRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState(false)
  const count = Math.max(steps.length, 1)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = wrapRef.current
      const stage = stageRef.current
      if (!el || !stage) return
      const stick = parseFloat(getComputedStyle(stage).top) || 0
      const stageH = stage.offsetHeight || window.innerHeight - stick
      const r = el.getBoundingClientRect()
      const p = Math.min(Math.max((stick - r.top) / stageH, 0), count - 1)
      el.style.setProperty('--sp', p.toFixed(3))
      setIndex(Math.round(p))
      if (r.top < window.innerHeight * 0.6) setSeen(true)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [count])

  const jumpTo = useCallback((i: number) => {
    const el = wrapRef.current
    const stage = stageRef.current
    if (!el || !stage) return
    const stick = parseFloat(getComputedStyle(stage).top) || 0
    const stageH = stage.offsetHeight
    const top = window.scrollY + el.getBoundingClientRect().top - stick + i * stageH + 2
    window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [])

  if (source?.visible === false) return null

  return (
    <section className="sf-story" ref={wrapRef} style={{ '--steps': count } as CSSProperties} aria-label={intro.title[lang]}>
      <div ref={stageRef} className={`sf-story-stage ${seen ? 'is-seen' : ''}`} data-step={index}>
        <div className="sf-story-bg" aria-hidden="true">
          <span className="sf-story-blob sf-story-blob--a" />
          <span className="sf-story-blob sf-story-blob--b" />
        </div>

        <div className="sf-container sf-story-inner">
          <header className="sf-story-head">
            <span className="sf-eyebrow">{intro.eyebrow[lang]}</span>
            <h2 className="sf-h2">{intro.title[lang]}</h2>
          </header>

          <div className="sf-story-grid">
            <div className="sf-story-art" aria-hidden="false">
              {steps.map((step, i) => {
                const state = i === index ? 'is-active' : i < index ? 'is-past' : 'is-next'
                return (
                  <div key={step.stepKey} className={`sf-story-panel ${state}`}>
                    {step.illustration ? <Illustration kind="area" icon={step.illustration} /> : <Illustration kind={step.id} label={step.kicker[lang]} />}
                  </div>
                )
              })}
            </div>

            <div className="sf-story-copy" aria-live="polite">
              {steps.map((step, i) => {
                const state = i === index ? 'is-active' : i < index ? 'is-past' : 'is-next'
                return (
                  <div key={step.stepKey} className={`sf-story-text ${state}`} aria-hidden={i !== index}>
                    <span className="sf-story-num">{localizeDigits(`0${i + 1}`, lang)}</span>
                    <h3 className="sf-h2 sf-story-title">{step.kicker[lang]}</h3>
                    <p className="sf-story-body">{step.body[lang]}</p>
                    <ul className="sf-story-chips">
                      {step.chips.map((c, j) => (
                        <li key={j} style={{ '--i': j } as CSSProperties}>{c[lang]}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            <nav className="sf-story-rail" aria-label={intro.title[lang]}>
              {steps.map((step, i) => (
                <button
                  key={step.stepKey}
                  type="button"
                  className={i === index ? 'is-on' : i < index ? 'is-done' : ''}
                  onClick={() => jumpTo(i)}
                  aria-label={step.kicker[lang]}
                  aria-current={i === index ? 'step' : undefined}
                >
                  <span className="sf-rail-dot" />
                  <span className="sf-rail-label">{step.kicker[lang]}</span>
                </button>
              ))}
              <span className="sf-rail-line" aria-hidden="true">
                <i style={{ transform: `scaleY(calc(var(--sp, 0) / ${count - 1}))` }} />
              </span>
            </nav>
          </div>

          <div className={`sf-story-hint ${index === count - 1 ? 'is-hidden' : ''}`} aria-hidden="true">
            <span>{(source as any)?.scrollHint?.[lang] || STORY_INTRO.hint[lang]}</span>
            <ChevronDown size={18} />
          </div>
        </div>
      </div>
      <HomeSectionActions section={source} lang={lang} />
    </section>
  )
}
