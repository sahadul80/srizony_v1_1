'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CirclePlus, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addMenu, getNavigation, modifyMenu, removeMenu, renameNavigationGroup, saveMenuOrder, type NavGroup, type NavNode } from '@/lib/api/navigation'
import type { Section } from '@/types/entityType'
import type { MenuType, SectionButtonType } from '@/lib/api/navigation'
import { AdminErrorState, PageLoading, SectionToolbar, useAdminFetch } from '../_components/AdminCommon'

const MAX_DEPTH = 3
type Zone = 'before' | 'after' | 'inside'
const RENDERED_COMPONENTS: Section['type'][] = ['richText', 'stats', 'cards', 'gallery', 'timeline', 'diagram', 'table', 'video', 'cta', 'noticeList', 'contact', 'donation', 'carousel', 'contentFeed', 'reports']
const COMPONENT_DESCRIPTIONS: Partial<Record<Section['type'], string>> = { richText: 'Bilingual text, headings and supporting image.', stats: 'Key figures and metrics.', cards: 'Reusable cards for programs, teams and features.', gallery: 'Image gallery.', timeline: 'Timeline or milestones.', diagram: 'Impact, SDG or governance diagram.', table: 'Structured rows and columns.', video: 'Video and poster.', cta: 'Call-to-action panel.', noticeList: 'Scrolling notices.', contact: 'Contact details and map.', donation: 'Donation form.', carousel: 'Project/news cards or horizontal scroller.', contentFeed: 'Published CMS entries.', reports: 'Downloadable reports.' }
type Editor = { mode: 'create' | 'edit'; parentId: number | null; id?: number; labelEn: string; labelBn: string; slug: string; slugTouched: boolean; renderedComponents: Section['type'][]; menuType: MenuType; sectionCount: number; sectionContentType: Section['type']; sectionButtonType: SectionButtonType }

const slugify = (v: string) => '/' + v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const height = (n: NavNode): number => 1 + Math.max(0, ...n.children.map(height))
function find(nodes: NavNode[], id: number): NavNode | null { for (const n of nodes) { if (n.id === id) return n; const c = find(n.children, id); if (c) return c } return null }
function without(nodes: NavNode[], id: number): NavNode[] { return nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: without(n.children, id) })) }
function depthOf(nodes: NavNode[], id: number, d = 1): number { for (const n of nodes) { if (n.id === id) return d; const c = depthOf(n.children, id, d + 1); if (c) return c } return 0 }
function place(nodes: NavNode[], target: number, zone: Zone, moved: NavNode): NavNode[] {
  const out: NavNode[] = []
  for (const n of nodes) {
    if (n.id === target && zone === 'before') out.push(moved)
    if (n.id === target && zone === 'inside') out.push({ ...n, children: [...n.children, moved] })
    else out.push({ ...n, children: place(n.children, target, zone, moved) })
    if (n.id === target && zone === 'after') out.push(moved)
  }
  return out
}
const toMove = (nodes: NavNode[]): { id: number; children: any[] }[] => nodes.map((n) => ({ id: n.id, children: toMove(n.children) }))

function reorderSibling(nodes: NavNode[], id: number, delta: -1 | 1): { nodes: NavNode[]; changed: boolean } {
  const index = nodes.findIndex((node) => node.id === id)
  if (index >= 0) {
    const target = index + delta
    if (nodes[index].isLandingPage || target < 0 || target >= nodes.length || nodes[target].isLandingPage) return { nodes, changed: false }
    const next = [...nodes]
    ;[next[index], next[target]] = [next[target], next[index]]
    return { nodes: next, changed: true }
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const result = reorderSibling(nodes[index].children, id, delta)
    if (result.changed) {
      const next = [...nodes]
      next[index] = { ...nodes[index], children: result.nodes }
      return { nodes: next, changed: true }
    }
  }
  return { nodes, changed: false }
}

export default function NavigationPage() {
  const { data, setData, loading, error, reload } = useAdminFetch<NavGroup[]>(getNavigation)
  const [groupKey, setGroupKey] = useState('primary')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirm, setConfirm] = useState<NavNode | null>(null)
  const [busy, setBusy] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState<{ id: number; zone: Zone } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [editingGroupTitle, setEditingGroupTitle] = useState(false)
  const [groupTitleEn, setGroupTitleEn] = useState('')
  const [groupTitleBn, setGroupTitleBn] = useState('')

  const group = useMemo(() => data?.find((g) => g.key === groupKey) ?? data?.[0], [data, groupKey])
  useEffect(() => { setGroupTitleEn(group?.labelEn ?? ''); setGroupTitleBn(group?.labelBn ?? ''); setEditingGroupTitle(false) }, [group?.key, group?.labelEn, group?.labelBn])

  async function saveGroupTitle() {
    if (!group) return
    if (!groupTitleEn.trim()) return toast.error('Enter the group title in English.')
    setBusy(true)
    try { await renameNavigationGroup(group.key, groupTitleEn.trim(), groupTitleBn.trim()); toast.success('Navigation group title updated.'); setEditingGroupTitle(false); await reload() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to rename the group.') }
    finally { setBusy(false) }
  }

  async function move(targetId: number | 'root', zone: Zone) {
    if (!group || dragId === null || busy) return
    const dragged = find(group.items, dragId)
    if (!dragged || targetId === dragId || (targetId !== 'root' && find(dragged.children, targetId))) return
    const rest = without(group.items, dragId)
    let next: NavNode[]
    if (targetId === 'root') next = [...rest, dragged]
    else {
      const targetDepth = depthOf(rest, targetId)
      const newDepth = zone === 'inside' ? targetDepth + 1 : targetDepth
      if (newDepth + height(dragged) - 1 > MAX_DEPTH) return toast.error(`Menus can be nested ${MAX_DEPTH} levels deep at most.`)
      next = place(rest, targetId, zone, dragged)
    }
    const previous = data!
    setData(data!.map((g) => (g.key === group.key ? { ...g, items: next } : g)))
    try { await saveMenuOrder(group.key, toMove(next)); toast.success('Navigation order saved.') }
    catch (e) { setData(previous); toast.error(e instanceof Error ? e.message : 'Unable to save the new order.') }
  }

  async function reorderMenu(id: number, delta: -1 | 1) {
    if (!group || !data || busy) return
    const result = reorderSibling(group.items, id, delta)
    if (!result.changed) return

    const previous = data
    const nextItems = result.nodes
    setBusy(true)
    setData(previous.map((item) => item.key === group.key ? { ...item, items: nextItems } : item))
    try {
      await saveMenuOrder(group.key, toMove(nextItems))
      toast.success('Navigation order saved.')
    } catch (e) {
      setData(previous)
      toast.error(e instanceof Error ? e.message : 'Unable to save the new order.')
    } finally {
      setBusy(false)
    }
  }

  function openCreate(parentId: number | null) { setEditorError(''); setEditor({ mode: 'create', parentId, labelEn: '', labelBn: '', slug: '', slugTouched: false, renderedComponents: [...RENDERED_COMPONENTS], menuType: 'page', sectionCount: 1, sectionContentType: 'richText', sectionButtonType: 'none' }) }
  function openEdit(n: NavNode) { setEditorError(''); setEditor({ mode: 'edit', parentId: null, id: n.id, labelEn: n.labelEn, labelBn: n.labelBn, slug: n.slug, slugTouched: true, renderedComponents: n.renderedComponents?.length ? n.renderedComponents : [...RENDERED_COMPONENTS], menuType: n.menuType || 'page', sectionCount: n.sectionCount || 1, sectionContentType: n.sectionContentType || 'richText', sectionButtonType: n.sectionButtonType || 'none' }) }

  async function submit() {
    if (!editor || !group) return
    if (!editor.labelEn.trim()) { const issue = 'Enter the menu name in English.'; setEditorError(issue); return toast.error(issue) }
    if (editor.menuType === 'page' && !editor.renderedComponents.length) { const issue = 'Select at least one rendered component for this page.'; setEditorError(issue); return toast.error(issue) }
    if (editor.menuType === 'external' && !/^https?:\/\//i.test(editor.slug.trim())) { const issue = 'External menu URLs must begin with http:// or https://.'; setEditorError(issue); return toast.error(issue) }
    const input = { labelEn: editor.labelEn.trim(), labelBn: editor.labelBn.trim(), slug: editor.slug || (editor.menuType === 'page' ? slugify(editor.labelEn) : ''), renderedComponents: editor.renderedComponents, menuType: editor.menuType, sectionCount: editor.sectionCount, sectionContentType: editor.sectionContentType, sectionButtonType: editor.sectionButtonType }
    setEditorError('')
    setBusy(true)
    try {
      if (editor.mode === 'create') { await addMenu(group.key, editor.parentId, input); toast.success('Menu added and its page created.') }
      else { await modifyMenu(editor.id!, input); toast.success('Menu and its page updated.') }
      setEditor(null); await reload()
    } catch (e) { const message = e instanceof Error ? e.message : 'Unable to save the menu.'; setEditorError(message); toast.error(message, { description: 'Your form values are still here. Correct the issue and retry.' }) } finally { setBusy(false) }
  }

  async function doRemove() {
    if (!confirm) return
    setBusy(true)
    try { const r = await removeMenu(confirm.id); toast.success(`Removed ${r.menus} menu(s) and ${r.pages} page(s).`); setConfirm(null); await reload() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to remove the menu.') } finally { setBusy(false) }
  }

  const count = (n: NavNode): number => 1 + n.children.reduce((t, c) => t + count(c), 0)

  function Row({ node, depth, siblings, siblingIndex }: { node: NavNode; depth: number; siblings: NavNode[]; siblingIndex: number }) {
    const isOpen = !collapsed.has(node.id)
    const hot = over?.id === node.id ? over.zone : null
    return (
      <div className="nav-node">
        <div
          className={`nav-row ${dragId === node.id ? 'dragging' : ''} ${hot ? `drop-${hot}` : ''}`}
          draggable={!node.isLandingPage && !busy}
          onDragStart={(e) => { if (node.isLandingPage) { e.preventDefault(); return } setDragId(node.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(node.id)) }}
          onDragEnd={() => { setDragId(null); setOver(null) }}
          onDragOver={(e) => {
            if (node.isLandingPage || dragId === null || dragId === node.id) return
            e.preventDefault()
            const box = e.currentTarget.getBoundingClientRect(); const y = (e.clientY - box.top) / box.height
            setOver({ id: node.id, zone: y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside' })
          }}
          onDrop={(e) => { e.preventDefault(); if (node.isLandingPage) { setOver(null); setDragId(null); return } const z = over?.zone ?? 'inside'; setOver(null); void move(node.id, z); setDragId(null) }}
        >
          <span className="nav-grip" aria-hidden><GripVertical size={16} /></span>
          <button type="button" className="nav-toggle" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(node.id)) n.delete(node.id); else n.add(node.id); return n })} aria-label="Toggle submenus">
            {node.children.length ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
          </button>
          <div className="nav-label"><strong>{node.isLandingPage ? 'Home — Landing Page' : node.labelEn}</strong><small><span>{node.labelBn || '—'}</span><code>{node.slug}</code></small></div>
          <div className="nav-chips"><span className="nav-chip">{node.menuType === 'external' ? 'External link' : 'Page'}</span>{node.menuType === 'page' && <><span className="nav-chip">{node.sectionCount} sections</span><span className="nav-chip">{node.sectionContentType}</span><span className="nav-chip">Buttons: {node.sectionButtonType}</span>{node.renderedComponents.map((t) => <span key={t} className="nav-chip">{t}</span>)}</>}</div>
          <div className="nav-actions">
            {node.isLandingPage ? <span className="nav-chip" title="Edit content under Landing Page in the CMS sidebar">Managed in Landing Page</span> : <><Button variant="outline" size="sm" onClick={() => void reorderMenu(node.id, -1)} disabled={busy || siblingIndex === 0 || siblings[siblingIndex - 1]?.isLandingPage === true} title="Move menu up" aria-label={`Move ${node.labelEn} up`}><ArrowUp size={14} /></Button><Button variant="outline" size="sm" onClick={() => void reorderMenu(node.id, 1)} disabled={busy || siblingIndex === siblings.length - 1} title="Move menu down" aria-label={`Move ${node.labelEn} down`}><ArrowDown size={14} /></Button>{depth < MAX_DEPTH && <Button variant="outline" size="sm" onClick={() => openCreate(node.id)} title="Add submenu" aria-label={`Add submenu to ${node.labelEn}`}><CirclePlus size={14} /></Button>}<Button variant="outline" size="sm" onClick={() => openEdit(node)} title="Modify" aria-label={`Modify ${node.labelEn}`}><Pencil size={14} /></Button><Button variant="outline" size="sm" onClick={() => setConfirm(node)} title="Remove" aria-label={`Remove ${node.labelEn}`}><Trash2 size={14} /></Button></>}
          </div>
        </div>
        {isOpen && node.children.length > 0 && <div className="nav-children">{node.children.map((c, index, siblings) => <Row key={c.id} node={c} depth={depth + 1} siblings={siblings} siblingIndex={index} />)}</div>}
      </div>
    )
  }

  return <>
    <SectionToolbar
      title="Site Navigation"
      description="Add, modify, remove and reorder menus. Use the up/down buttons for precise same-level ordering, or drag a menu to reorder it and create submenus."
      count={group ? group.items.reduce((t, n) => t + count(n), 0) : 0}
      onRefresh={() => void reload()} refreshing={loading}
      actions={<Button onClick={() => openCreate(null)} disabled={!group}><CirclePlus size={15} /> Add menu</Button>}
      filters={data && data.length > 1 ? <select className="ui-select admin-filter-select" value={group?.key} onChange={(e) => setGroupKey(e.target.value)}>{data.map((g) => <option key={g.key} value={g.key}>{g.labelEn}</option>)}</select> : undefined}
    />
    {loading && !data ? <PageLoading rows={3} /> : error ? <AdminErrorState message={error} onRetry={() => void reload()} /> : (
      <Card>
        <CardHeader>
          {editingGroupTitle ? <div className="nav-group-title-editor"><div><Label htmlFor="group-title-en">Group title (English)</Label><Input id="group-title-en" value={groupTitleEn} onChange={(e) => setGroupTitleEn(e.target.value)} /></div><div><Label htmlFor="group-title-bn">Group title (বাংলা)</Label><Input id="group-title-bn" value={groupTitleBn} onChange={(e) => setGroupTitleBn(e.target.value)} /></div><div className="nav-group-title-actions"><Button variant="outline" onClick={() => { setGroupTitleEn(group?.labelEn ?? ''); setGroupTitleBn(group?.labelBn ?? ''); setEditingGroupTitle(false) }} disabled={busy}>Cancel</Button><Button onClick={() => void saveGroupTitle()} disabled={busy}>{busy ? 'Saving…' : 'Save group title'}</Button></div></div>
          : <div className="nav-group-card-heading"><div><CardTitle>{group?.labelEn}</CardTitle><CardDescription>{group?.labelBn} · Changes to order and nesting are saved immediately and appear on the public site.</CardDescription></div><Button size="sm" variant="outline" onClick={() => setEditingGroupTitle(true)} disabled={!group}><Pencil size={14} /> Edit group title</Button></div>}
        </CardHeader>
        <CardContent>
          <div className="nav-tree">
            {group?.items.map((n, index, siblings) => <Row key={n.id} node={n} depth={1} siblings={siblings} siblingIndex={index} />)}
            {!group?.items.length && <div className="admin-empty-state">No menus yet. Use “Add menu” to create the first one.</div>}
            {dragId !== null && <div className={`nav-root-drop ${over?.id === -1 ? 'hot' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver({ id: -1, zone: 'after' }) }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); setOver(null); void move('root', 'after'); setDragId(null) }}>Drop here to make it a top-level menu (last position)</div>}
          </div>
        </CardContent>
      </Card>
    )}

    {editor && <div className="cms-modal" role="dialog" aria-modal="true" aria-label={editor.mode === 'create' ? 'Add menu' : 'Modify menu'}>
      <div className="cms-modal-card">
        <h2>{editor.mode === 'create' ? (editor.parentId ? 'Add submenu' : 'Add menu') : 'Modify menu'}</h2>
        <p className="admin-small-note">{editor.mode === 'create' ? (editor.menuType === 'page' ? 'A new page with the chosen number of sections will be created.' : 'This menu opens an external URL; no page will be created.') : (editor.menuType === 'page' ? 'Menu title and page settings will be saved to the database.' : 'This menu links directly to an external URL.')}</p>
        <div className="cms-form-grid">
          <div><Label htmlFor="m-en">Menu title (English)</Label><Input id="m-en" value={editor.labelEn} onChange={(e) => setEditor({ ...editor, labelEn: e.target.value, slug: editor.slugTouched ? editor.slug : (editor.menuType === 'page' ? slugify(e.target.value) : editor.slug) })} /></div>
          <div><Label htmlFor="m-bn">Menu title (বাংলা)</Label><Input id="m-bn" value={editor.labelBn} onChange={(e) => setEditor({ ...editor, labelBn: e.target.value })} /></div>
          <div><Label htmlFor="m-type">Menu type</Label><select id="m-type" className="ui-select" value={editor.menuType} onChange={(e) => setEditor({ ...editor, menuType: e.target.value as MenuType, slug: e.target.value === 'page' ? (editor.slug.startsWith('/') ? editor.slug : slugify(editor.labelEn)) : '' , slugTouched: e.target.value === 'page' })}><option value="page">Internal page</option><option value="external">External URL</option></select><small className="admin-small-note">Dropdowns are created by nesting items with drag and drop.</small></div>
          <div><Label htmlFor="m-slug">{editor.menuType === 'external' ? 'External URL' : 'Page route / slug'}</Label><Input id="m-slug" value={editor.slug} onChange={(e) => setEditor({ ...editor, slug: e.target.value, slugTouched: true })} placeholder={editor.menuType === 'external' ? 'https://example.org' : '/our-work'} /><small className="admin-small-note">{editor.menuType === 'external' ? 'Use a full http:// or https:// URL.' : 'Must be unique across menu routes and pages.'}</small></div>
          <div><Label htmlFor="m-section-count">Number of sections</Label><Input id="m-section-count" type="number" value={String(editor.sectionCount)} onChange={(e) => setEditor({ ...editor, sectionCount: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} /></div>
          <div><Label htmlFor="m-section-type">Default section content type</Label><select id="m-section-type" className="ui-select" value={editor.sectionContentType} onChange={(e) => setEditor({ ...editor, sectionContentType: e.target.value as Section['type'] })}>{['richText','cards','carousel','stats','gallery','timeline','diagram','table','video','cta','noticeList','contact','donation','contentFeed','reports'].map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <div className="cms-span-2"><Label htmlFor="m-button-type">Section button type</Label><select id="m-button-type" className="ui-select" value={editor.sectionButtonType} onChange={(e) => setEditor({ ...editor, sectionButtonType: e.target.value as SectionButtonType })}><option value="none">No buttons</option><option value="primary">Primary button</option><option value="secondary">Secondary button</option><option value="both">Primary + secondary buttons</option></select><small className="admin-small-note">This setting is used for sections created with the page. Edit button labels and destination routes in Page Builder.</small></div>
        </div>
        {editor.menuType === 'page' && <fieldset className="cms-fieldset"><legend>Rendered components for this page</legend>
          <p className="admin-small-note">Select the named section components this page should render. Selected component types stay visible on the site; unselected types are omitted. This controls rendering, not the underlying CMS content records.</p>
          <div className="rendered-component-grid">{RENDERED_COMPONENTS.map((component) => <label key={component} className="cms-check"><input type="checkbox" checked={editor.renderedComponents.includes(component)} onChange={(e) => setEditor({ ...editor, renderedComponents: e.target.checked ? [...editor.renderedComponents, component] : editor.renderedComponents.filter((t) => t !== component) })} /> <span><strong>{component}</strong><small>{COMPONENT_DESCRIPTIONS[component]}</small></span></label>)}</div>
          {!editor.renderedComponents.length && <p role="alert" className="cms-inline-error">Select at least one component or choose a different menu type.</p>}
        </fieldset>}
        {editorError && <div className="cms-save-error" role="alert"><strong>Menu changes were not saved.</strong><span>{editorError}</span><small>Your entries are still in this form. Correct the issue and retry.</small></div>}
        <div className="cms-modal-actions"><Button variant="outline" onClick={() => { setEditor(null); setEditorError('') }} disabled={busy}>Cancel</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? 'Saving…' : editor.mode === 'create' ? 'Create menu & page' : 'Save changes'}</Button></div>
      </div>
    </div>}

    {confirm && <div className="cms-modal" role="alertdialog" aria-modal="true">
      <div className="cms-modal-card">
        <h2>Remove “{confirm.labelEn}”?</h2>
        <p>This removes the menu{count(confirm) > 1 ? ` and ${count(confirm) - 1} submenu(s)` : ''} together with the page(s) created for {count(confirm) > 1 ? 'them' : 'it'}. This cannot be undone.</p>
        <div className="cms-modal-actions"><Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button><Button className="cms-danger" onClick={() => void doRemove()} disabled={busy}>{busy ? 'Removing…' : 'Remove menu & page'}</Button></div>
      </div>
    </div>}
  </>
}
