/** Newsletter preference state, separated from the Next.js route file. */
export default function UnsubscribeContent({ status, token }: { status?: string; token?: string }) {
  const successful = status === 'success'
  const invalid = status === 'invalid'
  return <main className="standalone-state-page"><section className="state-card">
    <span className="eyebrow">Srizony Foundation</span>
    <h1>{successful ? 'You are unsubscribed' : invalid ? 'Expired Link' : 'Newsletter preferences'}</h1>
    <p>{successful ? 'You will no longer receive newsletter updates at this address.' : invalid ? 'This preference link is invalid or has expired.' : 'Confirm below to unsubscribe from newsletter updates.'}</p>
    {!status && token && <form method="post" action="/api/newsletter/unsubscribe"><input type="hidden" name="token" value={token} /><button className="btn primary" type="submit">Unsubscribe</button></form>}
    {!successful && <a className="btn ghost" href="/">Return to website</a>}
  </section></main>
}
