import type { Section } from '@/types/entityType'
import PageSection from '@/components/pages/PageSection'

/** CMS-driven section list. Every section's UI lives in its own component file. */
export default function SectionRenderer({ sections }: { sections: Section[] }) {
  return <>{sections.map((section, index) => <PageSection key={`${section.type}-${index}`} section={section} />)}</>
}
