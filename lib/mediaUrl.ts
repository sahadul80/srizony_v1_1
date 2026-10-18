/**
 * Normalize only legacy URLs that point into the private `uploads` bucket.
 * New approved image uploads point directly to `public-assets` (or its CDN base)
 * and remain direct URLs, so routine image traffic does not pass through Next.js.
 * The legacy resolver only serves a matching ready/public/image database row.
 */
export function normalizeMediaSrc(value: string | null | undefined): string {
  const src = typeof value === 'string' ? value.trim() : ''
  if (!src) return ''
  if (/^\/api\/media\//i.test(src)) return src

  let pathname = src
  try {
    pathname = new URL(src, 'https://local.invalid').pathname
  } catch {
    return src
  }

  // Neon S3 path-style URLs look like /uploads/media/2026/10/<uuid>-name.jpg.
  // Keep the private uploads bucket private; the compatibility route either streams
  // a still-unmigrated approved image or redirects to public-assets after migration.
  const match = pathname.match(/(?:^|\/)uploads\/(media\/.+)$/i)
  if (!match) return src

  const key = match[1]
  const encodedKey = key.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `/api/media/by-key/${encodedKey}`
}
