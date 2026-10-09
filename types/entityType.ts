import { LucideIcon } from "lucide-react";
import { ComponentType } from "react";
import type { ContentComponent, FeedItem } from "@/lib/cms/components";

export type Lang = 'en' | 'bn'
export type Bilingual = { en: string; bn: string }
export type ShapeName = 'rounded' | 'soft' | 'square'
export type IconName = 'heart' | 'leaf' | 'book' | 'scale' | 'users' | 'sun' | 'droplets' | 'briefcase' | 'coins' | 'building' | 'megaphone' | 'shield' | 'play' | 'arrow' | 'check'

export type IllustrationName = 'women-business' | 'small-enterprise' | 'agriculture' | 'migrant-household' | 'rural-development' | 'career' | 'education'

export type MediaItem = {
  src: string
  alt: Bilingual
  caption?: Bilingual
  kind?: 'image' | 'illustration'
  hoverSrc?: string
}

export type Section =
  | { type: 'richText'; eyebrow?: Bilingual; heading?: Bilingual; body: Bilingual[]; image?: MediaItem; reverse?: boolean }
  | { type: 'stats'; items: { value: string; label: Bilingual; note?: Bilingual }[] }
  | { type: 'cards'; eyebrow?: Bilingual; heading?: Bilingual; variant?: 'default' | 'impact'; items: { title: Bilingual; body?: Bilingual; icon?: IconName; image?: MediaItem; illustration?: IllustrationName; href?: string; tag?: Bilingual }[]; columns?: 2 | 3 | 4 }
  | { type: 'gallery'; heading?: Bilingual; items: MediaItem[]; columns?: 2 | 3 | 4 }
  | { type: 'timeline'; heading?: Bilingual; variant?: 'list' | 'journey'; items: { year: string; title: Bilingual; body: Bilingual; details?: Bilingual[] }[] }
  | { type: 'diagram'; heading?: Bilingual; body?: Bilingual; variant: 'sdg' | 'impact' | 'governance' }
  | { type: 'table'; heading?: Bilingual; headers: Bilingual[]; rows: Bilingual[][] }
  | { type: 'video'; heading?: Bilingual; body?: Bilingual; poster: string; embedUrl?: string; sourceUrl?: string }
  | { type: 'cta'; heading: Bilingual; body: Bilingual; primary: { label: Bilingual; href: string }; secondary?: { label: Bilingual; href: string } }
  | { type: 'noticeList'; heading?: Bilingual; autoplay?: boolean; items: { date: string; title: Bilingual; body?: Bilingual; href?: string }[] }
  | { type: 'contact'; heading?: Bilingual; address: Bilingual; phones: string[]; emails: string[]; mapLabel?: Bilingual; locations?: { name: Bilingual; address: Bilingual; mapQuery: string; phone?: string; email?: string; kind?: 'site' | 'branch' | 'footprint' }[] }
  | { type: 'donation'; heading?: Bilingual; body?: Bilingual }
  | { type: 'carousel'; eyebrow?: Bilingual; heading?: Bilingual; body?: Bilingual; presentation?: 'collection' | 'scroller'; collectionKind?: 'projects' | 'news'; items: { title: Bilingual; body?: Bilingual; image: MediaItem; href?: string; tag?: Bilingual }[] }
  | { type: 'contentFeed'; heading?: Bilingual; components: ContentComponent[]; items: FeedItem[] }
  | { type: 'reports'; eyebrow?: Bilingual; heading?: Bilingual; body?: Bilingual; items: { title: Bilingual; description?: Bilingual; file?: string; publishedAt?: string; category?: Bilingual }[] }


export type HeroStat = { id: string; icon: 'heart' | 'users' | 'building' | 'location'; value: Bilingual; label: Bilingual }
export type HeroSlide = { id: string; image: string; title: Bilingual; description: Bilingual; href: string }
export type HeroData = { eyebrow: Bilingual; headingLineOne: Bilingual; headingLineTwo: Bilingual; description: Bilingual; primaryAction: { label: Bilingual; href: string }; secondaryAction: { label: Bilingual; href: string }; slides: HeroSlide[]; stats: HeroStat[]; autoplay?: boolean; autoplayInterval?: number; videoHref?: string }

export type PageData = {
  slug: string
  title: Bilingual
  subtitle?: Bilingual
  heroImage?: string
  heroTone?: 'green' | 'light' | 'orange'
  sections: Section[]
  metaDescription?: Bilingual
  status?: 'draft' | 'published' | 'archived'
  sortOrder?: number
}

export type NavItem = { label: Bilingual; href: string; featured?: boolean; children?: NavItem[] }
export type NavGroup = { label: Bilingual; items: NavItem[] }

export type ColorMode = 'light' | 'dark'
export type ContentCategory = 'project' | 'news' | 'notice' | 'career' | 'enterprise'
export type ContentEntry = {
  slug: string
  title: Bilingual
  excerpt: Bilingual
  date?: string
  category: ContentCategory
  image: MediaItem
  body: Bilingual[]
  tags?: Bilingual[]
  related?: string[]
  href?: string
  gallery?: MediaItem[]
  video?: { embedUrl: string; sourceUrl?: string }
}
export type ThemeDefinition = {
  label: Bilingual
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceAlt: string
  surfaceRaised: string
  border: string
  ink: string
  muted: string
  headerBg: string
  headerInk: string
  footerBg: string
  footerInk: string
  success: string
  warning: string
  danger: string
  focus: string
  darkBackground: string
  darkSurface: string
  darkSurfaceAlt: string
  darkSurfaceRaised: string
  darkBorder: string
  darkInk: string
  darkMuted: string
  darkHeaderBg: string
  darkHeaderInk: string
  darkFooterBg: string
  darkFooterInk: string
  typography: { body: string; display: string; tracking: string; radius: string }
}
export type UIContent = { en: Record<string,string>; bn: Record<string,string> }
export type ContactInfo = { email: string; primaryPhone: string; phones: string[]; address: Bilingual; maps: { headOffice: string }; socials: { linkedin: string }; footprint: { name: Bilingual; address: Bilingual; mapQuery: string; kind?: 'site' | 'branch' | 'footprint' }[] }

export type SDGStep = { n: string; en: string; bn: string; enText: string; bnText: string; Icon: LucideIcon }


export type ThemeName = string
export type SiteContextValue = { lang:Lang; setLang:(v:Lang)=>void; theme:ThemeName; setTheme:(v:ThemeName)=>void; shape:ShapeName; setShape:(v:ShapeName)=>void; mode:ColorMode; setMode:(v:ColorMode)=>void }

export type PaymentMethod = 'cards' | 'bkash' | 'nagad' | 'rocket' | 'internet'

export type PaymentInfo = {
  id: PaymentMethod
  icon: ComponentType<{ size?: number }>
  en: string
  bn: string
  noteEn: string
  noteBn: string
}

export type ContentCardItem = {
  title:Bilingual
  body?:Bilingual
  icon?:IconName
  image?:MediaItem
  illustration?:IllustrationName
  href?:string
  tag?:Bilingual
}