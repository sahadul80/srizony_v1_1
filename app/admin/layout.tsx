import './Admin.css'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import AdminThemeShell from './AdminThemeShell'
import { getThemeConfig } from '@/lib/site'
import { buildThemeCssVariables, parseThemeTokenOverrides, type RuntimeShapeName, type RuntimeThemeMap } from '@/lib/themeRuntime'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const rawTheme = cookieStore.get('sf-theme')?.value
  const rawMode = cookieStore.get('sf-mode')?.value
  const rawShape = cookieStore.get('sf-shape')?.value
  const shape: RuntimeShapeName = rawShape === 'soft' || rawShape === 'square' ? rawShape : 'rounded'
  const theme = ['forest', 'ocean', 'plum', 'sage', 'terracotta', 'midnight', 'sand'].includes(rawTheme || '') ? rawTheme || 'forest' : 'forest'
  const mode = rawMode === 'dark' ? 'dark' : 'light'
  const storedTokens = cookieStore.get('sf-theme-tokens')?.value
  let tokenOverrides: Record<string, string> = {}
  if (storedTokens) {
    try {
      tokenOverrides = parseThemeTokenOverrides(JSON.parse(decodeURIComponent(storedTokens)))
    } catch {}
  }

  const themeConfig = await getThemeConfig()
  const runtimeThemes = themeConfig.themes as RuntimeThemeMap
  const themeVars = buildThemeCssVariables(runtimeThemes, theme, mode, tokenOverrides, shape)

  return <AdminThemeShell themeVars={themeVars} themeConfig={runtimeThemes}>{children}</AdminThemeShell>
}
