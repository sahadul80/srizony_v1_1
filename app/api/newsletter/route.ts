import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requestEmailVerification, verifyEmailCode } from '@/lib/formFlow'
import { sign, AUTH_COOKIE, verify } from '@/lib/authSession'
import { db } from '@/lib/db'
import { newsletterSubscribers, submissions } from '@/lib/db/schema'

const requestSchema = z.object({ email: z.email().max(254), action: z.literal('request') })
const confirmSchema = z.object({ email: z.email().max(254), action: z.literal('confirm'), code: z.string().regex(/^\d{6}$/), consent: z.literal(true) })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const request = requestSchema.safeParse(body)
    if (request.success) {
      await requestEmailVerification(request.data.email, 'newsletter')
      return NextResponse.json({ ok: true, status: 'verification_sent' }, { status: 202 })
    }
    const parsed = confirmSchema.safeParse(body)
    if (!parsed.success || !db) return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Enter a valid email and consent.' } }, { status: 400 })
    await verifyEmailCode(parsed.data.email, 'newsletter', parsed.data.code)
    const email = parsed.data.email.toLowerCase()
    const now = new Date()
    await db.insert(newsletterSubscribers).values({ email, status: 'subscribed', consentAt: now, unsubscribedAt: null, updatedAt: now }).onConflictDoUpdate({ target: newsletterSubscribers.email, set: { status: 'subscribed', consentAt: now, unsubscribedAt: null, updatedAt: now } })
    await db.insert(submissions).values({ type: 'newsletter', email, status: 'subscribed', payload: { source: 'newsletter', verified: true } })
    const token = sign({ email, purpose: 'newsletter-unsubscribe' }, 60 * 60 * 24 * 30)
    return NextResponse.json({ ok: true, status: 'subscribed', unsubscribeUrl: `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}` }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'CODE_COOLDOWN') return NextResponse.json({ ok: false, error: { code: 'CODE_COOLDOWN', message: 'A verification code was already sent recently. Please check your email.' } }, { status: 429 })
    return NextResponse.json({ ok: false, error: { code: 'NEWSLETTER_UNAVAILABLE', message: error instanceof Error ? error.message : 'Newsletter signup is temporarily unavailable.' } }, { status: 503 })
  }
}

export async function GET(req: Request) {
  if (!db) return NextResponse.json({ status: 'unknown' })
  const email = new URL(req.url).searchParams.get('email')?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  const sessionCookie = (await cookies()).get(AUTH_COOKIE)?.value
  const session = verify<{ email?: string }>(sessionCookie)
  if (!session || session.email?.toLowerCase() !== email) return NextResponse.json({ status: 'unknown' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const rows = await db.select({ status: newsletterSubscribers.status, updatedAt: newsletterSubscribers.updatedAt }).from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1)
  const status = rows[0]?.status || 'not_subscribed'
  const token = status === 'subscribed' ? sign({ email, purpose: 'newsletter-unsubscribe' }, 60 * 60 * 24 * 30) : undefined
  return NextResponse.json({ status, updatedAt: rows[0]?.updatedAt || null, unsubscribeUrl: token ? `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}` : undefined }, { headers: { 'Cache-Control': 'no-store' } })
}
