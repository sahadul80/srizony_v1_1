import { setDefaultResultOrder } from 'node:dns'
import { config } from 'dotenv'

// Neon HTTP uses Node's fetch. Prefer IPv4 first so local development does not
// fail when an IPv6 route/resolver is available but unusable. This mirrors the
// NODE_OPTIONS=--enable-network-family-autoselection workaround while keeping
// the fix inside the application.
setDefaultResultOrder('ipv4first')

// Keep standalone scripts (seed/repair/migrations) consistent with Next.js
// by loading local environment variables before reading DATABASE_URL.
config({ path: '.env.local' })
config({ path: '.env' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

const url = process.env.DATABASE_URL?.trim()

const sql = url ? neon(url) : null
export const db = sql ? drizzle({ client: sql }) : null

function isTransientDatabaseError(error: unknown) {
  const seen = new Set<unknown>()
  let current: unknown = error

  while (current && !seen.has(current)) {
    seen.add(current)
    const message = current instanceof Error ? current.message : String(current)
    if (/fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|UND_ERR|socket|network/i.test(message)) {
      return true
    }
    current = typeof current === 'object' && current !== null && 'cause' in current
      ? (current as { cause?: unknown }).cause
      : undefined
  }

  return false
}

export async function withDbRetry<T>(operation: () => Promise<T>, retries = 0): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt >= retries || !isTransientDatabaseError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Database request failed.')
}
