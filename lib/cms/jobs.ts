import { sql } from 'drizzle-orm'
import { db, withDbRetry } from '@/lib/db'
import { ensureCmsSchema } from './ensureSchema'

type Row = Record<string, any>
export class JobError extends Error { constructor(message: string, public status = 400) { super(message) } }
const database = () => { if (!db) throw new JobError('DATABASE_URL is not configured', 503); return db }
const run = (q: ReturnType<typeof sql>) => withDbRetry(() => database().execute(q))
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v || ''))

export const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'] as const

export async function listJobSummaries() {
  await ensureCmsSchema()
  const rows = (await run(sql`
    SELECT i.id, i.slug, i.title_en, i.title_bn, i.status, i.published_at, i.attributes,
      (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = i.id) AS applications,
      (SELECT COUNT(*)::int FROM job_applications a WHERE a.job_id = i.id AND a.status = 'new') AS new_applications
    FROM cms_content_items i WHERE i.component = 'job' ORDER BY i.published_at DESC, i.id DESC`)).rows as Row[]
  return rows.map((r) => ({ id: Number(r.id), slug: r.slug, title: { en: r.title_en, bn: r.title_bn }, status: r.status, postedAt: String(r.published_at).slice(0, 10), deadline: r.attributes?.deadline || '', applications: Number(r.applications), newApplications: Number(r.new_applications) }))
}

export async function listApplications(jobId?: number) {
  await ensureCmsSchema()
  const rows = (await run(sql`
    SELECT a.*, i.title_en AS job_title, i.slug AS job_slug FROM job_applications a JOIN cms_content_items i ON i.id = a.job_id
    ${jobId ? sql`WHERE a.job_id = ${jobId}` : sql``} ORDER BY a.created_at DESC LIMIT 2000`)).rows as Row[]
  return rows.map((r) => ({ id: Number(r.id), jobId: Number(r.job_id), jobTitle: r.job_title, jobSlug: r.job_slug, name: r.name, email: r.email, phone: r.phone || '', coverLetter: r.cover_letter || '', resumeUrl: r.resume_url || '', status: r.status, createdAt: iso(r.created_at) }))
}

export async function setApplicationStatus(id: number, status: string) {
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) throw new JobError('Unsupported status.')
  await ensureCmsSchema()
  if (!(await run(sql`UPDATE job_applications SET status = ${status} WHERE id = ${id} RETURNING id`)).rows.length) throw new JobError('Application not found.', 404)
}

export async function submitApplication(input: { jobSlug: string; name: string; email: string; phone?: string; coverLetter?: string; resumeUrl?: string }) {
  await ensureCmsSchema()
  const job = (await run(sql`SELECT id, attributes FROM cms_content_items WHERE component = 'job' AND slug = ${input.jobSlug} AND status = 'published' LIMIT 1`)).rows[0] as Row | undefined
  if (!job) throw new JobError('This job is no longer available.', 404)
  const deadline = job.attributes?.deadline
  if (deadline && new Date(`${deadline}T23:59:59`).getTime() < Date.now()) throw new JobError('The application deadline has passed.', 410)
  const dup = await run(sql`SELECT id FROM job_applications WHERE job_id = ${Number(job.id)} AND lower(email) = ${input.email.toLowerCase()} LIMIT 1`)
  if (dup.rows.length) throw new JobError('You have already applied for this job.', 409)
  await run(sql`INSERT INTO job_applications (job_id, name, email, phone, cover_letter, resume_url) VALUES (${Number(job.id)}, ${input.name}, ${input.email.toLowerCase()}, ${input.phone || null}, ${input.coverLetter || null}, ${input.resumeUrl || null})`)
}
