import Link from 'next/link'
export default function NotFound(){return <main className="page-state container"><div className="state-card"><span className="eyebrow">404</span><h1>Page not found</h1><p>The requested page does not exist or has moved.</p><Link className="btn primary" href="/">Back to home</Link></div></main>}
