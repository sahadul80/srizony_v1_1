'use client'

import { ArrowRight } from 'lucide-react'
import ConfiguredLink from '@/components/ui/ConfiguredLink'
import type { Lang, PageSection } from '@/types/entityType'

/** Renders the same CMS-managed button configuration for the custom homepage modules. */
export default function HomeSectionActions({ section, lang }: { section?: PageSection; lang: Lang }) {
  const config = section?.buttonConfig
  if (!config?.visible) return null
  const primaryVisible = config.mode === 'primary' || config.mode === 'both'
  const secondaryVisible = config.mode === 'secondary' || config.mode === 'both'
  const primaryLabel = config.label?.[lang]
  const secondaryLabel = (config.secondaryLabel ?? config.label)?.[lang]
  return <div className="sf-cta-actions sf-home-section-actions">
    {primaryVisible && primaryLabel && config.href && <ConfiguredLink href={config.href} action={config.action} className="sf-btn sf-btn--primary">
      {primaryLabel} <ArrowRight size={16} aria-hidden="true" />
    </ConfiguredLink>}
    {secondaryVisible && secondaryLabel && (config.secondaryHref ?? config.href) && <ConfiguredLink href={config.secondaryHref ?? config.href} action={config.secondaryAction ?? config.action} className="sf-btn sf-btn--outline">
      {secondaryLabel} <ArrowRight size={16} aria-hidden="true" />
    </ConfiguredLink>}
  </div>
}
