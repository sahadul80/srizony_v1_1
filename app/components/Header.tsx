'use client'
import Link from 'next/link'
import SafeImage from './SafeImage'
import Image from 'next/image'
import { ChevronDown, Menu, X, Mail, Phone, Sun, Moon, Settings2, RotateCcw, Heart } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactElement } from 'react'
import { usePathname } from 'next/navigation'
import { localizeDigits } from '../../lib/utils'
import { useSite } from './SiteProvider'
import type { NavItem } from '../../types/entityType'
import { BangladeshFlag, BritishFlag } from './Flags'
import s from '../css_extra/Header.module.css'

// Desktop nav shows from 901px up; the CSS switches to the hamburger at max-width:900px.
const DESKTOP_BREAKPOINT = 901

const TOKEN_KEYS = [
  'primary', 'secondary', 'accent', 'background', 'surface', 'surfaceAlt', 'surfaceRaised', 'border',
  'ink', 'muted', 'headerBg', 'headerInk', 'footerBg', 'footerInk', 'success', 'warning', 'danger', 'focus',
  'darkBackground', 'darkSurface', 'darkSurfaceAlt', 'darkSurfaceRaised', 'darkBorder', 'darkInk',
  'darkMuted', 'darkHeaderBg', 'darkHeaderInk', 'darkFooterBg', 'darkFooterInk',
] as const

const nodeId = (parent: string, item: NavItem, index: number) => `${parent}-${item.href}-${index}`

// Remove an id and every descendant id (child ids are prefixed with the parent id).
const removeTree = (set: Set<string>, id: string) => {
  set.delete(id)
  for (const key of Array.from(set)) if (key.startsWith(`${id}-`)) set.delete(key)
}

export default function Header() {
  const siteContext = useSite()
  const { lang, setLang, theme, setTheme, shape, setShape, mode, setMode, site } = siteContext as typeof siteContext & {
    tokens?: Record<string, string>
    setToken?: (key: string, value: string) => void
  }
  const tokens = siteContext.tokens
  const setToken = (siteContext as { setToken?: (key: string, value: string) => void }).setToken ?? (() => undefined)
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [mobileGroupOpen, setMobileGroupOpen] = useState<string | null>(null)
  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set())
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [submenuSide, setSubmenuSide] = useState<Record<string, 'right' | 'left'>>({})
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const data = site?.global

  const closeAll = useCallback(() => {
    setOpen(null)
    setMobileOpen(false)
    setMobileGroupOpen(null)
    setOpenNodes(new Set())
    setCustomizeOpen(false)
  }, [])

  // All hooks must run on every render. The loading skeleton is rendered only
  // after the effect hooks so a transition from loading -> loaded cannot change
  // the hook order and trigger React's "Rendered more hooks" error.

  // Close every menu on route change (covers browser back/forward and any link click).
  useEffect(() => { closeAll() }, [pathname, closeAll])

  useEffect(() => {
    if (!mobileOpen) {
      setMobileGroupOpen(null)
      setOpenNodes(new Set())
    }
  }, [mobileOpen])

  // Lock page scroll while the mobile menu is open.
  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', mobileOpen)
    return () => document.body.classList.remove('mobile-menu-open')
  }, [mobileOpen])

  // If the viewport grows to desktop size while the mobile menu is open, close it
  // so the body scroll lock and mobile state don't get stuck.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${DESKTOP_BREAKPOINT}px)`)
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) { setMobileOpen(false); setOpenNodes(new Set()); setMobileGroupOpen(null) }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Deepen the bar's shadow and contract the brand once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.headerCondensed = scrolled ? 'true' : 'false'
    return () => {
      delete document.documentElement.dataset.headerCondensed
    }
  }, [scrolled])

  useEffect(() => {
    // pointerdown (not mousedown) so taps on touch devices are handled too.
    const closeOnOutside = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!headerRef.current?.contains(target)) closeAll()
    }
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [closeAll])

  if (!data) {
    return (
      <header className={`${s.header} ${s.skeleton}`}>
        <div className={`container ${s.barZone}`}>
          <div className={s.bar}>
            <div className={s.brand}>
              <span className={`brand-logo ${s.logo} ${s.skelLogo}`} />
              <span className={s.brandText}>
                <strong className={s.brandName}>Srizony</strong>
                <small className={s.brandSub}>Foundation</small>
              </span>
            </div>
            <div className={s.skelLine} />
          </div>
        </div>
      </header>
    )
  }

  const { navGroups, primaryNav, ui, contactInfo, images, themes } = data
  const t = (v: { en: string; bn: string }) => v[lang]
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn)
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))
  const navItemActive = (item: NavItem): boolean => active(item.href) || !!item.children?.some(navItemActive)

  const resetTokens = (siteContext as { resetTokens?: () => void }).resetTokens ?? (() => {
    const currentTheme = themes[theme]
    TOKEN_KEYS.forEach(key => {
      const value = currentTheme?.[key]
      if (typeof value === 'string') setToken(key, value)
    })
  })

  // Donate has its own dedicated button, so keep it out of the generic link lists
  // (prevents a duplicate Donate link on mobile).
  const extraNav = primaryNav.slice(1).filter(i => i.href !== '/donate')
  const desktopExtraNav = extraNav

  // Accordion behaviour: opening a node closes its siblings (and their descendants);
  // closing a node also closes everything nested inside it.
  const toggleNode = (id: string, siblingIds: string[]) => setOpenNodes(prev => {
    const next = new Set(prev)
    if (next.has(id)) {
      removeTree(next, id)
    } else {
      siblingIds.forEach(sid => removeTree(next, sid))
      next.add(id)
    }
    return next
  })
  const siblingIdsOf = (list: NavItem[], parent: string, self: string) =>
    list.map((sib, i) => nodeId(parent, sib, i)).filter(x => x !== self)

  const submenuLabel = (item: NavItem) => tr(`Open ${t(item.label)} submenu`, `${t(item.label)} সাবমেনু খুলুন`)

  const renderDesktopNode = (item: NavItem, index: number, parent: string, list: NavItem[]): ReactElement => {
    const id = nodeId(parent, item, index)
    const has = !!item.children?.length
    const nodeActive = navItemActive(item)
    const side = submenuSide[id] || 'right'
    const nodeOpen = openNodes.has(id)

    const prepareSubmenuSide = (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (!has || typeof window === 'undefined') return
      const rect = e.currentTarget.closest('[data-node]')?.getBoundingClientRect()
      if (!rect) return
      const roomRight = window.innerWidth - rect.right - 18
      const roomLeft = rect.left - 18
      const needed = 320
      setSubmenuSide(prev => ({ ...prev, [id]: roomRight < needed && roomLeft > roomRight ? 'left' : 'right' }))
    }

    return (
      <div key={id} data-node className={`${s.node} ${side === 'left' ? s.nodeLeft : ''}`}>
        <div className={s.nodeRow}>
          <Link
            className={`${s.nodeLink} ${item.featured ? s.featured : ''} ${nodeActive ? s.on : ''}`}
            href={item.href}
            aria-current={nodeActive && active(item.href) ? 'page' : undefined}
            onClick={closeAll}
          >
            {t(item.label)}
          </Link>
          {has && (
            <button
              type="button"
              className={s.nodeToggle}
              aria-label={submenuLabel(item)}
              aria-expanded={nodeOpen}
              onClick={e => { e.stopPropagation(); prepareSubmenuSide(e); toggleNode(id, siblingIdsOf(list, parent, id)) }}
            >
              <ChevronDown size={14} className={nodeOpen ? s.rotate : ''} />
            </button>
          )}
        </div>
        {has && nodeOpen && (
          <div className={s.subpanel}>
            {item.children!.map((child, ci) => renderDesktopNode(child, ci, id, item.children!))}
          </div>
        )}
      </div>
    )
  }

  const renderMobileNode = (item: NavItem, index: number, parent: string, list: NavItem[]): ReactElement => {
    const id = nodeId(parent, item, index)
    const has = !!item.children?.length
    const nodeActive = navItemActive(item)
    const nodeOpen = openNodes.has(id)
    return (
      <div key={id}>
        <div className={s.mNodeRow}>
          <Link
            className={`${s.mNodeLink} ${nodeActive ? s.on : ''}`}
            href={item.href}
            aria-current={nodeActive && active(item.href) ? 'page' : undefined}
            onClick={closeAll}
          >
            {t(item.label)}
          </Link>
          {has && (
            <button
              type="button"
              className={s.mToggle}
              onClick={() => toggleNode(id, siblingIdsOf(list, parent, id))}
              aria-label={submenuLabel(item)}
              aria-expanded={nodeOpen}
            >
              <ChevronDown size={16} className={nodeOpen ? s.rotate : ''} />
            </button>
          )}
        </div>
        {has && nodeOpen && (
          <div className={s.mSub}>
            {item.children!.map((child, ci) => renderMobileNode(child, ci, id, item.children!))}
          </div>
        )}
      </div>
    )
  }

  return (
    <header ref={headerRef} className={`${s.header} ${scrolled ? s.scrolled : ''}`}>
      {/* ── Main navigation bar ─────────────────────────── */}
      <div className={`container ${s.barZone}`}>
        <div className={s.bar}>
          <Link href="/" className={s.brand} onClick={closeAll} aria-current={active('/') ? 'page' : undefined}>
            <span className={`brand-logo ${s.logo}`}>
              <SafeImage
                src={images.logo}
                alt={tr('Srizony Foundation', 'সৃজনী ফাউন্ডেশন')}
                fallbackTitle="Srizony Foundation logo"
                fill
                priority
                sizes="62px"
                showSourceLinks={false}
              />
            </span>
            <span className={s.brandText}>
              <strong className={s.brandName}>{tr('Srizony', 'সৃজনী')}</strong>
              <small className={s.brandSub}>{tr('Foundation', 'ফাউন্ডেশন')}</small>
            </span>
          </Link>

          <nav className={s.desktopNav} aria-label="Primary navigation">
            <Link className={`${s.navLink} ${active('/') ? s.on : ''}`} href="/" onClick={closeAll}>
              {t(primaryNav[0].label)}
            </Link>

            {navGroups.map(g => {
              const groupActive = g.items.some(navItemActive)
              const groupOpen = open === g.label.en
              return (
                <div
                  key={g.label.en}
                  data-group={g.label.en}
                  className={`${s.dropdown} ${submenuSide[`group-${g.label.en}`] === 'left' ? s.dropLeft : ''}`}
                >
                  <button
                    className={`${s.navLink} ${groupActive || groupOpen ? s.on : ''}`}
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={groupOpen}
                    onClick={e => {
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect()
                      const needed = 340
                      if (rect) {
                        const roomRight = window.innerWidth - rect.right - 18
                        const roomLeft = rect.left - 18
                        setSubmenuSide(prev => ({ ...prev, [`group-${g.label.en}`]: roomRight < needed && roomLeft > roomRight ? 'left' : 'right' }))
                      }
                      setOpenNodes(new Set()) // don't carry open sub-menus over to another group
                      setCustomizeOpen(false)
                      setOpen(groupOpen ? null : g.label.en)
                    }}
                  >
                    {t(g.label)}
                    <ChevronDown className={groupOpen ? s.rotate : ''} size={15} />
                  </button>
                  {groupOpen && (
                    <div className={s.panel}>
                      {g.items.map((i, idx) => renderDesktopNode(i, idx, g.label.en, g.items))}
                    </div>
                  )}
                </div>
              )
            })}

            {desktopExtraNav.map(i => (
              <Link key={i.href} className={`${s.navLink} ${active(i.href) ? s.on : ''}`} href={i.href} onClick={closeAll}>
                {t(i.label)}
              </Link>
            ))}

            <Link className={`${s.donate} ${active('/donate') ? s.donateOn : ''}`} href="/donate" onClick={closeAll}>
              <Heart size={15} aria-hidden="true" />
              {ui[lang].donate}
            </Link>
          </nav>

          <div className={s.actions}>
            <button
              type="button"
              className={s.ctrl}
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              aria-label={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            >
              {lang === 'en' ? <BangladeshFlag /> : <BritishFlag />}
              <span className={s.ctrlLabel}>{ui[lang].language}</span>
            </button>

            <div className={s.customize}>
              <button
                type="button"
                className={s.ctrl}
                onClick={() => { setCustomizeOpen(v => !v); setMobileOpen(false); setOpen(null) }}
                aria-haspopup="dialog"
                aria-expanded={customizeOpen}
                title={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}
                aria-label={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}
              >
                <Settings2 size={18} />
                <span className={s.ctrlLabel}>{tr('Customise', 'কাস্টমাইজ')}</span>
              </button>

              {customizeOpen && (
                <div className={s.cPanel} role="dialog" aria-label={tr('Customise appearance', 'অ্যাপের চেহারা কাস্টমাইজ করুন')}>
                  <div className={s.cSection}>
                    <strong>{tr('Theme family', 'থিম নির্বাচন')}</strong>
                    <div className={s.dots}>
                      {Object.keys(themes).map(x => (
                        <button
                          type="button"
                          key={x}
                          aria-label={themes[x as keyof typeof themes].label[lang]}
                          style={{ background: themes[x]?.primary }}
                          className={`${s.dot} ${theme === x ? s.dotOn : ''}`}
                          onClick={() => { setTheme(x); resetTokens() }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={s.cSection}>
                    <div className={s.cHead}>
                      <strong>{tr('Colour tokens', 'রঙের টোকেন')}</strong>
                      <button type="button" className={s.cReset} onClick={resetTokens}>
                        <RotateCcw size={13} />{tr('Reset', 'রিসেট')}
                      </button>
                    </div>
                    <div className={s.tokens}>
                      {TOKEN_KEYS.map(key => {
                        const selected = themes[theme]?.[key]
                        const value = (tokens?.[key] || selected || '#000000') as string
                        return (
                          <label className={s.token} key={key}>
                            <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <input type="color" value={value} onChange={e => setToken(key, e.target.value)} />
                            <code>{value}</code>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className={s.cSection}>
                    <strong>{tr('Component shape', 'কম্পোনেন্টের আকৃতি')}</strong>
                    <div className={s.shapes}>
                      {(['rounded', 'soft', 'square'] as const).map(x => (
                        <button type="button" key={x} className={shape === x ? s.optOn : ''} onClick={() => setShape(x)}>
                          {lang === 'en'
                            ? { rounded: 'Rounded', soft: 'Soft', square: 'Square' }[x]
                            : { rounded: 'গোল', soft: 'নরম', square: 'চৌকো' }[x]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={s.cSection}>
                    <strong>{tr('Appearance', 'অ্যাপের মোড')}</strong>
                    <div className={s.modes}>
                      <button type="button" className={mode === 'light' ? s.optOn : ''} onClick={() => setMode('light')}>
                        <Sun size={15} />{tr('Light', 'লাইট')}
                      </button>
                      <button type="button" className={mode === 'dark' ? s.optOn : ''} onClick={() => setMode('dark')}>
                        <Moon size={15} />{tr('Dark', 'ডার্ক')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`${s.ctrl} ${s.menuBtn}`}
              onClick={() => { setMobileOpen(v => !v); setCustomizeOpen(false); setOpen(null) }}
              aria-label={ui[lang].menu}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile sheet ─────────────────────────────────── */}
      {mobileOpen && (
        
        <div className={s.mobile} id="mobile-menu">
          <div className={`container ${s.mobileInner}`}>

            <Link className={`${s.mRow} ${active('/') ? s.on : ''}`} href="/" onClick={closeAll}>
              {t(primaryNav[0].label)}
            </Link>

            {navGroups.map(g => {
              const groupActive = g.items.some(navItemActive)
              const groupIsOpen = mobileGroupOpen === g.label.en
              return (
                <div key={g.label.en}>
                  <button
                    type="button"
                    className={`${s.mRow} ${s.mGroupBtn} ${groupActive ? s.on : ''}`}
                    onClick={() => { setOpenNodes(new Set()); setMobileGroupOpen(groupIsOpen ? null : g.label.en) }}
                    aria-expanded={groupIsOpen}
                  >
                    {t(g.label)}
                    <ChevronDown className={groupIsOpen ? s.rotate : ''} size={18} />
                  </button>
                  {groupIsOpen && (
                    <div className={s.mItems}>
                      {g.items.map((i, idx) => renderMobileNode(i, idx, g.label.en, g.items))}
                    </div>
                  )}
                </div>
              )
            })}

            {extraNav.map(i => (
              <Link key={i.href} className={`${s.mRow} ${active(i.href) ? s.on : ''}`} href={i.href} onClick={closeAll}>
                {t(i.label)}
              </Link>
            ))}

            <Link className={s.mDonate} href="/donate" onClick={closeAll}>
              <Heart size={18} aria-hidden="true" />
              {ui[lang].donate}
            </Link>
          </div>

          <div className={s.mContact}>
            <div className={s.mIdentity}>
              <Image src="/images/Logo-SF.png" alt="Srizony Foundation" width={48} height={48} loading="eager"/>
              <div>
                <strong>{tr('Srizony Foundation', 'সৃজনী ফাউন্ডেশন')}</strong>
                <small>{tr('Community. Dignity. Opportunity.', 'কমিউনিটি • মর্যাদা • সুযোগ')}</small>
              </div>
            </div>

            <div className={s.mQuick}>
              <a className={s.mQuickLink} href={`tel:${contactInfo.primaryPhone}`}><Phone size={16} /><span>{tr('Call', 'কল')}</span></a>
              <a className={s.mQuickLink} href={`mailto:${contactInfo.email}`}><Mail size={16} /><span>{tr('Email', 'ইমেইল')}</span></a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}