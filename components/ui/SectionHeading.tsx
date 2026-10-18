import type { Bilingual, Lang } from '@/types/entityType'

/** Shared bilingual heading for CMS-driven content sections. */
export default function SectionHeading({ eyebrow, heading, lead, lang, className = '' }: { eyebrow?: Bilingual; heading?: Bilingual; lead?: Bilingual; lang: Lang; className?: string }) {
  if (!eyebrow && !heading && !lead) return null
  return <header className={`sf-sec-head ${className}`.trim()}>
    {eyebrow && <span className="sf-eyebrow">{eyebrow[lang]}</span>}
    {heading && <h2 className="sf-h2">{heading[lang]}</h2>}
    {lead && <p className="sf-lead">{lead[lang]}</p>}
  </header>
}
