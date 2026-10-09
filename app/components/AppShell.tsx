'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import SiteProvider from './SiteProvider'
import type { PublicSiteSnapshot } from '@/types/site'
import type { Lang } from '@/types/entityType'
import Header from './Header'
import Footer from './Footer'
import BackToTop from './BackToTop'
import VisitorTracker from './VisitorTracker'

export default function AppShell({ children, initialPreferences, initialSite, initialLang }: { children: ReactNode; initialPreferences?: { theme: any; mode: any; shape: any }; initialSite?: PublicSiteSnapshot | null; initialLang?: Lang }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <SiteProvider initialPreferences={initialPreferences} initialSite={initialSite} initialLang={initialLang}>
      <Header />
      <VisitorTracker />
      <BackToTop />
      <main id="main-content" className="site-main">{children}</main>
      <Footer />
    </SiteProvider>
  )
}
