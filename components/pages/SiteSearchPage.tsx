import Link from 'next/link'
import { Search, ArrowRight, FileText } from 'lucide-react'
import { searchPublicSite } from '@/lib/siteSearch'
import type { Lang } from '@/types/entityType'

export default async function SiteSearchPage({ lang, query }: { lang: Lang; query: string }) {
  const q = query.trim().slice(0, 100)
  const results = q ? await searchPublicSite(q, lang) : []
  const isBn = lang === 'bn'
  return <main className="site-search-page">
    <div className="container search-page-inner">
      <span className="eyebrow">{isBn ? 'সাইট সার্চ' : 'Site Search'}</span>
      <h1>{isBn ? 'ওয়েবসাইটে খুঁজুন' : 'Search the website'}</h1>
      <form className="site-search-form" action={isBn ? '/bn/search' : '/search'} method="get">
        <Search size={18}/><input name="q" defaultValue={q} aria-label={isBn ? 'খুঁজুন' : 'Search'} placeholder={isBn ? 'প্রোগ্রাম, রিপোর্ট, সংবাদ বা পেজ খুঁজুন…' : 'Search programs, reports, news or pages…'} /><button className="btn primary" type="submit">{isBn ? 'খুঁজুন' : 'Search'}</button>
      </form>
      {q ? <p className="search-result-count">{isBn ? `${results.length}টি ফলাফল` : `${results.length} result${results.length===1?'':'s'}`} · “{q}”</p> : <p className="search-result-count">{isBn ? 'একটি শব্দ বা বাক্যাংশ লিখে শুরু করুন।' : 'Enter a word or phrase to search published CMS content.'}</p>}
      <div className="search-results">
        {results.map((result) => <article className="search-result-card" key={result.slug}><div className="search-result-icon"><FileText size={20}/></div><div><span className="card-tag">{result.kind === 'report' ? (isBn ? 'রিপোর্ট' : 'Report') : (isBn ? 'পেজ' : 'Page')}</span><h2><Link href={isBn ? `/bn${result.slug === '/' ? '' : result.slug}` : result.slug}>{isBn ? result.title.bn : result.title.en}</Link></h2><p>{isBn ? (result.subtitle.bn || result.excerpt.bn) : (result.subtitle.en || result.excerpt.en)}</p></div><Link className="inline-link" href={isBn ? `/bn${result.slug === '/' ? '' : result.slug}` : result.slug} aria-label={isBn ? 'পেজ খুলুন' : 'Open page'}><ArrowRight size={17}/></Link></article>)}
        {q && !results.length && <div className="collection-empty">{isBn ? 'কোনো প্রকাশিত কনটেন্ট পাওয়া যায়নি।' : 'No published content matched your search.'}</div>}
      </div>
    </div>
  </main>
}
