import * as React from 'react'
import { cn } from '@/lib/utils'

export function Button({ className, variant='default', size='default', type='button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'outline'|'ghost'|'destructive'; size?: 'default'|'sm'|'lg'|'icon' }) {
  return <button type={type} className={cn('ui-button', `ui-button-${variant}`, `ui-button-${size}`, className)} {...props} />
}
