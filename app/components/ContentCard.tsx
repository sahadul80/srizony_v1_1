'use client'
import Link from 'next/link'
import Image from 'next/image'
import cx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { LoanIllustration } from '../../packages/react-undraw-illustrations/src'
import { MediaImage } from './Media'
import Icon from './Icon'
import { useSite } from './SiteProvider'
import { fallbackCardImage } from '../../data/landingImages'
import type { ContentCardItem, MediaItem, Bilingual } from '../../types/entityType'
import s from '../css_extra/ContentCard.module.css'

type LooseCard = ContentCardItem & Record<string, unknown>

function localized(value: unknown, lang: 'en' | 'bn'): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(part => localized(part, lang)).filter(Boolean).join(' ').trim()
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const preferred = record[lang]
  const fallback = record.en || record.bn
  return (typeof preferred === 'string' && preferred.trim() ? preferred : typeof fallback === 'string' ? fallback : '').trim()
}

function normalizeMedia(raw: unknown, title: Bilingual): MediaItem | undefined {
  if (typeof raw === 'string') {
    const src = raw.trim()
    return src ? { src, alt: title } : undefined
  }
  if (!raw || typeof raw !== 'object') return undefined
  const record = raw as Record<string, unknown>
  const srcValue = record.src || record.url || record.source || record.path || record.imageUrl || record.image_url || record.imageSrc || record.image_src
  const src = typeof srcValue === 'string' ? srcValue.trim() : ''
  if (!src) return undefined
  const rawAlt = record.alt ?? record.altText ?? record.alt_text
  const alt: Bilingual = typeof rawAlt === 'string'
    ? { en: rawAlt || title.en, bn: rawAlt || title.bn }
    : { en: localized(rawAlt, 'en') || title.en, bn: localized(rawAlt, 'bn') || title.bn }
  const rawCaption = record.caption
  const caption = rawCaption ? { en: localized(rawCaption, 'en'), bn: localized(rawCaption, 'bn') } : undefined
  const hoverSrc = typeof record.hoverSrc === 'string' ? record.hoverSrc : typeof record.hover_src === 'string' ? record.hover_src : undefined
  return { src, alt, caption, hoverSrc, kind: 'image' }
}

export default function ContentCard({ item, titleOnly = false, mobileTitleOnly = false, horizontalFeature = false, iconOnly = false }: { item: ContentCardItem; titleOnly?: boolean; mobileTitleOnly?: boolean; horizontalFeature?: boolean; iconOnly?: boolean }) {
  const { lang, site } = useSite()
  const loose = item as unknown as LooseCard
  const title: Bilingual = {
    en: localized(item.title, 'en') || localized(loose.title_en, 'en') || localized(loose.titleEn, 'en'),
    bn: localized(item.title, 'bn') || localized(loose.title_bn, 'bn') || localized(loose.titleBn, 'bn'),
  }
  title.en = title.en || title.bn
  title.bn = title.bn || title.en
  const titleText = localized(item.title, lang) || title[lang] || title.en || title.bn
  const cardHref = typeof item.href === 'string' ? item.href : typeof loose.url === 'string' ? loose.url : typeof loose.link === 'string' ? loose.link : undefined
  // CMS revisions have used body, summary, excerpt and description for card copy.
  // Read them in priority order so existing copy is not silently discarded.
  const bodyText = localized(item.body, lang)
    || localized(loose.summary, lang)
    || localized(loose.excerpt, lang)
    || localized(loose.description, lang)
    || localized(loose.body_en, lang)
    || localized(loose.body_bn, lang)
    || localized(loose.summary_en, lang)
    || localized(loose.summary_bn, lang)
    || localized(loose.excerpt_en, lang)
    || localized(loose.excerpt_bn, lang)
    || localized(loose.description_en, lang)
    || localized(loose.description_bn, lang)

  const imageCandidates = [loose.image, loose.media, loose.photo, loose.coverImage, loose.cover_image, loose.imageSrc, loose.image_src, loose.image_url, loose.imageUrl]
  const suppliedImage = imageCandidates.map(candidate => normalizeMedia(candidate, title)).find((candidate): candidate is MediaItem => Boolean(candidate))
  // Preserve editor-supplied images. For any other photo card, pick a relevant
  // existing project image instead of rendering an empty media area. On small
  // screens the compact impact variant hides only this extra photo (see CSS).
  const cardImage = iconOnly ? undefined : suppliedImage || (!item.illustration
    ? { src: fallbackCardImage(title, cardHref), alt: title, kind: 'image' as const }
    : undefined)

  const variant = iconOnly ? 'icon' : cardImage ? 'media' : item.illustration ? 'illustration' : item.icon ? 'icon' : 'plain'
  const hasMedia = variant === 'media' || variant === 'illustration'
  const variantClass = { media: s.vMedia, illustration: s.vIllustration, icon: s.vIcon, plain: s.vPlain }[variant]
  const moreLabel = site?.global.ui[lang].learnMore || (lang === 'en' ? 'Learn More' : 'বিস্তারিত')

  const rawTag = item.tag ?? (loose.tag_en || loose.tag_bn ? { en: loose.tag_en, bn: loose.tag_bn } : loose.category)
  const tagText = localized(rawTag, lang)
  const tag = tagText ? (
    <span className={hasMedia ? `${s.tag} ${s.tagOver}` : s.tag}>{tagText}</span>
  ) : null

  const impactAssetFor = () => {
    if (!iconOnly) return ''
    const slug = (cardHref || '').split(/[?#]/, 1)[0].split('/').filter(Boolean).pop()?.toLowerCase() || ''
    const assets: Record<string, string> = {
      'microfinance-program': '/images/projects/micro-finance-program.svg',
      'health-program': '/images/projects/urban-primary-health-care.svg',
      'education-program': '/images/projects/second-chance-education.svg',
      'human-rights': '/images/projects/human-rights-and-good-governance.svg',
      'climate-change': '/images/projects/social-afforestation.svg',
      'organizational-development': '/images/projects/srizony-development-center.svg',
    }
    return assets[slug] || ''
  }
  const impactAsset = impactAssetFor()
  const iconNode = (iconOnly || item.icon) ? (
    <div className={cx(s.icon, horizontalFeature && s.featureIcon, iconOnly && s.featureSvgIcon)} aria-hidden="true">
      {impactAsset ? <Image src={impactAsset} alt="" width={28} height={28} /> : item.icon ? <Icon name={item.icon} size={horizontalFeature ? 22 : 22} /> : null}
    </div>
  ) : null

  const titleNode = <h3 className={cx(s.title, horizontalFeature && s.featureTitle)}>{titleText}</h3>

  const inner = (
    <>
      {hasMedia && (
        <div className={s.media}>
          {cardImage && variant === 'media' && <MediaImage item={cardImage} className={`media-image ${s.mediaFill}`} />}
          {!cardImage && item.illustration && (
            <div className={s.illus}>
              <LoanIllustration name={item.illustration} className="loan-illustration" />
            </div>
          )}
          {tag}
        </div>
      )}

      <div className={cx(s.content, horizontalFeature && s.horizontalContent)}>
        {!hasMedia && tag}
        {horizontalFeature ? (
          <div className={s.featureRow}>
            {iconNode}
            {titleNode}
          </div>
        ) : (
          <>
            {!cardImage && !item.illustration && item.icon && iconNode}
            {titleNode}
          </>
        )}
        {!titleOnly && bodyText && <p className={s.body}>{bodyText}</p>}
        {!titleOnly && cardHref && bodyText && (
          <span className={s.more}>
            <span className={s.moreLabel}>{moreLabel}</span>
            <span className={s.moreArrow}>
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </span>
        )}
      </div>
    </>
  )

  const className = cx(s.card, variantClass, s.mobileDescriptionHidden, mobileTitleOnly && s.mobileTitleOnly, horizontalFeature && s.horizontalFeature, iconOnly && s.iconOnly)
  return cardHref ? (
    <Link href={cardHref} className={cx(className, s.link)}>{inner}</Link>
  ) : (
    <article className={className}>{inner}</article>
  )
}
