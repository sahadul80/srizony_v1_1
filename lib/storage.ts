import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

let client: S3Client | null = null

type StorageConfig = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

function config(): StorageConfig {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim()
  const region = process.env.AWS_REGION?.trim()
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Neon Object Storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
  }
  return { endpoint, region, accessKeyId, secretAccessKey }
}

/** Private bucket used for non-public uploads. Kept compatible with prior deployments. */
export function getPrivateStorageBucket() {
  return process.env.NEON_OBJECT_STORAGE_BUCKET?.trim() || 'uploads'
}

/** Public-read bucket for approved website image assets. */
export function getPublicAssetsBucket() {
  return process.env.NEON_PUBLIC_ASSETS_BUCKET?.trim() || 'public-assets'
}


/**
 * Resolve keys from modern storage_key fields and legacy source URLs.
 * Absolute legacy URLs are only accepted when they use this branch's configured
 * Neon storage endpoint; arbitrary remote image URLs are not treated as storage keys.
 */
export function resolveStoredObjectKey(storageKey: string | null | undefined, src: string | null | undefined) {
  const candidates = [storageKey, src].map((value) => typeof value === 'string' ? value.trim() : '').filter(Boolean)
  for (const candidate of candidates) {
    if (isSafeMediaKey(candidate)) return candidate
    let parsed: URL
    let absolute = false
    try {
      absolute = /^https?:\/\//i.test(candidate)
      parsed = new URL(candidate, 'https://local.invalid')
    } catch {
      continue
    }
    const match = parsed.pathname.match(/(?:^|\/)(?:uploads|public-assets)\/(media\/.+)$/i)
    if (!match) continue
    if (absolute) {
      const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim()
      if (!endpoint) continue
      try {
        if (new URL(endpoint).origin !== parsed.origin) continue
      } catch {
        continue
      }
    }
    let key: string
    try {
      key = match[1].split('/').map((part) => decodeURIComponent(part)).join('/')
    } catch {
      continue
    }
    if (isSafeMediaKey(key)) return key
  }
  return null
}

function isSafeMediaKey(key: string) {
  return key.startsWith('media/') && !key.startsWith('/') && !key.includes('\\') &&
    !key.split('/').some((segment) => !segment || segment === '.' || segment === '..')
}

/**
 * Return the public object URL for assets placed in a `public_read` bucket.
 * Optional NEON_PUBLIC_ASSETS_BASE_URL can point to a CDN/custom-domain base
 * already ending in the bucket name; otherwise the Neon S3 endpoint is used.
 */
export function getPublicObjectUrl(key: string, bucket = getPublicAssetsBucket()) {
  const cleanKey = key.split('/').filter(Boolean).map((segment) => encodeURIComponent(segment)).join('/')
  if (!cleanKey || key.split('/').some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    throw new Error('Invalid object key.')
  }

  const customBase = process.env.NEON_PUBLIC_ASSETS_BASE_URL?.trim().replace(/\/+$/, '')
  if (customBase && bucket === getPublicAssetsBucket()) return `${customBase}/${cleanKey}`

  const { endpoint } = config()
  return `${endpoint.replace(/\/+$/, '')}/${encodeURIComponent(bucket)}/${cleanKey}`
}

export function getStorageClient() {
  const { endpoint, region, accessKeyId, secretAccessKey } = config()
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      // Needed for reliable uploads on S3-compatible Neon storage: the SDK should
      // not add an unsupported checksum header to PutObject requests by default.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }
  return client
}

export async function uploadObject(
  key: string,
  body: Uint8Array,
  contentType: string,
  cacheControl = 'private, max-age=300',
  bucket = getPrivateStorageBucket(),
) {
  await getStorageClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  }))
}

export async function getObject(key: string, bucket = getPrivateStorageBucket()) {
  return getStorageClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
}

export async function deleteObject(key: string, bucket = getPrivateStorageBucket()) {
  await getStorageClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'upload'
}
