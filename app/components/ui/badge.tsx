import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'outline'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export const Badge = ({
  className,
  variant = 'default',
  ...props
}: BadgeProps) => (
  <span
    className={cn(
      'ui-badge',
      variant === 'outline' && 'ui-badge-outline',
      className,
    )}
    {...props}
  />
)
