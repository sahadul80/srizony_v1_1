import * as React from 'react'
import { cn } from '@/lib/utils'
export const Skeleton=({className,...p}:React.HTMLAttributes<HTMLDivElement>)=><div className={cn('ui-skeleton',className)} {...p}/>
