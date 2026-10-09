'use client'

import s from '../css_extra/CountryCodeSelect.module.css'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type CountryCode = { code: string; country: string; label: string }

type Props = {
  options: CountryCode[]
  /** ISO country code, e.g. "BD" (unique, unlike dial codes: US/CA both use +1) */
  value: string
  onChange: (iso: string) => void
  ariaLabel: string
  invalid?: boolean
}

type Pos = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxH: number
  flip: boolean
}

const EMPTY_POS: Pos = { left: 0, width: 260, top: 0, maxH: 248, flip: false }

export default function CountryCodeSelect({ options, value, onChange, ariaLabel, invalid }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<Pos>(EMPTY_POS)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', timer: 0 as number | undefined })
  const scrollMode = useRef<'none' | 'key' | 'open'>('open')
  const listId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => o.country === value))
  const selected = options[selectedIndex]

  // portal target only exists on the client
  useEffect(() => setMounted(true), [])

  /**
   * The panel is rendered in a portal on <body> with position: fixed, so no
   * ancestor (overflow, transforms, z-index / stacking contexts, the sticky
   * submit bar) can clip it or paint over it.
   */
  function measure() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight)

    const width = Math.min(Math.max(rect.width, 260), vw - 16)
    const left = Math.min(Math.max(8, rect.left), vw - width - 8)

    const below = vh - rect.bottom - 14
    const above = rect.top - 14
    const flip = below < 200 && above > below
    const room = (flip ? above : below) - 6
    const maxH = Math.max(140, Math.min(248, Math.floor(room)))

    setPos(
      flip
        ? { left, width, maxH, flip, bottom: window.innerHeight - rect.top + 6 }
        : { left, width, maxH, flip, top: rect.bottom + 6 },
    )
  }

  // outside click (trigger and portal panel both count as "inside")
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node
      if (triggerRef.current?.contains(el) || panelRef.current?.contains(el)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // keep the fixed panel glued to the trigger while the page scrolls / resizes
  useEffect(() => {
    if (!open) return
    const onScroll = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return
      if (e.target === listRef.current) return
      measure()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [open])

  /**
   * Active row is only scrolled into view for keyboard / first open.
   * Doing it on hover moves the list under the pointer -> flicker loop.
   */
  useEffect(() => {
    if (!open || scrollMode.current === 'none') return
    const list = listRef.current
    const el = list?.children[active] as HTMLElement | undefined
    if (!list || !el) return
    if (scrollMode.current === 'open') {
      list.scrollTop = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2
    } else if (el.offsetTop < list.scrollTop) {
      list.scrollTop = el.offsetTop - 5
    } else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 5
    }
  }, [open, active, pos.maxH])

  function openList() {
    measure()
    scrollMode.current = 'open'
    setActive(selectedIndex)
    setOpen(true)
  }

  function choose(index: number) {
    onChange(options[index].country)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    scrollMode.current = 'key'
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); break
      case 'Home': e.preventDefault(); setActive(0); break
      case 'End': e.preventDefault(); setActive(options.length - 1); break
      case 'Enter':
      case ' ': e.preventDefault(); choose(active); break
      case 'Escape': e.preventDefault(); setOpen(false); break
      case 'Tab': setOpen(false); break
      default:
        // type-ahead by ISO code, dial code or name, e.g. "b", "+9"
        if (e.key.length === 1) {
          window.clearTimeout(typed.current.timer)
          typed.current.text += e.key.toLowerCase()
          typed.current.timer = window.setTimeout(() => { typed.current.text = '' }, 700)
          const q = typed.current.text
          const hit = options.findIndex(
            (o) => o.country.toLowerCase().startsWith(q) || o.code.startsWith(q) || o.label.toLowerCase().startsWith(q),
          )
          if (hit >= 0) setActive(hit)
        }
    }
  }

  const panelStyle: CSSProperties = {
    left: pos.left,
    width: pos.width,
    top: pos.top,
    bottom: pos.bottom,
  }

  const panel = (
    <div
      ref={panelRef}
      className={`${s.panel} ${pos.flip ? s.panelTop : ''} ${open ? s.panelOpen : ''}`}
      style={panelStyle}
      aria-hidden={!open}
    >
      {/* the scroll container */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        className={s.list}
        style={{ maxHeight: pos.maxH }}
        tabIndex={-1}
      >
        {options.map((o, i) => {
          const isSelected = o.country === value
          return (
            <li
              key={`${o.country}-${o.code}`}
              role="option"
              aria-selected={isSelected}
              title={o.label}
              className={`${s.option} ${i === active ? s.optionActive : ''} ${isSelected ? s.optionSelected : ''}`}
              onPointerMove={(e) => {
                // hover highlight is for mouse/pen only; on touch a drag means "scroll"
                if (e.pointerType === 'touch') return
                if (active !== i) {
                  scrollMode.current = 'none'
                  setActive(i)
                }
              }}
              onClick={() => choose(i)}
            >
              <span className={s.iso}>{o.country}</span>
              <span className={s.name}>{o.label.replace(/\s*\(.*\)$/, '')}</span>
              <span className={s.dial}>{o.code}</span>
              {isSelected && <Check size={14} className={s.check} />}
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className={s.root}>
      <button
        ref={triggerRef}
        type="button"
        className={`${s.trigger} ${invalid ? s.invalid : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={s.value}>({selected.country}) {selected.code}</span>
        <ChevronDown size={16} className={`${s.chevron} ${open ? s.chevronOpen : ''}`} />
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </div>
  )
}