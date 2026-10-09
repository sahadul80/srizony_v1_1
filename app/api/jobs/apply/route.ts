import { NextResponse } from 'next/server'
import { z } from 'zod'
import { failure } from '@/lib/cms/guard'
import { submitApplication } from '@/lib/cms/jobs'

const schema = z.object({
  jobSlug: z.string().min(1).max(160), name: z.string().trim().min(2).max(160), email: z.email().max(254),
  phone: z.string().trim().max(40).optional(), coverLetter: z.string().trim().max(5000).optional(),
  resumeUrl: z.string().trim().max(500).regex(/^https:\/\//).optional(),
})

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Please check your name, email and resume link.' }, { status: 400 })
  try { await submitApplication(body.data); return NextResponse.json({ ok: true }) } catch (e) { return failure(e, 'Unable to submit your application.') }
}
