import type { ReactNode } from 'react'
import AppLink from '@/components/ui/AppLink'

type LinkAction = 'route' | 'external' | 'anchor'

export default function ConfiguredLink({ href, action, className, children }: { href: string; action?: LinkAction; className?: string; children: ReactNode }) {
  if (action === 'external') return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>
  if (action === 'anchor') return <a href={href} className={className}>{children}</a>
  return <AppLink href={href} className={className}>{children}</AppLink>
}
