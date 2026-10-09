import { NextResponse } from 'next/server'
import { getAdminSession, adminCookie } from '@/lib/adminAuth'

export async function GET() {
  const session = await getAdminSession()
  return NextResponse.json({ authenticated: Boolean(session), user: session }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(adminCookie.name, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' })
  return response
}
