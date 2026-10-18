'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import type { Lang, Section } from '@/types/entityType'
import SafeImage from '@/components/ui/SafeImage'
import SectionHeading from '@/components/ui/SectionHeading'

type VideoSectionData = Extract<Section, { type: 'video' }>

export default function VideoPlayer({ section, lang }: { section: VideoSectionData; lang: Lang }) {
  const [playing, setPlaying] = useState(false)
  const source = section.embedUrl ? `${section.embedUrl}${section.embedUrl.includes('?') ? '&' : '?'}autoplay=1` : null
  return (
    <section className="sf-block">
      <SectionHeading heading={section.heading} lead={section.body} lang={lang} />
      <div className="sf-video">
        {playing && source ? <iframe src={source} title={section.heading?.[lang] || 'Video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <>
          <SafeImage src={section.poster} alt="" fill sizes="(max-width: 900px) 100vw, 800px" className="sf-cover" />
          {source ? <button type="button" className="sf-video-play" onClick={() => setPlaying(true)} aria-label={lang === 'en' ? 'Play video' : 'ভিডিও চালান'}><Play size={28} /></button> : section.sourceUrl ? <a className="sf-video-play" href={section.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={lang === 'en' ? 'Open video' : 'ভিডিও খুলুন'}><Play size={28} /></a> : null}
        </>}
      </div>
    </section>
  )
}
