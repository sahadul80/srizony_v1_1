'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useInView } from '@/components/hooks/useInView'

export default function Reveal({ children, delay = 0, from = 'up', className = '' }: {
  children: ReactNode
  delay?: number
  from?: 'up' | 'left' | 'right' | 'zoom'
  className?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15)
  return <div ref={ref} className={`sf-reveal sf-reveal--${from} ${inView ? 'is-in' : ''} ${className}`.trim()} style={{ '--d': `${delay}ms` } as CSSProperties}>{children}</div>
}
