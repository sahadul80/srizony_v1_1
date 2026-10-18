'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Lang } from '@/types/entityType'
import type { AreaCard } from '@/data/homeContent'
import Illustration from '@/components/home/Illustration'
import SafeImage from '@/components/ui/SafeImage'
import Reveal from '@/components/containers/Reveal'
import { useTilt } from '@/components/hooks/useTilt'

export type ProjectArea = AreaCard

/** Animated SVG development-area card from the original landing-page design. */
export default function ProjectCard({ area, lang, index = 0 }: { area: ProjectArea; lang: Lang; index?: number }) {
  const tilt = useTilt(6)
  return (
    <Reveal delay={index * 90} from="zoom">
      <Link href={area.href} className="sf-area" {...tilt}>
        <span className="sf-area-glow" aria-hidden="true" />
        <div className={`sf-area-art ${area.image ? 'sf-area-art--image' : ''}`}>{area.image ? <SafeImage src={area.image} alt={area.imageAlt?.[lang] || area.title[lang]} fill sizes="(max-width: 700px) 35vw, 130px" className="sf-area-custom-image" /> : <Illustration kind="area" icon={area.icon} />}</div>
        <h3 className="sf-h3">{area.title[lang]}</h3>
        <span className="sf-area-go" aria-hidden="true"><ArrowRight size={18} /></span>
        <p className="sf-area-hint">{area.body[lang]}</p>
        {area.chips?.length ? <ul className="sf-area-chips" aria-label={area.title[lang]}>{area.chips.map((chip, chipIndex) => <li key={chipIndex}>{chip[lang]}</li>)}</ul> : null}
      </Link>
    </Reveal>
  )
}
