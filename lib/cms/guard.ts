import { NextResponse } from 'next/server'
import { getAdminSession, hasAdminRole, type AdminRole } from '@/lib/adminAuth'

type Session = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>

/** Resolves the admin session or a ready-to-return error response. */
export async function requireAdmin(...roles: AdminRole[]): Promise<{ admin: Session; denied?: undefined } | { admin?: undefined; denied: NextResponse }> {
  const admin = await getAdminSession()
  if (!admin) return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (roles.length && !hasAdminRole(admin, ...roles)) return { denied: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) }
  return { admin }
}

export function failure(error: unknown, fallback = 'Request failed.') {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : 500
  const message = error instanceof Error && status < 500 ? error.message : error instanceof Error && status === 503 ? error.message : fallback
  if (status >= 500) console.error(fallback, error)
  return NextResponse.json({ error: message, field: (error as { field?: string })?.field }, { status })
}
