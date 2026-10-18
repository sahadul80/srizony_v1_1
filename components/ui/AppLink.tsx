import Link from 'next/link'
import type { ReactNode } from 'react'

export function isExternalLink(href: string) {
  return /^(https?:)?\/\//.test(href) || /^(mailto:|tel:)/.test(href)
}

export default function AppLink({ href, className, children, target, rel }: { href: string; className?: string; children: ReactNode; target?: string; rel?: string }) {
  if (isExternalLink(href)) return <a href={href} className={className} target={target ?? (href.startsWith('http') ? '_blank' : undefined)} rel={rel ?? (href.startsWith('http') ? 'noopener noreferrer' : undefined)}>{children}</a>
  return <Link href={href} className={className}>{children}</Link>
}
