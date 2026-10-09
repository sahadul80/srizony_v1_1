import type { ContactInfo, HeroData, MediaItem, NavGroup, NavItem, PageData, ThemeDefinition, UIContent } from '@/types/entityType'

export type PublicPaymentInfo = { id: string; en: string; bn: string; noteEn: string; noteBn: string; icon: string }
export type PublicGlobal = {
  images: Record<string, any>
  themes: Record<string, ThemeDefinition>
  media: Record<string, any>
  homeHero: HeroData
  ui: UIContent
  contactInfo: ContactInfo
  primaryNav: NavItem[]
  navGroups: NavGroup[]
  donationInfo: PublicPaymentInfo[]
  SDGsteps: Array<{ n: string; en: string; bn: string; enText: string; bnText: string }>
}

export type PublicSiteSnapshot = {
  global: PublicGlobal
  page: PageData | null
  canonicalSlug: string
  notFound: boolean
  updatedAt?: string | null
}
