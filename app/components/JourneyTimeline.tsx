'use client'

/**
 * Connected journey timeline. Every milestone owns its node, connector and
 * story card, so the illustrated track cannot drift away from its events.
 */

import { ChevronLeft, ChevronRight, Gavel, HeartPulse, Network, Pause, Play, Star, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type CSSProperties } from 'react'
import { useSite } from './SiteProvider'
import { localizeDigits } from '../../lib/utils'
import s from '../css_extra/JourneyTimeline.module.css'

type Bi = { en: string; bn: string }
export type JourneyItem = { year: string; title: Bi; body: Bi; details?: Bi[] }

const END_YEAR = 2026
const ICONS: LucideIcon[] = [Star, Gavel, HeartPulse, Network]
const AUTOPLAY_MS = 4500

const numericYear = (year: string) => {
  const n = Number.parseInt(year, 10)
  return Number.isFinite(n) ? n : END_YEAR
}

export default function JourneyTimeline({ heading, items }: { heading?: Bi; items: JourneyItem[] }) {
  const { lang } = useSite()
  const t = (value?: Bi) => localizeDigits(value?.[lang] || value?.en || value?.bn || '', lang)
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn)

  const milestones = useMemo(
    () => items
      .map((item, originalIndex) => ({ ...item, value: numericYear(item.year), Icon: ICONS[originalIndex % ICONS.length], originalIndex }))
      .sort((a, b) => a.value - b.value || a.originalIndex - b.originalIndex),
    [items],
  )

  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [reduced, setReduced] = useState(false)
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([])
  const eventRefs = useRef<Array<HTMLLIElement | null>>([])
  const railRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setActiveIndex(index => Math.min(index, Math.max(milestones.length - 1, 0)))
    nodeRefs.current = nodeRefs.current.slice(0, milestones.length)
    eventRefs.current = eventRefs.current.slice(0, milestones.length)
  }, [milestones.length])

  useEffect(() => {
    if (!playing || reduced || milestones.length < 2) return
    const id = window.setInterval(() => setActiveIndex(index => (index + 1) % milestones.length), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [playing, reduced, milestones.length])

  const selectedIndex = Math.min(activeIndex, Math.max(milestones.length - 1, 0))

  useEffect(() => {
    const rail = railRef.current
    const event = eventRefs.current[selectedIndex]
    if (!rail || !event || !window.matchMedia('(max-width: 520px)').matches) return
    const railBox = rail.getBoundingClientRect()
    const eventBox = event.getBoundingClientRect()
    const nextLeft = rail.scrollLeft + eventBox.left - railBox.left - (rail.clientWidth - event.clientWidth) / 2
    rail.scrollTo({ left: Math.max(0, nextLeft), behavior: reduced ? 'auto' : 'smooth' })
  }, [selectedIndex, reduced, milestones.length])

  if (!milestones.length) return null

  const active = milestones[selectedIndex]
  const label = (m: { year: string }) => m.year.trim().toLowerCase() === 'today'
    ? (lang === 'bn' ? 'আজ' : 'Today')
    : localizeDigits(m.year, lang)
  const shortTitle = (value: Bi) => t(value)

  const select = (index: number) => {
    setPlaying(false)
    setActiveIndex(Math.max(0, Math.min(milestones.length - 1, index)))
  }
  const prev = () => select(selectedIndex - 1)
  const next = () => select(selectedIndex + 1)
  const onKey = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      select(Math.min(milestones.length - 1, index + 1))
      nodeRefs.current[Math.min(milestones.length - 1, index + 1)]?.focus()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      select(Math.max(0, index - 1))
      nodeRefs.current[Math.max(0, index - 1)]?.focus()
    }
  }

  return (
    <div className={s.root}>
      <div
        ref={railRef}
        className={s.rail}
        role="region"
        aria-label={heading ? t(heading) : tr('Our journey timeline', 'আমাদের পথচলার সময়রেখা')}
        tabIndex={0}
      >
        <ol className={s.events}>
          {milestones.map((m, index) => {
            const isActive = selectedIndex === index
            const Icon = m.Icon
            const title = shortTitle(m.title)
            const body = t(m.body)
            return (
              <li ref={element => { eventRefs.current[index] = element }} className={`${s.event} ${index < selectedIndex ? s.eventDone : ''} ${isActive ? s.eventActive : ''}`} key={`${m.year}-${m.originalIndex}`}>
                <div className={s.nodeWrap}>
                  <button
                    ref={element => { nodeRefs.current[index] = element }}
                    type="button"
                    className={`${s.node} ${isActive ? s.nodeOn : index < selectedIndex ? s.nodeDone : ''}`}
                    onClick={() => select(index)}
                    onKeyDown={onKey(index)}
                    aria-label={`${label(m)} — ${title}`}
                    aria-pressed={isActive}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className={s.nodeYear}>{label(m)}</span>
                    <span className={s.nodeDot} aria-hidden="true"><span /></span>
                  </button>
                </div>
                <span className={`${s.connector} ${isActive ? s.connectorOn : ''}`} aria-hidden="true" />
                <article className={s.eventCard}>
                  <header className={s.cardHead}>
                    <span className={s.cardIcon} aria-hidden="true"><Icon size={18} /></span>
                    <div className={s.cardCopy}>
                      <span className={s.cardStep}>{tr('Milestone', 'মাইলফলক')} {localizeDigits(String(index + 1).padStart(2, '0'), lang)}</span>
                      <h3 className={s.cardTitle}>{title}</h3>
                    </div>
                  </header>
                  {body && <p className={`s.cardBody hidden sm:inline`}>{body}</p>}
                  {!!m.details?.length && (
                    <ul className={s.chips}>
                      {m.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className={s.chip}>{t(detail)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            )
          })}
        </ol>
      </div>

      <div className={s.summary} aria-live="polite">
        <div className={s.stat}>
          <span className={s.statLabel}>{tr('Selected year', 'নির্বাচিত বছর')}</span>
          <span className={s.statValue}>{label(active)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>{tr('Current focus', 'বর্তমান ফোকাস')}</span>
          <span className={`${s.statValue} ${s.statAccent}`}>{shortTitle(active.title)}</span>
        </div>
      </div>

      <div className={s.controls}>
        <div className={s.controlsTop}>
          <span className={s.controlsLabel}>{tr('Timeline controls', 'সময়রেখা নিয়ন্ত্রণ')}</span>
          {!reduced && milestones.length > 1 && (
            <button
              type="button"
              className={`${s.play} ${playing ? s.playOn : ''}`}
              onClick={() => setPlaying(value => !value)}
              aria-pressed={playing}
              aria-label={playing ? tr('Pause automatic play', 'স্বয়ংক্রিয় চলা থামান') : tr('Start automatic play', 'স্বয়ংক্রিয় চলা শুরু করুন')}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
              <span>{playing ? tr('Playing', 'চলছে') : tr('Auto-play', 'অটো-প্লে')}</span>
            </button>
          )}
        </div>
        <div className={s.scrub}>
          <button type="button" className={s.step} onClick={prev} disabled={selectedIndex <= 0} aria-label={tr('Previous milestone', 'আগের মাইলফলক')}>
            <ChevronLeft size={17} />
          </button>
          <input
            className={s.range}
            type="range"
            min={0}
            max={Math.max(milestones.length - 1, 0)}
            step={1}
            value={selectedIndex}
            onChange={event => select(Number(event.currentTarget.value))}
            aria-label={tr('Select a milestone', 'একটি মাইলফলক নির্বাচন করুন')}
            style={{ '--pos': `${milestones.length < 2 ? 0 : (selectedIndex / (milestones.length - 1)) * 100}%` } as CSSProperties}
          />
          <button type="button" className={s.step} onClick={next} disabled={selectedIndex >= milestones.length - 1} aria-label={tr('Next milestone', 'পরবর্তী মাইলফলক')}>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
