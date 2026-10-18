'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listContent } from '@/lib/api/siteContent'
import { COMPONENTS, type ContentComponent, type ContentRecord } from '@/lib/cms/components'
import { AdminErrorState, PageLoading, SectionToolbar, useAdminFetch } from '../_components/AdminCommon'
import { ContentEditor } from '../_components/ContentEditor'

const MANAGED: ContentComponent[] = ['project', 'news', 'enterprise', 'partner-agency', 'health-service', 'loan-product', 'notice', 'product', 'team', 'report', 'job', 'success-story']

export default function SiteContentPage() {
  const [component, setComponent] = useState<ContentComponent>('project')
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)
  const { data, setData, loading, error, reload } = useAdminFetch<ContentRecord[]>(() => listContent(component), [component])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)

  useEffect(() => { setSelectedId(null) }, [component])
  const items = useMemo(() => (data ?? []).filter((r) => !deferred.trim() || `${r.slug} ${r.values.title_en} ${r.values.title_bn}`.toLowerCase().includes(deferred.trim().toLowerCase())), [data, deferred])
  const selected = typeof selectedId === 'number' ? data?.find((r) => r.id === selectedId) ?? null : null

  function upsert(record: ContentRecord) { setData((cur) => { const list = cur ?? []; return list.some((r) => r.id === record.id) ? list.map((r) => (r.id === record.id ? record : r)) : [record, ...list] }); setSelectedId(record.id) }

  return <>
    <SectionToolbar
      title="Site Content"
      description="Choose a content component, then add, modify or remove its entries through forms."
      search={search} onSearch={setSearch} searchPlaceholder="Search by title or slug…"
      count={data?.length ?? 0} onRefresh={() => void reload()} refreshing={loading}
      actions={<Button onClick={() => setSelectedId('new')}><CirclePlus size={15} /> Add {COMPONENTS[component].label.toLowerCase()}</Button>}
      filters={<select className="ui-select admin-filter-select" value={component} onChange={(e) => setComponent(e.target.value as ContentComponent)} aria-label="Content component">{MANAGED.map((c) => <option key={c} value={c}>{COMPONENTS[c].plural}</option>)}</select>}
    />
    {loading && !data ? <PageLoading rows={3} /> : error ? <AdminErrorState message={error} onRetry={() => void reload()} /> : (
      <div className="cms-split">
        <aside className="cms-list" aria-label={`${COMPONENTS[component].plural} list`}>
          {items.map((r) => <button key={r.id} type="button" className={`cms-list-item ${selectedId === r.id ? 'active' : ''}`} onClick={() => setSelectedId(r.id)}>
            <strong>{r.values.title_en || r.slug}</strong><small>{r.slug}</small><Badge variant={r.status === 'published' ? 'default' : 'outline'}>{r.status}</Badge>
          </button>)}
          {!items.length && <div className="admin-empty-state">No {COMPONENTS[component].plural.toLowerCase()} found.</div>}
        </aside>
        <section>
          {selectedId === 'new' ? <ContentEditor key="new" component={component} record={null} onSaved={upsert} onDeleted={() => undefined} onClose={() => setSelectedId(null)} />
            : selected ? <ContentEditor key={selected.id} component={component} record={selected} onSaved={upsert} onDeleted={(id) => { setData((cur) => (cur ?? []).filter((r) => r.id !== id)); setSelectedId(null) }} />
            : <div className="admin-empty-state">Select an entry to view or edit it, or add a new {COMPONENTS[component].label.toLowerCase()}.</div>}
        </section>
      </div>
    )}
  </>
}
