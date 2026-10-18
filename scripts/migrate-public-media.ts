import { and, eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { mediaItems } from '../lib/db/schema'
import {
  getObject,
  getPrivateStorageBucket,
  getPublicAssetsBucket,
  getPublicObjectUrl,
  resolveStoredObjectKey,
  uploadObject,
} from '../lib/storage'

const apply = process.argv.includes('--apply')
const privateBucket = getPrivateStorageBucket()
const publicBucket = getPublicAssetsBucket()

function getMigratableKey(row: { storageKey: string | null; src: string }) {
  return resolveStoredObjectKey(row.storageKey, row.src)
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is missing. Configure it before migrating media.')
  if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    throw new Error('Neon Object Storage credentials are incomplete. Run `neon env pull --file .env.local` first.')
  }
  if (privateBucket === publicBucket) throw new Error('The private uploads bucket and public assets bucket must be different.')

  const rows = await db.select({
    id: mediaItems.id,
    src: mediaItems.src,
    storageKey: mediaItems.storageKey,
    storageBucket: mediaItems.storageBucket,
    contentType: mediaItems.contentType,
    sizeBytes: mediaItems.sizeBytes,
  }).from(mediaItems).where(and(
    eq(mediaItems.kind, 'image'),
    eq(mediaItems.isPublic, true),
    eq(mediaItems.status, 'ready'),
  ))

  const candidates = rows.filter((row) => {
    const bucket = row.storageBucket || privateBucket
    return bucket !== publicBucket && getMigratableKey(row) !== null
  })

  console.log(`Public image migration ${apply ? 'APPLY MODE' : 'DRY RUN'}`)
  console.log(`Source bucket: ${privateBucket}`)
  console.log(`Destination bucket: ${publicBucket}`)
  console.log(`Eligible database rows: ${candidates.length} / ${rows.length} ready public images`)
  if (!apply) {
    console.log('\nNo files were changed. Re-run with --apply to copy objects and update media_items.')
    for (const row of candidates.slice(0, 20)) console.log(`  [${row.id}] ${getMigratableKey(row)}`)
    if (candidates.length > 20) console.log(`  ...and ${candidates.length - 20} more`)
    return
  }

  let migrated = 0
  let skipped = 0
  const failures: string[] = []
  for (const row of candidates) {
    const key = getMigratableKey(row)
    if (!key) { skipped += 1; continue }
    const sourceBucket = row.storageBucket || privateBucket
    try {
      const oldObject = await getObject(key, sourceBucket)
      if (!oldObject.Body) throw new Error('Source object has no response body.')
      const bytes = await oldObject.Body.transformToByteArray()
      if (!bytes.byteLength) throw new Error('Source object is empty.')

      await uploadObject(
        key,
        bytes,
        oldObject.ContentType || row.contentType || 'application/octet-stream',
        'public, max-age=31536000, immutable',
        publicBucket,
      )

      const publicUrl = getPublicObjectUrl(key, publicBucket)
      await db.update(mediaItems).set({
        src: publicUrl,
        storageKey: key,
        storageBucket: publicBucket,
        updatedAt: new Date(),
      }).where(eq(mediaItems.id, row.id))
      migrated += 1
      console.log(`Migrated [${row.id}] ${key}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`[${row.id}] ${key}: ${message}`)
      console.error(`Failed [${row.id}] ${key}: ${message}`)
    }
  }

  console.log(`\nDone. Migrated: ${migrated}; skipped: ${skipped}; failed: ${failures.length}.`)
  if (failures.length) {
    console.error('Some objects were not migrated. Fix the listed errors and rerun; already-migrated records are skipped automatically.')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Public media migration failed:', error)
  process.exitCode = 1
})
