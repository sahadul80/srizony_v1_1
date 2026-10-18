import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'accent' | 'ghost' | 'outline' | 'outline-light'
  className?: string
  external?: boolean
  action?: 'route' | 'external' | 'anchor'
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  disabled?: boolean
  ariaLabel?: string
  animated?: boolean
}

/** Shared action button; renders a button, internal route, or external anchor as appropriate. */
export default function Button({ children, href, variant = 'primary', className = '', external = false, action, onClick, type = 'button', disabled, ariaLabel, animated = false }: ButtonProps) {
  const classes = `sf-btn sf-btn--${variant} ${animated ? 'sf-btn--animated' : ''} ${className}`.trim()
  if (href && (external || action === 'external' || /^(https?:)?\/\//.test(href) || /^(mailto:|tel:)/.test(href))) {
    return <a href={href} className={classes} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} aria-label={ariaLabel}>{children}</a>
  }
  if (href && action === 'anchor') return <a href={href} className={classes} aria-label={ariaLabel}>{children}</a>
  if (href) return <Link href={href} className={classes} aria-label={ariaLabel}>{children}</Link>
  return <button type={type} className={classes} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>
}
