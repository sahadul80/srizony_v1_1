'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, CirclePlus, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { addMenu, getNavigation, modifyMenu, removeMenu, saveMenuOrder, type NavGroup, type NavNode } from '@/lib/api/navigation'
import { COMPONENTS, MENU_COMPONENTS, type ContentComponent } from '@/lib/cms/components'
import { AdminErrorState, PageLoading, SectionToolbar, useAdminFetch } from '../_components/AdminCommon'

const MAX_DEPTH = 3
type Zone = 'before' | 'after' | 'inside'
type Editor = { mode: 'create' | 'edit'; parentId: number | null; id?: number; labelEn: string; labelBn: string; slug: string; slugTouched: boolean; types: ContentComponent[] }

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

export default function NavigationPage() {
  const { data, setData, loading, error, reload } = useAdminFetch<NavGroup[]>(getNavigation)
  const [groupKey, setGroupKey] = useState('primary')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [confirm, setConfirm] = useState<NavNode | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [over, setOver] = useState<{ id: number; zone: Zone } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const group = useMemo(() => data?.find((g) => g.key === groupKey) ?? data?.[0], [data, groupKey])

  async function move(targetId: number | 'root', zone: Zone) {
    if (!group || dragId === null) return
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

  function openCreate(parentId: number | null) { setEditor({ mode: 'create', parentId, labelEn: '', labelBn: '', slug: '', slugTouched: false, types: [] }) }
  function openEdit(n: NavNode) { setEditor({ mode: 'edit', parentId: null, id: n.id, labelEn: n.labelEn, labelBn: n.labelBn, slug: n.slug, slugTouched: true, types: n.contentTypes }) }

  async function submit() {
    if (!editor || !group) return
    if (!editor.labelEn.trim()) return toast.error('Enter the menu name in English.')
    if (!editor.types.length) return toast.error('Select at least one content component.')
    const input = { labelEn: editor.labelEn.trim(), labelBn: editor.labelBn.trim(), slug: editor.slug || slugify(editor.labelEn), contentTypes: editor.types }
    setBusy(true)
    try {
      if (editor.mode === 'create') { await addMenu(group.key, editor.parentId, input); toast.success('Menu added and its page created.') }
      else { await modifyMenu(editor.id!, input); toast.success('Menu and its page updated.') }
      setEditor(null); await reload()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save the menu.') } finally { setBusy(false) }
  }

  async function doRemove() {
    if (!confirm) return
    setBusy(true)
    try { const r = await removeMenu(confirm.id); toast.success(`Removed ${r.menus} menu(s) and ${r.pages} page(s).`); setConfirm(null); await reload() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to remove the menu.') } finally { setBusy(false) }
  }

  const count = (n: NavNode): number => 1 + n.children.reduce((t, c) => t + count(c), 0)

  function Row({ node, depth }: { node: NavNode; depth: number }) {
    const isOpen = !collapsed.has(node.id)
    const hot = over?.id === node.id ? over.zone : null
    return (
      <div className="nav-node">
        <div
          className={`nav-row ${dragId === node.id ? 'dragging' : ''} ${hot ? `drop-${hot}` : ''}`}
          draggable
          onDragStart={(e) => { setDragId(node.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(node.id)) }}
          onDragEnd={() => { setDragId(null); setOver(null) }}
          onDragOver={(e) => {
            if (dragId === null || dragId === node.id) return
            e.preventDefault()
            const box = e.currentTarget.getBoundingClientRect(); const y = (e.clientY - box.top) / box.height
            setOver({ id: node.id, zone: y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside' })
          }}
          onDrop={(e) => { e.preventDefault(); const z = over?.zone ?? 'inside'; setOver(null); void move(node.id, z); setDragId(null) }}
        >
          <span className="nav-grip" aria-hidden><GripVertical size={16} /></span>
          <button type="button" className="nav-toggle" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(node.id)) n.delete(node.id); else n.add(node.id); return n })} aria-label="Toggle submenus">
            {node.children.length ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
          </button>
          <div className="nav-label"><strong>{node.labelEn}</strong><small>{node.labelBn} · <code>{node.slug}</code></small></div>
          <div className="nav-chips">{node.contentTypes.map((t) => <span key={t} className="nav-chip">{COMPONENTS[t].label}</span>)}</div>
          <div className="nav-actions">
            {depth < MAX_DEPTH && <Button variant="outline" size="sm" onClick={() => openCreate(node.id)} title="Add submenu"><CirclePlus size={14} /></Button>}
            <Button variant="outline" size="sm" onClick={() => openEdit(node)} title="Modify"><Pencil size={14} /></Button>
            <Button variant="outline" size="sm" onClick={() => setConfirm(node)} title="Remove"><Trash2 size={14} /></Button>
          </div>
        </div>
        {isOpen && node.children.length > 0 && <div className="nav-children">{node.children.map((c) => <Row key={c.id} node={c} depth={depth + 1} />)}</div>}
      </div>
    )
  }

  return <>
    <SectionToolbar
      title="Site Navigation"
      description="Add, modify and remove menus — each menu owns a page. Drag to reorder; drop on the middle of a row to make it a submenu, or on a row's top/bottom edge to place it beside."
      count={group ? group.items.reduce((t, n) => t + count(n), 0) : 0}
      onRefresh={() => void reload()} refreshing={loading}
      actions={<Button onClick={() => openCreate(null)} disabled={!group}><CirclePlus size={15} /> Add menu</Button>}
      filters={data && data.length > 1 ? <select className="ui-select admin-filter-select" value={group?.key} onChange={(e) => setGroupKey(e.target.value)}>{data.map((g) => <option key={g.key} value={g.key}>{g.labelEn}</option>)}</select> : undefined}
    />
    {loading && !data ? <PageLoading rows={3} /> : error ? <AdminErrorState message={error} onRetry={() => void reload()} /> : (
      <Card>
        <CardHeader><CardTitle>{group?.labelEn}</CardTitle><CardDescription>Changes to order and nesting are saved immediately and appear on the public site.</CardDescription></CardHeader>
        <CardContent>
          <div className="nav-tree">
            {group?.items.map((n) => <Row key={n.id} node={n} depth={1} />)}
            {!group?.items.length && <div className="admin-empty-state">No menus yet. Use “Add menu” to create the first one.</div>}
            {dragId !== null && <div className={`nav-root-drop ${over?.id === -1 ? 'hot' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver({ id: -1, zone: 'after' }) }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); setOver(null); void move('root', 'after'); setDragId(null) }}>Drop here to make it a top-level menu (last position)</div>}
          </div>
        </CardContent>
      </Card>
    )}

    {editor && <div className="cms-modal" role="dialog" aria-modal="true" aria-label={editor.mode === 'create' ? 'Add menu' : 'Modify menu'}>
      <div className="cms-modal-card">
        <h2>{editor.mode === 'create' ? (editor.parentId ? 'Add submenu' : 'Add menu') : 'Modify menu'}</h2>
        <p className="admin-small-note">{editor.mode === 'create' ? 'A page with this menu name will be created.' : 'The page with this menu name is updated to match.'}</p>
        <div className="cms-form-grid">
          <div><Label htmlFor="m-en">Menu name (English)</Label><Input id="m-en" value={editor.labelEn} onChange={(e) => setEditor({ ...editor, labelEn: e.target.value, slug: editor.slugTouched ? editor.slug : slugify(e.target.value) })} /></div>
          <div><Label htmlFor="m-bn">Menu name (বাংলা)</Label><Input id="m-bn" value={editor.labelBn} onChange={(e) => setEditor({ ...editor, labelBn: e.target.value })} /></div>
          <div className="cms-span-2"><Label htmlFor="m-slug">Page slug</Label><Input id="m-slug" value={editor.slug} onChange={(e) => setEditor({ ...editor, slug: e.target.value.toLowerCase(), slugTouched: true })} placeholder="/our-work" /><small className="admin-small-note">Must be unique across all menus and pages.</small></div>
        </div>
        <fieldset className="cms-fieldset"><legend>Content managed by this page <em>(select at least one)</em></legend>
          {MENU_COMPONENTS.map((c) => <label key={c} className="cms-check"><input type="checkbox" checked={editor.types.includes(c)} onChange={(e) => setEditor({ ...editor, types: e.target.checked ? [...editor.types, c] : editor.types.filter((t) => t !== c) })} /> <span><strong>{COMPONENTS[c].plural}</strong><small>{COMPONENTS[c].description}</small></span></label>)}
        </fieldset>
        <div className="cms-modal-actions"><Button variant="outline" onClick={() => setEditor(null)} disabled={busy}>Cancel</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? 'Saving…' : editor.mode === 'create' ? 'Create menu & page' : 'Save changes'}</Button></div>
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
