'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Runs an async loader from /lib/api and tracks loading/error state. `deps` re-triggers the load. */
export function useAdminFetch<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const runId = useRef(0)

  const reload = useCallback(async () => {
    const id = ++runId.current
    setLoading(true)
    setError('')
    try {
      const result = await loaderRef.current()
      if (id === runId.current) setData(result)
    } catch (cause) {
      if (id === runId.current) setError(cause instanceof Error ? cause.message : 'Unable to load data.')
    } finally {
      if (id === runId.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { void reload(); return () => { runId.current++ } }, [reload])

  return { data, setData, loading, error, reload }
}

export function SectionToolbar({
  title,
  description,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  count,
  onRefresh,
  refreshing = false,
  actions,
  filters,
}: {
  title: string
  description?: string
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  count?: number
  onRefresh?: () => void
  refreshing?: boolean
  actions?: ReactNode
  filters?: ReactNode
}) {
  return (
    <section className="admin-toolbar-panel">
      <div className="admin-toolbar-primary">
        <div className="admin-toolbar-copy">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="admin-toolbar-primary-actions">
          {count !== undefined && <span className="admin-toolbar-count">{count.toLocaleString()} records</span>}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
              <RefreshCw size={14} className={refreshing ? 'admin-spin' : ''} />
              <span className="admin-refresh-label">Refresh</span>
            </Button>
          )}
          {actions}
        </div>
      </div>
      {(onSearch || filters) && (
        <div className="admin-toolbar-search">
          {onSearch && (
            <input
              className="ui-input admin-search-field"
              value={search ?? ''}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder.replace(/…$/, '')}
            />
          )}
          {filters}
        </div>
      )}
    </section>
  )
}

export function PageLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-loading-grid" aria-label="Loading" role="status">
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div key={index} className="ui-card ui-skeleton admin-loading-card" />
      ))}
    </div>
  )
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section className="admin-error-state" role="alert">
      <strong>Unable to load this section.</strong>
      <p>{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </section>
  )
}
