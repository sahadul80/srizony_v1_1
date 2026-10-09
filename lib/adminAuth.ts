import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { safeEqual } from '@/lib/security'

const COOKIE = 'sf-cms-session'
const MAX_AGE = 60 * 60 * 12

export type AdminRole = 'admin' | 'editor' | 'analyst'

function secret() {
  const value = process.env.CMS_SESSION_SECRET?.trim() || process.env.AUTH_SECRET?.trim()
  if (!value) throw new Error('Missing required security environment variable: CMS_SESSION_SECRET or AUTH_SECRET')
  return value
}
function encode(value: string) { return Buffer.from(value).toString('base64url') }
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url') }

export function createAdminSession(email: string, role: AdminRole = 'admin') {
  const payload = `${email.toLowerCase()}|${role}|${Date.now()}`
  return `${encode(payload)}.${sign(payload)}`
}

export function verifyAdminSession(token?: string | null) {
  if (!token) return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  try {
    const payload = Buffer.from(encoded, 'base64url').toString('utf8')
    const expected = sign(payload)
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null
    const [email, role, stamp] = payload.split('|')
    const issuedAt = Number(stamp)
    if (!email || !['admin', 'editor', 'analyst'].includes(role) || !Number.isFinite(issuedAt) || issuedAt > Date.now() || Date.now() - issuedAt > MAX_AGE * 1000) return null
    return { email, role: role as AdminRole }
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const store = await cookies()
  return verifyAdminSession(store.get(COOKIE)?.value)
}

export function compareAdminCredential(input: string, configured: string) {
  return safeEqual(input, configured)
}

export const adminCookie = { name: COOKIE, maxAge: MAX_AGE }


export function hasAdminRole(session: Awaited<ReturnType<typeof getAdminSession>> | null | undefined, ...allowed: AdminRole[]) {
  return Boolean(session && allowed.includes(session.role))
}
