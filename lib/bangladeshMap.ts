/**
 * Simplified national outline + equirectangular projection for the branch map.
 *
 * Markers are positioned from real latitude/longitude, so adding a branch only needs
 * coordinates. To use a more detailed outline later (for example your own division SVG),
 * replace OUTLINE (or OUTLINE_PATH) and keep BOUNDS in sync with the outline you use.
 */
export const MAP_W = 480
export const MAP_H = 680

export const BOUNDS = { lonMin: 88.0, lonMax: 92.7, latMin: 20.55, latMax: 26.65 } as const

export function project(lng: number, lat: number) {
  const x = ((lng - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * MAP_W
  const y = ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * MAP_H
  return { x, y, left: (x / MAP_W) * 100, top: (y / MAP_H) * 100 }
}

/** [lng, lat] clockwise from the northern tip (Tetulia). */
export const OUTLINE_COORDS: [number, number][] = [[88.35,26.45],[88.45,26.62],[88.62,26.46],[88.75,26.31],[88.92,26.27],[89.01,26.38],[89.13,26.24],[89.28,26.17],[89.46,26.2],[89.6,26.28],[89.76,26.1],[89.86,25.93],[89.82,25.62],[89.86,25.38],[90.0,25.28],[90.22,25.2],[90.46,25.12],[90.76,25.17],[91.02,25.16],[91.3,25.18],[91.6,25.14],[91.86,25.17],[92.05,25.18],[92.17,25.08],[92.22,24.92],[92.1,24.74],[92.02,24.5],[91.9,24.34],[91.84,24.16],[91.62,24.14],[91.4,24.14],[91.26,24.04],[91.19,23.88],[91.26,23.68],[91.36,23.5],[91.4,23.3],[91.46,23.12],[91.72,23.0],[91.82,23.3],[92.0,23.62],[92.2,23.68],[92.36,23.3],[92.46,23.04],[92.58,22.76],[92.6,22.42],[92.58,22.1],[92.46,21.82],[92.32,21.46],[92.22,21.24],[92.3,21.0],[92.31,20.8],[92.34,20.6],[92.26,20.62],[92.24,20.8],[92.14,21.06],[92.02,21.4],[91.96,21.6],[91.88,21.9],[91.86,22.14],[91.8,22.3],[91.68,22.44],[91.6,22.6],[91.46,22.82],[91.38,22.92],[91.3,22.7],[91.12,22.62],[91.0,22.8],[90.9,22.58],[90.92,22.28],[90.74,22.06],[90.5,21.86],[90.24,21.8],[89.95,21.84],[89.62,21.86],[89.34,21.78],[89.12,21.7],[89.04,21.92],[88.96,22.2],[88.95,22.46],[89.02,22.72],[88.92,22.94],[88.88,23.06],[88.8,23.36],[88.7,23.54],[88.62,23.74],[88.54,23.96],[88.42,24.18],[88.24,24.38],[88.06,24.58],[88.0,24.8],[88.14,25.0],[88.28,25.2],[88.5,25.38],[88.58,25.62],[88.56,25.88],[88.28,26.06],[88.16,26.26],[88.2,26.42]]

type Pt = { x: number; y: number }

/** Chaikin corner-cutting: rounds the polygon so it reads as a smooth coastline. */
function smooth(points: Pt[], iterations = 2): Pt[] {
  let current = points
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = []
    for (let i = 0; i < current.length; i++) {
      const p = current[i]
      const q = current[(i + 1) % current.length]
      next.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y })
      next.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y })
    }
    current = next
  }
  return current
}

export const OUTLINE_PATH =
  smooth(OUTLINE_COORDS.map(([lng, lat]) => project(lng, lat)))
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z'
