'use client'

import type { ReactNode } from 'react'
import Button from '@/components/ui/ActionButton'

type StatePageProps = {
  label?: ReactNode
  icon?: ReactNode
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

/** Shared empty/error state used by route fallbacks and CMS loading failures. */
export default function StatePage({ label, icon, title, message, actionLabel, actionHref, onAction }: StatePageProps) {
  return <main className="page-state container"><div className="state-card">
    {icon && <div className="state-icon">{icon}</div>}
    {label && <span className="eyebrow">{label}</span>}
    <h1>{title}</h1>
    <p>{message}</p>
    {actionLabel && onAction && <Button onClick={onAction}><span>{actionLabel}</span></Button>}
    {actionLabel && !onAction && actionHref && <Button href={actionHref}><span>{actionLabel}</span></Button>}
  </div></main>
}
