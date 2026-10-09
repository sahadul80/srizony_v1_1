import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { cookieBase, OAUTH_STATE_COOKIE, PENDING_COOKIE, seal, getSiteOrigin } from '@/lib/authSession'

const schema = z.object({
  provider: z.literal('google'),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().max(30).optional(),
  message: z.string().trim().min(5).max(5000),
  consentAt: z.string().datetime(),
  visitorId: z.string().max(128).optional(),
  returnTo: z.string().regex(/^\//).default('/contact'),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please complete the enquiry form first.' }, { status: 400 })

  const { provider: _provider, ...pending } = parsed.data
  const state = randomBytes(24).toString('base64url')
  const origin = getSiteOrigin(req.url)
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Google sign-in is not configured yet.' }, { status: 503 })

  const redirectUri = `${origin}/api/auth/callback/google`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  const response = NextResponse.json({ ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  const opts = { ...cookieBase(), maxAge: 600 }
  response.cookies.set(PENDING_COOKIE, seal({ ...pending, createdAt: Date.now() }), opts)
  response.cookies.set(OAUTH_STATE_COOKIE, state, opts)
  return response
}
