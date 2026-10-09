import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client: S3Client | null = null

function config() {
  const bucket = process.env.NEON_OBJECT_STORAGE_BUCKET?.trim() || 'uploads'
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim()
  const region = process.env.AWS_REGION?.trim()
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Neon Object Storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.')
  }
  return { bucket, endpoint, region, accessKeyId, secretAccessKey }
}

export function getStorageClient() {
  const { endpoint, region, accessKeyId, secretAccessKey } = config()
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export async function uploadObject(key: string, body: Uint8Array, contentType: string, cacheControl = 'private, max-age=300') {
  const { bucket } = config()
  await getStorageClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  }))
}

export async function getObjectUrl(key: string, expiresIn = 300) {
  const { bucket } = config()
  return getSignedUrl(getStorageClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
}

export async function deleteObject(key: string) {
  const { bucket } = config()
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
