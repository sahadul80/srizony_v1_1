import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { donations } from '@/lib/db/schema'
import { ensureDonationsSchema } from '@/lib/db/ensureOperationalSchema'

const cfg = () => ({
  storeId: process.env.SSLCOMMERZ_STORE_ID,
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
  baseUrl: (process.env.SSLCOMMERZ_BASE_URL || 'https://sandbox.sslcommerz.com').replace(/\/$/, ''),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
})

type Validation = { status?: string; tran_id?: string; amount?: string | number; currency?: string; risk_level?: string; risk_title?: string }

export async function POST(req: Request) {
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const form = await req.formData()
  return handle({ ...query, ...Object.fromEntries(form.entries()) }, req)
}

export async function GET(req: Request) { return handle(Object.fromEntries(new URL(req.url).searchParams.entries()), req) }

async function handle(payload: Record<string, FormDataEntryValue | string>, req: Request) {
  const { storeId, storePassword, baseUrl, siteUrl } = cfg()
  const status = String(payload.status || '').toLowerCase()
  const tranId = String(payload.tran_id || '')

  if (!tranId || !db) return NextResponse.redirect(`${siteUrl}/donate?donation=failed`, 303)

  await ensureDonationsSchema()

  if (status === 'ipn') {
    if (!payload.val_id || !storeId || !storePassword) return new NextResponse('Missing validation data', { status: 400 })
    const validation = await validate(String(payload.val_id), baseUrl, storeId, storePassword)
    await applyValidatedState(validation, tranId)
    return new NextResponse('OK', { status: 200 })
  }

  let final: 'cancelled' | 'failed' | 'success' = status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : 'failed'
  if ((status === 'success' || status === 'valid' || status === 'validated') && payload.val_id && storeId && storePassword) {
    const validation = await validate(String(payload.val_id), baseUrl, storeId, storePassword)
    final = await applyValidatedState(validation, tranId) ? 'success' : 'failed'
  } else if (status === 'cancelled' || status === 'failed') {
    await db.update(donations).set({ status: final }).where(and(eq(donations.transactionId, tranId), eq(donations.status, 'pending')))
  }

  const qs = `&tran_id=${encodeURIComponent(tranId)}`
  return NextResponse.redirect(`${siteUrl}/donate?donation=${final}${qs}`, 303)
}

async function validate(valId: string, baseUrl: string, storeId: string, storePassword: string): Promise<Validation | null> {
  try {
    const url = new URL(`${baseUrl}/validator/api/validationserverAPI.php`)
    url.searchParams.set('val_id', valId)
    url.searchParams.set('store_id', storeId)
    url.searchParams.set('store_passwd', storePassword)
    url.searchParams.set('format', 'json')
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as Validation
    if (data.status !== 'VALID' && data.status !== 'VALIDATED') return null
    return data
  } catch { return null }
}

async function applyValidatedState(validation: Validation | null, tranId: string) {
  if (!validation || validation.tran_id !== tranId || !db) return false
  const existing = await db.select({ amount: donations.amount, status: donations.status, donor: donations.donor, receiptSentAt: donations.receiptSentAt }).from(donations).where(eq(donations.transactionId, tranId)).limit(1)
  const row = existing[0]
  if (!row || row.status === 'success') return row?.status === 'success'
  const gatewayAmount = Number(validation.amount)
  const storedAmount = Number(row.amount)
  if (!Number.isFinite(gatewayAmount) || !Number.isFinite(storedAmount) || Math.abs(gatewayAmount - storedAmount) > 0.009 || String(validation.currency || 'BDT').toUpperCase() !== 'BDT') return false
  const updated = await db.update(donations).set({ status: 'success' }).where(and(eq(donations.transactionId, tranId), eq(donations.status, 'pending'))).returning({ id: donations.id, donor: donations.donor, amount: donations.amount, receiptSentAt: donations.receiptSentAt })
  const saved = updated[0]
  if (saved?.donor && typeof saved.donor === 'object' && !saved.receiptSentAt) {
    const donor = saved.donor as { email?: string; name?: string; anonymous?: boolean }
    if (donor.email) {
      try {
        await sendEmail({
          to: donor.email,
          subject: 'Donation confirmation — Srizony Foundation',
          html: `<p>Thank you for supporting Srizony Foundation.</p><p>Transaction: <strong>${tranId}</strong><br/>Amount: <strong>BDT ${Number(saved.amount).toFixed(2)}</strong></p><p>This email confirms that the payment gateway validated your donation.</p>`,
        })
        await db.update(donations).set({ receiptSentAt: new Date() }).where(eq(donations.id, saved.id))
      } catch (error) {
        console.error('Donation receipt email failed', error)
      }
    }
  }
  return true
}
