import type {
  Bilingual,
  ContactInfo,
  HeroData,
  NavGroup,
  NavItem,
  PageData,
  ThemeDefinition,
  UIContent,
} from '../types/entityType'

export type DisplayText = (value: Bilingual) => string

export type NavigationDisplay = {
  primaryNav: NavItem[]
  navGroups: NavGroup[]
  ui: UIContent
}

export type FooterDisplay = NavigationDisplay & {
  contactInfo: ContactInfo
  logo: string
}

export type HomeDisplay = {
  page: PageData
  hero: HeroData
}

export type PageDisplay = {
  page: PageData | null
  canonicalSlug: string
  notFound: boolean
}

export type MediaDisplay = {
  media: {
    founder: string
    hero: string[]
    gallery: string[]
    officialVideoEmbedUrl: string
    officialVideoSourceUrl: string
    featureVideoEmbedUrl: string
    featureVideoSourceUrl: string
    reports: { title: string }[]
  }
}

export type ThemeDisplay = {
  themes: Record<string, ThemeDefinition>
}
