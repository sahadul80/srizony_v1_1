'use client'

import SafeImage from '@/components/ui/SafeImage'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Heart, Menu, Moon, RotateCcw, Settings2, Sun, X } from 'lucide-react'
import NavMenuTree from '@/components/ui/NavMenuTree'
import { FALLBACK_HOME_LABEL, FALLBACK_LOGO } from '@/lib/siteFallback'
import LanguageFlag from '@/components/ui/LanguageFlag'
import { useSite } from '@/components/containers/SiteProvider'
import type { NavItem } from '@/types/entityType'
import s from '@/app/css_extra/NavigationCustomizer.module.css'

/** Shared responsive navigation for desktop, tablet, and mobile layouts. */

const TOKEN_KEYS = [
  'primary', 'secondary', 'accent', 'background', 'surface', 'surfaceAlt', 'surfaceRaised', 'border',
  'ink', 'muted', 'headerBg', 'headerInk', 'footerBg', 'footerInk', 'success', 'warning', 'danger', 'focus',
  'darkBackground', 'darkSurface', 'darkSurfaceAlt', 'darkSurfaceRaised', 'darkBorder', 'darkInk',
  'darkMuted', 'darkHeaderBg', 'darkHeaderInk', 'darkFooterBg', 'darkFooterInk',
] as const


export default function NavBar() {
  const siteContext = useSite()
  const { lang, setLang, theme, setTheme, shape, setShape, mode, setMode, site } = siteContext
  const tokens = (siteContext as { tokens?: Record<string, string> }).tokens
  const setToken = (siteContext as { setToken?: (key: string, value: string) => void }).setToken ?? (() => undefined)

  const pathname = usePathname() ?? '/'
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null)
  const [mobileExpandedItems, setMobileExpandedItems] = useState<Record<string, boolean>>({})
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)

  const closeAll = useCallback(() => {
    setOpenGroup(null)
    setMobileOpen(false)
    setMobileOpenGroup(null)
    setMobileExpandedItems({})
    setCustomizeOpen(false)
  }, [])

  useEffect(() => closeAll(), [pathname, closeAll])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  // Sub-menus always open to the right; slide the dropdown left just enough that they stay on screen.
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    panel.style.translate = '0 0'
    const hasSub = panel.querySelector('.has-sub')
    const need = hasSub ? 272 : 0
    const r = panel.getBoundingClientRect()
    const overflow = r.right + need - (window.innerWidth - 16)
    if (overflow > 0) panel.style.translate = `${-Math.min(overflow, Math.max(r.left - 16, 0))}px 0`
  }, [openGroup])

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const updateHeight = () => header.style.setProperty('--sf-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [mobileOpen, stuck])

  useEffect(() => {
    const onScroll = () => {
      setStuck(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) closeAll()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAll()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [closeAll])

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    },
    [],
  )

  const data = site?.global
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn)

  if (!data) {
    return (
      <header className="sf-header" ref={headerRef}>
        <div className="sf-navbar"><div className="sf-container sf-navbar-in"><span className="sf-brand-text"><strong className="sf-brand-name">Srizony</strong><small className="sf-brand-sub">Foundation</small></span></div></div>
      </header>
    )
  }

  const { ui } = data
  const portfolioBrand = (data as any).portfolio?.brandIdentity || {}
  const brandText = (value: any, fallback: string) => typeof value === 'string' ? value : (value?.[lang] || value?.en || value?.bn || fallback)
  const brandName = brandText(portfolioBrand.name, tr('Srizony', 'সৃজনী'))
  const brandDescriptor = brandText(portfolioBrand.descriptor, tr('Foundation', 'ফাউন্ডেশন'))
  const brandLabel = `${brandName} ${brandDescriptor}`.trim()
  const themes = (data.themes ?? {}) as Record<string, { label: { en: string; bn: string }; primary: string } & Record<string, unknown>>
  const primaryNav = data.primaryNav ?? []
  const navGroups = data.navGroups ?? []
  const logo = data.images?.logo?.trim() || FALLBACK_LOGO
  const home = primaryNav[0] ?? { label: FALLBACK_HOME_LABEL, href: '/' }
  const extraNav = primaryNav.slice(1).filter((i) => i.href !== '/donate')

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))
  const itemActive = (item: NavItem): boolean => isActive(item.href) || Boolean(item.children?.some(itemActive))

  const hoverOpen = (key: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenGroup(key)
    setCustomizeOpen(false)
  }
  const hoverClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenGroup(null), 160)
  }

  const resetTokens =
    (siteContext as { resetTokens?: () => void }).resetTokens ??
    (() => {
      const current = themes[theme] as Record<string, unknown> | undefined
      TOKEN_KEYS.forEach((key) => {
        const value = current?.[key]
        if (typeof value === 'string') setToken(key, value)
      })
    })

  const brand = brandLabel

  const toggleMobileItem = (item: NavItem) => {
    const key = `${item.href}-${item.label.en}`
    setMobileExpandedItems((current) => ({ ...current, [key]: !current[key] }))
  }

  const renderMobileItem = (item: NavItem, depth = 0) => {
    const key = `${item.href}-${item.label.en}`
    const hasChildren = Boolean(item.children?.length)
    const expanded = Boolean(mobileExpandedItems[key])
    const active = itemActive(item)
    const style = { paddingInlineStart: `${16 + depth * 16}px` }
    const label = <span>{item.label[lang]}</span>
    return (
      <div className="sf-drawer-item" key={key}>
        {hasChildren ? (
          <button type="button" className={`sf-drawer-link ${active ? 'is-active' : ''}`} style={style} aria-expanded={expanded} onClick={() => toggleMobileItem(item)}>
            {label}<ChevronDown size={16} className={expanded ? 'is-rot' : ''} aria-hidden="true" />
          </button>
        ) : item.menuType === 'external' ? (
          <a href={item.href} target="_blank" rel="noopener noreferrer" className={`sf-drawer-link ${active ? 'is-active' : ''}`} style={style} onClick={closeAll}>{label}<ChevronDown size={14} aria-hidden="true" className="sf-drawer-external" /></a>
        ) : (
          <Link href={item.href} className={`sf-drawer-link ${active ? 'is-active' : ''}`} style={style} aria-current={active ? 'page' : undefined} onClick={closeAll}>{label}</Link>
        )}
        {hasChildren && expanded && <div className="sf-drawer-subitems">{item.children!.map((child) => renderMobileItem(child, depth + 1))}</div>}
      </div>
    )
  }

  return (
    <header className={`sf-header ${stuck ? 'is-stuck' : ''}`} ref={headerRef}>
      <div className="sf-navbar">
        <div className="sf-container sf-navbar-in">
          <Link href="/" className="sf-brand" aria-label={brand}>
            <span className="sf-brand-logo">
              <SafeImage src={logo} fallbackSrc={FALLBACK_LOGO} alt={brand} fallbackTitle="Srizony Foundation logo" fill priority sizes="80px" showSourceLinks={false} />
            </span>
            <span className="sf-brand-text">
              <strong className="sf-brand-name">{brandName}</strong>
              <small className="sf-brand-sub">{brandDescriptor}</small>
            </span>
          </Link>

          <nav className="sf-nav" aria-label={tr('Primary navigation', 'প্রধান মেনু')}>
            <Link href="/" className={`sf-nav-link ${isActive('/') ? 'is-active' : ''}`}><span className="sf-nav-label">{home.label[lang]}</span></Link>

            {navGroups.map((group) => {
              const key = group.label.en
              const open = openGroup === key
              return (
                <div key={key} className="sf-dd" onPointerEnter={(e) => e.pointerType === 'mouse' && hoverOpen(key)} onPointerLeave={(e) => e.pointerType === 'mouse' && hoverClose()}>
                  <button
                    type="button"
                    className={`sf-nav-link ${group.items.some(itemActive) || open ? 'is-active' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={open}
                    onClick={() => { setOpenGroup(open ? null : key); setCustomizeOpen(false) }}
                  >
                    <span className="sf-nav-label">{group.label[lang]}</span>
                    <ChevronDown size={14} className={open ? 'is-rot' : ''} aria-hidden="true" />
                  </button>
                  {open && (
                    <div className="sf-dd-panel" ref={panelRef}>
                      <NavMenuTree items={group.items} lang={lang} isActive={isActive} onNavigate={closeAll} />
                    </div>
                  )}
                </div>
              )
            })}

            {extraNav.map((item) => item.menuType === 'external' ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={`sf-nav-link ${isActive(item.href) ? 'is-active' : ''}`}><span className="sf-nav-label">{item.label[lang]}</span></a>
            ) : (
              <Link key={item.href} href={item.href} className={`sf-nav-link ${isActive(item.href) ? 'is-active' : ''}`}><span className="sf-nav-label">{item.label[lang]}</span></Link>
            ))}
          </nav>

          <div className="sf-navbar-cta">
            {/* Language toggle: flag only */}
            <button
              type="button"
              className={`${s.ctrl} sf-ctrl`}
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              aria-label={lang === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
              title={lang === 'en' ? 'বাংলা' : 'English'}
            >
              {lang === 'en' ? <LanguageFlag country="bd" /> : <LanguageFlag country="gb" />}
            </button>

            {/* Appearance customizer */}
            <div className={s.customize}>
              <button
                type="button"
                className={`${s.ctrl} sf-ctrl`}
                onClick={() => { setCustomizeOpen((v) => !v); setOpenGroup(null) }}
                aria-haspopup="dialog"
                aria-expanded={customizeOpen}
                title={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}
                aria-label={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}
              >
                <Settings2 size={18} />
              </button>

              {customizeOpen && (
                <div className={s.cPanel} role="dialog" aria-label={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}>
                  {Object.keys(themes).length > 0 && (
                    <div className={s.cSection}>
                      <strong>{tr('Theme family', 'থিম নির্বাচন')}</strong>
                      <div className={s.dots}>
                        {Object.keys(themes).map((x) => (
                          <button
                            type="button"
                            key={x}
                            aria-label={themes[x].label[lang]}
                            title={themes[x].label[lang]}
                            style={{ background: themes[x].primary }}
                            className={`${s.dot} ${theme === x ? s.dotOn : ''}`}
                            onClick={() => { setTheme(x); resetTokens() }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={s.cSection}>
                    <div className={s.cHead}>
                      <strong>{tr('Colour tokens', 'রঙের টোকেন')}</strong>
                      <button type="button" className={s.cReset} onClick={resetTokens}>
                        <RotateCcw size={13} />{tr('Reset', 'রিসেট')}
                      </button>
                    </div>
                    <div className={s.tokens}>
                      {TOKEN_KEYS.map((key) => {
                        const selected = (themes[theme] as Record<string, unknown> | undefined)?.[key]
                        const value = (tokens?.[key] || selected || '#000000') as string
                        return (
                          <label className={s.token} key={key}>
                            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <input type="color" value={value} onChange={(e) => setToken(key, e.target.value)} />
                            <code>{value}</code>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className={s.cSection}>
                    <strong>{tr('Component shape', 'কম্পোনেন্টের আকৃতি')}</strong>
                    <div className={s.shapes}>
                      {(['rounded', 'soft', 'square'] as const).map((x) => (
                        <button type="button" key={x} className={shape === x ? s.optOn : ''} onClick={() => setShape(x)}>
                          {lang === 'en' ? { rounded: 'Rounded', soft: 'Soft', square: 'Square' }[x] : { rounded: 'গোল', soft: 'নরম', square: 'চৌকো' }[x]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={s.cSection}>
                    <strong>{tr('Appearance', 'অ্যাপের মোড')}</strong>
                    <div className={s.modes}>
                      <button type="button" className={mode === 'light' ? s.optOn : ''} onClick={() => setMode('light')}><Sun size={15} />{tr('Light', 'লাইট')}</button>
                      <button type="button" className={mode === 'dark' ? s.optOn : ''} onClick={() => setMode('dark')}><Moon size={15} />{tr('Dark', 'ডার্ক')}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/donate" className="sf-btn sf-btn--accent sf-desktop-donate">
              <Heart size={15} aria-hidden="true" /> {ui[lang].donate}
            </Link>

            <button
              type="button"
              className="sf-burger"
              aria-label={mobileOpen ? tr('Close navigation menu', 'মেনু বন্ধ করুন') : tr('Open navigation menu', 'মেনু খুলুন')}
              aria-expanded={mobileOpen}
              aria-controls="sf-mobile-drawer"
              onClick={() => { setMobileOpen((open) => !open); setOpenGroup(null); setCustomizeOpen(false) }}
            >
              {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
          <>
            <div id="sf-mobile-drawer" className="sf-drawer" role="dialog" aria-modal="true" aria-label={tr('Navigation menu', 'নেভিগেশন মেনু')}>
              <nav className="sf-drawer-nav" aria-label={tr('Mobile navigation', 'মোবাইল নেভিগেশন')}>
                <Link href="/" className={`sf-drawer-link ${isActive('/') ? 'is-active' : ''}`} onClick={closeAll}>{home.label[lang]}</Link>
                {navGroups.map((group) => {
                  const key = group.label.en
                  const expanded = mobileOpenGroup === key
                  return (
                    <div className="sf-drawer-group" key={key}>
                      <button type="button" className={`sf-drawer-link ${group.items.some(itemActive) ? 'is-active' : ''}`} aria-expanded={expanded} onClick={() => setMobileOpenGroup(expanded ? null : key)}>
                        <span>{group.label[lang]}</span><ChevronDown size={16} className={expanded ? 'is-rot' : ''} aria-hidden="true" />
                      </button>
                      {expanded && <div className="sf-drawer-subitems">{group.items.map((item) => renderMobileItem(item))}</div>}
                    </div>
                  )
                })}
                {extraNav.map((item) => item.menuType === 'external' ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="sf-drawer-link" onClick={closeAll}>{item.label[lang]}</a>
                ) : (
                  <Link key={item.href} href={item.href} className={`sf-drawer-link ${isActive(item.href) ? 'is-active' : ''}`} onClick={closeAll}>{item.label[lang]}</Link>
                ))}
              </nav>
              <div className="sf-drawer-foot">
                <Link href="/donate" className="sf-btn sf-btn--primary sf-btn--block" onClick={closeAll}><Heart size={16} aria-hidden="true" /> {ui[lang].donate}</Link>
              </div>
            </div>
          </>
      )}
    </header>
  )
}
