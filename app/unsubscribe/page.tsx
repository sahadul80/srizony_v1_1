import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter preferences', description: 'Manage your Srizony Foundation newsletter subscription.' }

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ status?: string; token?: string }> }) {
  const params = await searchParams
  const status = params.status || ''
  return <main className="standalone-state-page"><section className="state-card"><span className="eyebrow">Srizony Foundation</span><h1>{status === 'success' ? 'You are unsubscribed' : status === 'invalid' ? 'Expired Link' : 'Newsletter preferences'}</h1><p>{status === 'success' ? 'You will no longer receive newsletter updates at this address.' : status === 'invalid' ? 'This preference link is invalid or has expired.' : 'Confirm below to unsubscribe from newsletter updates.'}</p>{!status && params.token && <form method="post" action="/api/newsletter/unsubscribe"><input type="hidden" name="token" value={params.token} /><button className="btn primary" type="submit">Unsubscribe</button></form>}{status !== 'success' && <a className="btn ghost" href="/">Return to website</a>}</section></main>
}
