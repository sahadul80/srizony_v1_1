'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Reveal from '@/components/containers/Reveal'
import { useTilt } from '@/components/hooks/useTilt'

export default function AnimatedCard({ children, href, className = '', delay = 0, from = 'up', as = 'article' }: {
  children: ReactNode
  href?: string
  className?: string
  delay?: number
  from?: 'up' | 'left' | 'right' | 'zoom'
  as?: 'article' | 'div'
}) {
  const tilt = useTilt(4)
  const cardClass = `sf-card sf-animated-card ${href ? 'sf-card--link' : ''} ${className}`.trim()
  const content = href
    ? <Link href={href} className={cardClass} {...tilt}>{children}</Link>
    : as === 'div'
      ? <div className={cardClass} {...tilt}>{children}</div>
      : <article className={cardClass} {...tilt}>{children}</article>
  return <Reveal delay={delay} from={from}>{content}</Reveal>
}
