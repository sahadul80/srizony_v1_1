'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'

/** Pointer tilt and glow coordinates for cards; reduced automatically on touch screens. */
export function useTilt(max = 7) {
  return {
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') return
      const element = event.currentTarget
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      element.style.setProperty('--rx', `${((0.5 - y) * max * 2).toFixed(2)}deg`)
      element.style.setProperty('--ry', `${((x - 0.5) * max * 2).toFixed(2)}deg`)
      element.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      element.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => {
      event.currentTarget.style.setProperty('--rx', '0deg')
      event.currentTarget.style.setProperty('--ry', '0deg')
    },
  }
}
