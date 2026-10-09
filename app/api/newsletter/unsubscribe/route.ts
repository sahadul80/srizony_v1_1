import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { verify } from '@/lib/authSession'
import { db } from '@/lib/db'
import { newsletterSubscribers } from '@/lib/db/schema'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const data = verify<{ email?: string; purpose?: string }>(token || undefined)
  if (!data?.email || data.purpose !== 'newsletter-unsubscribe') return NextResponse.redirect(new URL('/unsubscribe?status=invalid', req.url))
  const target = new URL('/unsubscribe', req.url)
  target.searchParams.set('token', token || '')
  return NextResponse.redirect(target, 303)
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const token = String(form?.get('token') || '')
  const data = verify<{ email?: string; purpose?: string }>(token)
  if (!data?.email || data.purpose !== 'newsletter-unsubscribe' || !db) return NextResponse.redirect(new URL('/unsubscribe?status=invalid', req.url), 303)
  await db.update(newsletterSubscribers).set({ status: 'unsubscribed', unsubscribedAt: new Date(), updatedAt: new Date() }).where(eq(newsletterSubscribers.email, data.email.toLowerCase()))
  return NextResponse.redirect(new URL('/unsubscribe?status=success', req.url), 303)
}
