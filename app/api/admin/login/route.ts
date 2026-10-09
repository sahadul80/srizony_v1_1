import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminCookie, compareAdminCredential, createAdminSession } from '@/lib/adminAuth'
import { auditAdminAction, clearLoginFailures, enforceLoginRateLimit, recordLoginFailure, requestIp } from '@/lib/security'
import { configuredAdminUsers, type AdminUserConfig } from '@/lib/adminUsers'
import { authenticateDatabaseUser } from '@/lib/cms/users'

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
})

type AdminUser = AdminUserConfig

function configuredUsers(): AdminUser[] {
  try { return configuredAdminUsers() } catch (error) { throw error instanceof Error ? error : new Error('CMS_ADMIN_USERS_JSON is invalid JSON.') }
}

export async function POST(req: Request) {
  const result = schema.safeParse(await req.json().catch(() => null))
  if (!result.success) return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })

  const ip = requestIp(req)
  const key = `${result.data.email.toLowerCase()}|${ip}`.slice(0, 255)
  try {
    if (!(await enforceLoginRateLimit(key))) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    const users = configuredUsers()
    const envUser = users.find((candidate) => candidate.email.toLowerCase() === result.data.email.toLowerCase())
    const failLogin = async () => {
      await recordLoginFailure(key)
      await auditAdminAction({ actorEmail: result.data.email, action: 'auth.login_failed', metadata: { ip }, request: req })
    }
    let user: AdminUser | null = null
    if (envUser && compareAdminCredential(result.data.password, envUser.password)) user = envUser
    else if (!envUser) {
      const dbUser = await authenticateDatabaseUser(result.data.email, result.data.password).catch(() => null)
      if (dbUser) user = { email: dbUser.email, password: '', role: dbUser.role }
    }
    if (!user) {
      await failLogin()
      return NextResponse.json({ error: 'Invalid CMS credentials.' }, { status: 401 })
    }

    await clearLoginFailures(key)
    await auditAdminAction({ actorEmail: user.email, action: 'auth.login_success', metadata: { role: user.role || 'admin' }, request: req })
    const response = NextResponse.json({ ok: true, user: { email: user.email.toLowerCase(), role: user.role || 'admin' } })
    response.cookies.set(adminCookie.name, createAdminSession(user.email.toLowerCase(), user.role || 'admin'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: adminCookie.maxAge,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('CMS login failed', error)
    return NextResponse.json({ error: 'CMS authentication is not configured correctly.' }, { status: 503 })
  }
}
