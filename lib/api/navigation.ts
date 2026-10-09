import { adminRequest } from './http'
import type { ContentComponent } from '@/lib/cms/components'

export type NavNode = { id: number; labelEn: string; labelBn: string; slug: string; contentTypes: ContentComponent[]; children: NavNode[] }
export type NavGroup = { id: number; key: string; labelEn: string; labelBn: string; items: NavNode[] }
export type MenuInput = { labelEn: string; labelBn: string; slug: string; contentTypes: ContentComponent[] }
export type MoveNode = { id: number; children?: MoveNode[] }

export const getNavigation = async () => (await adminRequest<{ groups: NavGroup[] }>('/api/admin/navigation', {}, 'Unable to load navigation.')).groups
export const addMenu = (groupKey: string, parentId: number | null, input: MenuInput) => adminRequest('/api/admin/navigation', { method: 'POST', json: { groupKey, parentId, ...input } }, 'Unable to add the menu.')
export const modifyMenu = (id: number, input: MenuInput) => adminRequest('/api/admin/navigation', { method: 'PUT', json: { id, ...input } }, 'Unable to modify the menu.')
export const removeMenu = (id: number) => adminRequest<{ menus: number; pages: number }>(`/api/admin/navigation?id=${id}`, { method: 'DELETE' }, 'Unable to remove the menu.')
export const saveMenuOrder = (groupKey: string, tree: MoveNode[]) => adminRequest('/api/admin/navigation', { method: 'PATCH', json: { groupKey, tree } }, 'Unable to save the new order.')
