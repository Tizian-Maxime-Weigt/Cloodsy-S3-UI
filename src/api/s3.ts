import { AwsClient } from 'aws4fetch'
import { debugError, debugInfo } from '../lib/debug'
import { assertHttpEndpointUrl } from '../lib/format'
import type { Credential } from '../types'

export interface S3Session {
  client: AwsClient
  endpoint: string
  accessKeyId: string
}

export function deriveS3Endpoint(adminUrl: string, s3Url?: string | null): string {
  if (s3Url?.trim()) return assertHttpEndpointUrl(s3Url, 'S3 URL')
  const admin = assertHttpEndpointUrl(adminUrl, 'Admin URL')
  try {
    const u = new URL(admin)
    if (u.port === '9001') u.port = '9000'
    else if (!u.port) u.port = '9000'
    else {
      const n = Number(u.port)
      if (!Number.isNaN(n) && n > 0) u.port = String(n - 1)
    }
    return u.origin
  } catch {
    return admin.replace(/:9001$/, ':9000')
  }
}

export function pickBucketCredential(
  credentials: Credential[],
): Credential | null {
  const withSecret = credentials.filter((c) => c.secretKey)
  if (!withSecret.length) return null
  return (
    withSecret.find((c) => c.permission === 'read-write') ?? withSecret[0] ?? null
  )
}

export function createS3Session(
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string,
): S3Session {
  const normalized = endpoint.replace(/\/$/, '')
  debugInfo('S3 session created', {
    endpoint: normalized,
    accessKeyId: `${accessKeyId.slice(0, 6)}…`,
  })
  return {
    endpoint: normalized,
    accessKeyId,
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'us-east-1',
      retries: 2,
    }),
  }
}

/** @deprecated use createS3Session */
export const createS3Client = createS3Session

export class S3OpsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'S3OpsError'
  }
}

function errMessage(e: unknown): string {
  if (e instanceof TypeError) {
    return `${e.message}. Check S3 URL and that config.yaml has server.cors_origins (e.g. ["*"]).`
  }
  if (e instanceof Error) return e.message
  return String(e)
}

function encodeKey(key: string): string {
  const trailing = key.endsWith('/')
  const encoded = key
    .split('/')
    .filter((p, i, arr) => p !== '' || (i > 0 && i < arr.length - 1))
    .map((part) => encodeURIComponent(part))
    .join('/')
  return trailing && !encoded.endsWith('/') ? `${encoded}/` : encoded
}

function objectUrl(endpoint: string, bucket: string, key: string): string {
  return `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(bucket)}/${encodeKey(key)}`
}

/** Public path-style object URL (works anonymously when bucket public-read is on). */
export function publicObjectUrl(
  endpoint: string,
  bucket: string,
  key: string,
): string {
  return objectUrl(endpoint, bucket, key)
}

export function publicBucketUrl(endpoint: string, bucket: string): string {
  return `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(bucket)}`
}

/**
 * Cloodsy serves normal GETs as Content-Disposition: attachment (browser downloads).
 * Image transform responses are inline — append a wide fit so the browser displays them.
 */
export function publicViewUrl(
  endpoint: string,
  bucket: string,
  key: string,
): string {
  const base = publicObjectUrl(endpoint, bucket, key)
  if (!isImageKey(key)) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}w=4096&m=f`
}

export function isImageKey(key: string, contentType?: string): boolean {
  if (contentType?.startsWith('image/')) return true
  const ext = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1).toLowerCase() : ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'].includes(ext)
}

async function toUint8Array(
  body: Blob | string | Uint8Array,
): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body
  if (typeof body === 'string') return new TextEncoder().encode(body)
  return new Uint8Array(await body.arrayBuffer())
}

async function readS3Error(res: Response): Promise<{ summary: string; body: string }> {
  const text = await res.text().catch(() => '')
  const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1]
  const message = text.match(/<Message>([^<]+)<\/Message>/)?.[1]
  let summary = `HTTP ${res.status}`
  if (code && message) summary = `${code}: ${message}`
  else if (message) summary = message
  else if (text) summary = text.slice(0, 200)
  return { summary, body: text }
}

async function s3Fetch(
  session: S3Session,
  action: string,
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  meta?: Record<string, unknown>,
): Promise<Response> {
  debugInfo(`S3 ${action} →`, { url, method: init.method, ...meta })
  try {
    const res = await session.client.fetch(url, init)
    if (!res.ok) {
      const { summary, body } = await readS3Error(res)
      debugError(`S3 ${action} failed`, {
        url,
        status: res.status,
        statusText: res.statusText,
        summary,
        body: body.slice(0, 1000),
        endpoint: session.endpoint,
        accessKeyId: `${session.accessKeyId.slice(0, 6)}…`,
      })
      throw new S3OpsError(`${action} failed: ${summary}`)
    }
    debugInfo(`S3 ${action} ✓`, { url, status: res.status })
    return res
  } catch (e) {
    if (e instanceof S3OpsError) throw e
    debugError(`S3 ${action} network/client error`, {
      url,
      endpoint: session.endpoint,
      error: errMessage(e),
      raw: e,
    })
    throw new S3OpsError(`${action} failed: ${errMessage(e)}`)
  }
}

export async function s3Upload(
  session: S3Session,
  bucket: string,
  key: string,
  body: Blob | string | Uint8Array,
  contentType?: string,
) {
  const bytes = await toUint8Array(body)
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
  const url = objectUrl(session.endpoint, bucket, key)
  await s3Fetch(
    session,
    'Upload',
    url,
    {
      method: 'PUT',
      body: ab,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
      },
    },
    { bucket, key, bytes: bytes.byteLength, contentType },
  )
}

export async function s3DownloadBlob(
  session: S3Session,
  bucket: string,
  key: string,
): Promise<{ blob: Blob; contentType?: string }> {
  const url = objectUrl(session.endpoint, bucket, key)
  const res = await s3Fetch(session, 'Download', url, { method: 'GET' }, { bucket, key })
  const contentType = res.headers.get('content-type') || undefined
  const buf = await res.arrayBuffer()
  return {
    blob: new Blob([buf], { type: contentType || 'application/octet-stream' }),
    contentType,
  }
}

export async function s3DownloadText(
  session: S3Session,
  bucket: string,
  key: string,
): Promise<string> {
  const { blob } = await s3DownloadBlob(session, bucket, key)
  return blob.text()
}

export async function s3Copy(
  session: S3Session,
  bucket: string,
  fromKey: string,
  toKey: string,
) {
  const copySource = `/${encodeURIComponent(bucket)}/${encodeKey(fromKey)}`
  const url = objectUrl(session.endpoint, bucket, toKey)
  await s3Fetch(
    session,
    'Copy',
    url,
    {
      method: 'PUT',
      headers: { 'x-amz-copy-source': copySource },
    },
    { bucket, fromKey, toKey, copySource },
  )
}

export async function s3Delete(session: S3Session, bucket: string, key: string) {
  const url = objectUrl(session.endpoint, bucket, key)
  await s3Fetch(session, 'Delete', url, { method: 'DELETE' }, { bucket, key })
}

export async function s3Rename(
  session: S3Session,
  bucket: string,
  fromKey: string,
  toKey: string,
) {
  await s3Copy(session, bucket, fromKey, toKey)
  await s3Delete(session, bucket, fromKey)
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const TEXT_EDIT_MAX_BYTES = 1_000_000

export function isTextEditable(key: string, contentType?: string, size?: number): boolean {
  if (size != null && size > TEXT_EDIT_MAX_BYTES) return false
  const ext = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1).toLowerCase() : ''
  const textExts = new Set([
    'txt',
    'md',
    'markdown',
    'json',
    'csv',
    'tsv',
    'log',
    'yml',
    'yaml',
    'xml',
    'html',
    'htm',
    'css',
    'scss',
    'js',
    'jsx',
    'ts',
    'tsx',
    'mjs',
    'cjs',
    'py',
    'go',
    'rs',
    'java',
    'kt',
    'sql',
    'sh',
    'bash',
    'env',
    'ini',
    'toml',
    'conf',
    'cfg',
    'svg',
  ])
  if (textExts.has(ext)) return true
  if (contentType?.startsWith('text/')) return true
  if (
    contentType &&
    ['application/json', 'application/xml', 'application/javascript'].includes(
      contentType,
    )
  )
    return true
  return false
}
