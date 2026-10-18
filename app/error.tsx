'use client'

import { AlertTriangle } from 'lucide-react'
import StatePage from '@/components/pages/StatePage'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatePage
    icon={<AlertTriangle size={22} />}
    title="Something went wrong"
    message="The page could not be rendered. Your content is safe; try loading it again."
    actionLabel="Try again"
    onAction={reset}
  />
}
