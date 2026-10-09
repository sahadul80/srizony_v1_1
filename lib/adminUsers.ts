import type { AdminRole } from './adminAuth'

export type AdminUserConfig = { email: string; password: string; role?: AdminRole }

export function configuredAdminUsers(): AdminUserConfig[] {
  const raw = process.env.CMS_ADMIN_USERS_JSON?.trim()
  if (raw) {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('CMS_ADMIN_USERS_JSON must be an array.')
    return parsed.filter((item): item is AdminUserConfig => item && typeof item.email === 'string' && typeof item.password === 'string')
  }
  const email = process.env.CMS_ADMIN_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim()
  const password = process.env.CMS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return email && password ? [{ email, password, role: 'admin' }] : []
}
