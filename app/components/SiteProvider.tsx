'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { ColorMode, Lang, ShapeName, ThemeName } from '@/types/entityType'
import type { PublicSiteSnapshot } from '@/types/site'
import { buildThemeCssVariables, type RuntimeThemeMap } from '@/lib/themeRuntime'
import { getPageSnapshot, getSessionProfile } from '@/lib/api/public'

type SiteProfile = {
  id: number
  email: string
  name: string
  phone?: string | null
  provider: 'google' | 'email'
  providerId: string
}

type SiteContextValue = {
  tokens: any
  lang: Lang
  setLang: (v: Lang) => void
  theme: ThemeName
  setTheme: (v: ThemeName) => void
  shape: ShapeName
  setShape: (v: ShapeName) => void
  mode: ColorMode
  setMode: (v: ColorMode) => void
  profile: SiteProfile | null
  refreshProfile: () => Promise<void>
  site: PublicSiteSnapshot | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SiteContext = createContext<SiteContextValue | null>(null)

export default function SiteProvider({
  children,
  initialPreferences,
  initialSite,
  initialLang = 'en',
}: {
  children: React.ReactNode
  initialPreferences?: {
    theme: ThemeName
    mode: ColorMode
    shape: ShapeName
  }
  initialSite?: PublicSiteSnapshot | null
  initialLang?: Lang
}) {
  const pathname = usePathname() || '/'
  const router = useRouter()

  const [lang, setLang] = useState<Lang>(initialLang)

  const [theme, setThemeState] = useState<ThemeName>(
    initialPreferences?.theme || 'forest',
  )

  const [shape, setShapeState] = useState<ShapeName>(
    initialPreferences?.shape || 'rounded',
  )

  const [mode, setModeState] = useState<ColorMode>(
    initialPreferences?.mode || 'light',
  )

  const [profile, setProfile] = useState<SiteProfile | null>(null)

  const [site, setSite] = useState<PublicSiteSnapshot | null>(
    initialSite || null,
  )

  const [loading, setLoading] = useState(!initialSite)

  const [error, setError] = useState<string | null>(null)

  /**
   * Legacy localStorage -> cookie migration.
   */
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(
      'sf-theme',
    ) as ThemeName | null

    const storedShape = window.localStorage.getItem(
      'sf-shape',
    ) as ShapeName | null

    const storedMode = window.localStorage.getItem(
      'sf-mode',
    ) as ColorMode | null

    if (storedTheme && storedTheme !== theme) {
      setThemeState(storedTheme)

      document.cookie = `sf-theme=${encodeURIComponent(
        storedTheme,
      )};path=/;max-age=31536000;samesite=lax`
    }

    if (
      storedShape &&
      ['rounded', 'soft', 'square'].includes(storedShape) &&
      storedShape !== shape
    ) {
      setShapeState(storedShape)

      document.cookie = `sf-shape=${encodeURIComponent(
        storedShape,
      )};path=/;max-age=31536000;samesite=lax`
    }

    if (
      (storedMode === 'light' || storedMode === 'dark') &&
      storedMode !== mode
    ) {
      setModeState(storedMode)

      document.cookie = `sf-mode=${storedMode};path=/;max-age=31536000;samesite=lax`
    }

    // Intentionally only runs on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Load current authenticated profile.
   */
  const refreshProfile = async () => {
    try {
      const { data } = (await getSessionProfile()) as { data: { user?: SiteProfile | null } }

      setProfile(data.user || null)
    } catch {
      setProfile(null)
    }
  }

  /**
   * Strip /bn from the pathname so the API always receives
   * the canonical content slug.
   */
  const canonicalPath =
    pathname === '/bn'
      ? '/'
      : pathname.startsWith('/bn/')
        ? pathname.slice(3) || '/'
        : pathname

  /**
   * Explicit content refresh.
   */
  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getPageSnapshot(canonicalPath)

      if (!response.ok) {
        throw new Error('Unable to load site content')
      }

      const data = response.data as {
        canonicalSlug: string
        page: PublicSiteSnapshot['page']
        notFound: boolean
      }

      setSite((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          canonicalSlug: data.canonicalSlug,
          page: data.page,
          notFound: data.notFound,
        }
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load site content',
      )
    } finally {
      setLoading(false)
    }
  }

  /**
   * Load page content whenever the canonical route changes.
   *
   * IMPORTANT:
   * We compare against the CURRENT site's canonicalSlug,
   * not initialSite?.canonicalSlug.
   *
   * This fixes:
   *   / -> /about-us -> /
   *
   * where the old page content previously remained in state.
   */
  useEffect(() => {
    const currentCanonicalSlug = site?.canonicalSlug

    // The current state already represents this route.
    if (currentCanonicalSlug === canonicalPath && site?.page) {
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getPageSnapshot(canonicalPath, controller.signal)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load site content')
        }

        return response.data as {
          canonicalSlug: string
          page: PublicSiteSnapshot['page']
          notFound: boolean
        }
      })
      .then((data) => {
        setSite((current) => {
          if (!current) {
            return current
          }

          return {
            ...current,
            canonicalSlug: data.canonicalSlug,
            page: data.page,
            notFound: data.notFound,
          }
        })
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load site content',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [canonicalPath, site?.canonicalSlug, site?.page])

  /**
   * Persist language.
   */
  useEffect(() => {
    window.localStorage.setItem('sf-lang', lang)

    document.cookie = `sf-lang=${lang};path=/;max-age=31536000;samesite=lax`

    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en'
  }, [lang])

  /**
   * Change language while preserving the current canonical route.
   */
  const setLanguage = (value: Lang) => {
    setLang(value)

    const currentIsBn =
      pathname === '/bn' || pathname.startsWith('/bn/')

    const canonical = currentIsBn
      ? pathname.slice(3) || '/'
      : pathname

    const target =
      value === 'bn'
        ? canonical === '/'
          ? '/bn'
          : `/bn${canonical}`
        : canonical

    if (target !== pathname) {
      router.push(target)
    }
  }

  /**
   * Theme setters.
   */
  const setTheme = (value: ThemeName) => {
    setThemeState(value)

    window.localStorage.setItem('sf-theme', value)

    document.cookie = `sf-theme=${encodeURIComponent(
      value,
    )};path=/;max-age=31536000;samesite=lax`

    document.documentElement.dataset.theme = value
  }

  const setShape = (value: ShapeName) => {
    setShapeState(value)

    window.localStorage.setItem('sf-shape', value)

    document.cookie = `sf-shape=${encodeURIComponent(
      value,
    )};path=/;max-age=31536000;samesite=lax`

    document.documentElement.dataset.shape = value
  }

  const setMode = (value: ColorMode) => {
    setModeState(value)

    window.localStorage.setItem('sf-mode', value)

    document.cookie = `sf-mode=${value};path=/;max-age=31536000;samesite=lax`

    document.documentElement.dataset.mode = value
  }

  /**
   * Keep HTML dataset attributes synchronized.
   */
  useEffect(() => {
    const root = document.documentElement

    root.dataset.theme = theme
    root.dataset.mode = mode
    root.dataset.shape = shape
  }, [theme, mode, shape])

  /**
   * Apply runtime theme variables.
   */
  useEffect(() => {
    const themeMap = (site?.global.themes || {}) as RuntimeThemeMap

    const cssVariables = buildThemeCssVariables(
      themeMap,
      theme,
      mode,
      {},
      shape,
    )

    ;(Object.entries(cssVariables) as Array<[string, string]>).forEach(
      ([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      },
    )
  }, [site, theme, mode, shape])

  const value = useMemo<SiteContextValue>(
    () => ({
      tokens: {},
      lang,
      setLang: setLanguage,
      theme,
      setTheme,
      shape,
      setShape,
      mode,
      setMode,
      profile,
      refreshProfile,
      site,
      loading,
      error,
      refresh,
    }),
    [
      lang,
      theme,
      shape,
      mode,
      profile,
      site,
      loading,
      error,
      pathname,
    ],
  )

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  )
}

export const useSite = () => {
  const ctx = useContext(SiteContext)

  if (!ctx) {
    throw new Error('useSite must be used inside SiteProvider')
  }

  return ctx
}