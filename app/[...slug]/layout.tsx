import type { ReactNode } from 'react'

/** Slug routes share the global app shell and render their CMS page through components/pages. */
export default function SlugLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
