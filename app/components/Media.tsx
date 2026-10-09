'use client'
import React from 'react'
import SafeImage from './SafeImage'
import Link from 'next/link'
import { Play, ArrowUpRight } from 'lucide-react'
import type { MediaItem } from '../../types/entityType'
import { useSite } from './SiteProvider'
import { fallbackCardImage } from '../../data/landingImages'
import { localizeDigits } from '../../lib/utils'
import styles from '../css_extra/MediaComponents.module.css'

/* Keeps the global `.media-image` layout (card-header sizing used across pages)
   and adds hover zoom + caption scrim from the module. */
export function MediaImage({ item, className = 'media-image' }: { item: MediaItem; className?: string }) {
  const { lang } = useSite()
  return (
    <figure className={`${className} ${styles.media}`}>
      <SafeImage src={item.src} fallbackSrc={fallbackCardImage(item.alt, item.src)} alt={item.alt[lang]} fallbackTitle={item.alt[lang]} fill sizes="(max-width: 900px) 100vw, 50vw" />
      {item.caption && <div className={styles.scrim} aria-hidden="true" />}
      {item.caption && <figcaption className={styles.caption}>{localizeDigits(item.caption[lang], lang)}</figcaption>}
    </figure>
  )
}

export function LinkedMedia({ item, href, title }: { item: MediaItem; href?: string; title?: string }) {
  if (!href) return <MediaImage item={item} />
  return (
    <Link href={href} className={styles.linked} aria-label={title || item.alt.en}>
      <MediaImage item={item} />
      <span className={styles.linkIcon} aria-hidden="true"><ArrowUpRight size={18} /></span>
    </Link>
  )
}

export function VideoBlock({ poster, embedUrl, sourceUrl, heading, body }: { poster: string; embedUrl?: string; sourceUrl?: string; heading?: string; body?: string }) {
  const { lang, site } = useSite()
  const ui = site!.global.ui
  const [loaded, setLoaded] = React.useState(false) // load the player only after a click

  const title = heading || 'Srizony video'
  const playLabel = `${ui[lang].play}: ${title}`
  const embedSrc = embedUrl ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1` : ''

  const posterImage = (
    <>
      <SafeImage src={poster} alt={heading || 'Video poster'} fallbackTitle={heading || 'Video poster'} fill sizes="(max-width: 900px) 100vw, 70vw" />
      <span className={styles.facadeScrim} aria-hidden="true" />
    </>
  )
  const playCue = (
    <>
      <span className={styles.playBtn} aria-hidden="true"><Play fill="currentColor" size={28} /></span>
      <span className={styles.play} aria-hidden="true">{ui[lang].play}</span>
    </>
  )

  return (
    <div className={styles.video}>
      <div className={styles.stage}>
        {embedUrl ? (
          loaded ? (
            <iframe
              src={embedSrc}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button type="button" className={styles.facade} onClick={() => setLoaded(true)} aria-label={playLabel}>
              {posterImage}
              {playCue}
            </button>
          )
        ) : sourceUrl ? (
          <a className={styles.facade} href={sourceUrl} target="_blank" rel="noreferrer" aria-label={playLabel}>
            {posterImage}
            {playCue}
          </a>
        ) : (
          <div className={styles.facade}>{posterImage}</div>
        )}
      </div>

      {(body || sourceUrl) && (
        <div className={styles.meta}>
          {body && <p className={styles.videoCaption}>{localizeDigits(body, lang)}</p>}
          {sourceUrl && (
            <a className={styles.source} href={sourceUrl} target="_blank" rel="noreferrer">
              {ui[lang].source}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}