export type RuntimeThemePalette = Record<string, unknown> & {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  surface?: string
  surfaceAlt?: string
  surfaceRaised?: string
  border?: string
  ink?: string
  muted?: string
  headerBg?: string
  headerInk?: string
  footerBg?: string
  footerInk?: string
  success?: string
  warning?: string
  danger?: string
  focus?: string
  darkBackground?: string
  darkSurface?: string
  darkSurfaceAlt?: string
  darkSurfaceRaised?: string
  darkBorder?: string
  darkInk?: string
  darkMuted?: string
  darkHeaderBg?: string
  darkHeaderInk?: string
  darkFooterBg?: string
  darkFooterInk?: string
  typography?: {
    body?: string
    display?: string
    tracking?: string
    radius?: string
  }
}

export type RuntimeThemeMap = Record<string, RuntimeThemePalette>
export type RuntimeShapeName = 'rounded' | 'soft' | 'square'

const HEX = /^#[0-9a-fA-F]{6}$/

function hex(value: unknown, fallback: string) {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}

function contrastInk(value: string) {
  const normalized = value.slice(1)
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255)
  const linear = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  return luminance > 0.54 ? '#12221a' : '#f5fbf7'
}

export function parseThemeTokenOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const entries = Object.entries(source).filter(([, token]) => typeof token === 'string' && HEX.test(token)) as Array<[string, string]>
  return Object.fromEntries(entries) as Record<string, string>
}

export function buildThemeCssVariables(
  themes: RuntimeThemeMap,
  themeName: string,
  mode: 'light' | 'dark',
  overrides: Record<string, string> = {},
  shape: RuntimeShapeName = 'rounded',
): Record<string, string> {
  const base = themes[themeName] || themes.forest || Object.values(themes)[0] || {}
  const theme = { ...base, ...overrides } as RuntimeThemePalette
  const dark = mode === 'dark'

  const primary = hex(theme.primary, '#137b50')
  const secondary = hex(theme.secondary, '#e56a3f')
  const accent = hex(theme.accent, '#f4c94b')
  const background = hex(dark ? theme.darkBackground : theme.background, '#f7faf8')
  const surface = hex(dark ? theme.darkSurface : theme.surface, '#ffffff')
  const surfaceAlt = hex(dark ? theme.darkSurfaceAlt : theme.surfaceAlt, '#eef6f1')
  const surfaceRaised = hex(dark ? theme.darkSurfaceRaised : theme.surfaceRaised, '#ffffff')
  const border = hex(dark ? theme.darkBorder : theme.border, '#dbe7e0')
  const ink = hex(dark ? theme.darkInk : theme.ink, '#17251e')
  const muted = hex(dark ? theme.darkMuted : theme.muted, '#66756d')
  const headerBg = hex(dark ? theme.darkHeaderBg : theme.headerBg, '#ffffff')
  const headerInk = hex(dark ? theme.darkHeaderInk : theme.headerInk, '#22352b')
  const footerBg = hex(dark ? theme.darkFooterBg : theme.footerBg, '#0f2419')
  const footerInk = hex(dark ? theme.darkFooterInk : theme.footerInk, '#f2faf5')
  const primaryStrong = dark
    ? `color-mix(in srgb, ${primary} 55%, ${footerInk})`
    : `color-mix(in srgb, ${primary} 82%, ${ink})`
  const link = dark ? primaryStrong : primary
  const navActive = dark ? footerInk : primary
  const navActiveBg = dark
    ? `color-mix(in srgb, ${navActive} 13%, ${surface})`
    : `color-mix(in srgb, ${primary} 9%, ${surface})`
  const activeDarkBackground = hex(theme.darkBackground, '#0b1510')
  const onPrimary = contrastInk(primary)
  const onSecondary = contrastInk(secondary)
  const onAccent = contrastInk(accent)
  const themeRadius = theme.typography?.radius || '18px'
  const shapeRadius = shape === 'soft' ? '10px' : shape === 'square' ? '2px' : themeRadius

  return {
    '--sf-primary': primary,
    '--sf-secondary': secondary,
    '--sf-accent': accent,
    '--sf-bg': background,
    '--sf-card': surface,
    '--sf-surface': surface,
    '--sf-soft': surfaceAlt,
    '--sf-surface-muted': surfaceAlt,
    '--sf-raised': surfaceRaised,
    '--sf-panel': surfaceRaised,
    '--sf-panel-hover': surfaceAlt,
    '--sf-input': surfaceAlt,
    '--sf-border': border,
    '--sf-border-soft': border,
    '--sf-border-strong': border,
    '--sf-divider': border,
    '--sf-ink': ink,
    '--sf-muted': muted,
    '--sf-header-bg': headerBg,
    '--sf-header-ink': headerInk,
    '--sf-footer-bg': footerBg,
    '--sf-footer-ink': footerInk,
    '--sf-footer-text': footerInk,
    '--sf-footer-muted': muted,
    '--sf-footer-border': border,
    '--sf-success': hex(theme.success, '#2e8b57'),
    '--sf-warning': hex(theme.warning, '#b97816'),
    '--sf-danger': hex(theme.danger, '#c54848'),
    '--sf-focus': hex(theme.focus, '#239b68'),
    '--sf-on-primary': onPrimary,
    '--sf-text-on-primary': onPrimary,
    '--sf-on-secondary': onSecondary,
    '--sf-on-accent': onAccent,
    '--sf-primary-strong': primaryStrong,
    '--sf-link': link,
    '--sf-nav-active': navActive,
    '--sf-nav-active-bg': navActiveBg,
    '--sf-nav-active-border': navActive,
    '--sf-nav-active-text': navActive,
    '--sf-hero-bg': `color-mix(in srgb, ${primary} 26%, ${activeDarkBackground})`,
    '--sf-overlay': `color-mix(in srgb, ${activeDarkBackground} 68%, transparent)`,
    // One typeface for the whole site (the loaded Inter + Noto Sans Bengali stack); themes change colour and shape, not type.
    '--sf-font-body': "var(--font-body),'Noto Sans Bengali','Hind Siliguri',system-ui,sans-serif",
    '--sf-font-display': "var(--font-body),'Noto Sans Bengali','Hind Siliguri',system-ui,sans-serif",
    '--sf-tracking': '-0.02em',
    '--sf-radius-theme': themeRadius,
    '--sf-radius-shape': shapeRadius,
  }
}
