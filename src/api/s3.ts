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

function keyExt(key: string): string {
  const base = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
  return base.includes('.') ? base.slice(base.lastIndexOf('.') + 1).toLowerCase() : ''
}

export function guessContentType(name: string): string | undefined {
  const ext = keyExt(name)
  const map: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    xhtml: 'application/xhtml+xml',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    xml: 'application/xml',
    zip: 'application/zip',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  }
  return map[ext]
}

export function isImageKey(key: string, contentType?: string): boolean {
  if (contentType?.startsWith('image/')) return true
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'].includes(
    keyExt(key),
  )
}

/** Raster images Cloodsy can transform; SVG is not in that path. */
export function isRasterImageKey(key: string, contentType?: string): boolean {
  if (contentType) {
    if (!contentType.startsWith('image/')) return false
    if (contentType.includes('svg')) return false
  }
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico'].includes(keyExt(key))
}

export function isHtmlKey(key: string, contentType?: string): boolean {
  if (
    contentType?.startsWith('text/html') ||
    contentType === 'application/xhtml+xml'
  ) {
    return true
  }
  return ['html', 'htm', 'xhtml'].includes(keyExt(key))
}

export function isSvgKey(key: string, contentType?: string): boolean {
  if (contentType === 'image/svg+xml') return true
  return keyExt(key) === 'svg'
}

export function isPdfKey(key: string, contentType?: string): boolean {
  if (contentType === 'application/pdf') return true
  return keyExt(key) === 'pdf'
}

export function isVideoKey(key: string, contentType?: string): boolean {
  if (contentType?.startsWith('video/')) return true
  return ['mp4', 'mov', 'webm', 'mkv'].includes(keyExt(key))
}

export function isAudioKey(key: string, contentType?: string): boolean {
  if (contentType?.startsWith('audio/')) return true
  return ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(keyExt(key))
}

/** HTML/SVG must not be opened as same-origin blob tabs (stored XSS). */
export function needsSandboxedPreview(key: string, contentType?: string): boolean {
  return isHtmlKey(key, contentType) || isSvgKey(key, contentType)
}

export function canPreviewInBrowser(key: string, contentType?: string): boolean {
  return (
    needsSandboxedPreview(key, contentType) ||
    isRasterImageKey(key, contentType) ||
    isPdfKey(key, contentType) ||
    isVideoKey(key, contentType) ||
    isAudioKey(key, contentType)
  )
}

export function resolveViewContentType(key: string, contentType?: string): string {
  if (isHtmlKey(key, contentType)) return 'text/html;charset=utf-8'
  if (isSvgKey(key, contentType)) return 'image/svg+xml'
  if (contentType && contentType !== 'application/octet-stream') return contentType
  return guessContentType(key) || contentType || 'application/octet-stream'
}

export function blobForView(blob: Blob, key: string, contentType?: string): Blob {
  const type = resolveViewContentType(key, contentType || blob.type)
  if (blob.type === type) return blob
  return new Blob([blob], { type })
}

export const VIEW_MAX_BYTES = 32 * 1024 * 1024

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
  if (!isRasterImageKey(key)) return base
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}w=4096&m=f`
}

export const PRESIGN_MAX_SECONDS = 365 * 24 * 60 * 60

export const PRESIGN_DEFAULT_GET_SECONDS = 3600
export const PRESIGN_DEFAULT_PUT_SECONDS = 900

export const PRESIGN_EXPIRY_OPTIONS = [
  { label: '15 minutes', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21_600 },
  { label: '1 day', seconds: 86_400 },
  { label: '7 days', seconds: 7 * 24 * 60 * 60 },
  { label: '30 days', seconds: 30 * 24 * 60 * 60 },
  { label: '90 days', seconds: 90 * 24 * 60 * 60 },
  { label: '365 days', seconds: PRESIGN_MAX_SECONDS },
] as const

export type PresignMethod = 'GET' | 'PUT'

export interface PresignOptions {
  method?: PresignMethod
  /** Validity in seconds. Clamped to 1s–7 days (SigV4 signing-key lifetime). */
  expiresIn?: number
  /** Locked into PUT signatures; the uploader must send the same Content-Type. */
  contentType?: string
}

export async function s3PresignUrl(
  session: S3Session,
  bucket: string,
  key: string,
  options: PresignOptions = {},
): Promise<string> {
  const method: PresignMethod = options.method === 'PUT' ? 'PUT' : 'GET'
  const expiresIn = Math.min(
    PRESIGN_MAX_SECONDS,
    Math.max(1, Math.floor(options.expiresIn ?? (method === 'PUT' ? PRESIGN_DEFAULT_PUT_SECONDS : PRESIGN_DEFAULT_GET_SECONDS))),
  )
  const url = new URL(objectUrl(session.endpoint, bucket, key))
  url.searchParams.set('X-Amz-Expires', String(expiresIn))

  const contentType = method === 'PUT' ? options.contentType?.trim() : undefined
  const signed = await session.client.sign(url.toString(), {
    method,
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    aws: {
      signQuery: true,
      allHeaders: Boolean(contentType),
    },
  })
  return signed.url
}

export function presignPutExample(url: string, contentType?: string): string {
  const type = contentType || 'application/octet-stream'
  return `curl -X PUT -H "Content-Type: ${type}" --data-binary @file "${url}"`
}

export const MULTIPART_THRESHOLD = 16 * 1024 * 1024
export const MULTIPART_PART_SIZE = 8 * 1024 * 1024

export interface UploadProgress {
  bytesSent: number
  bytesTotal: number
  part?: number
  parts?: number
  bytesPerSecond?: number
}

function bodyByteLength(body: Blob | string | Uint8Array): number {
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength
  if (body instanceof Uint8Array) return body.byteLength
  return body.size
}

function toRequestBody(body: Blob | string | Uint8Array): BodyInit {
  if (typeof body === 'string') return body
  if (body instanceof Uint8Array) {
    return body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer
  }
  return body
}

function xmlTag(xml: string, tag: string): string | null {
  return xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1] ?? null
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

const XHR_SKIP_HEADERS = new Set([
  'content-length',
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'origin',
  'referer',
])

function parseXhrHeaders(raw: string): Headers {
  const headers = new Headers()
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const i = line.indexOf(':')
    if (i > 0) headers.append(line.slice(0, i).trim(), line.slice(i + 1).trim())
  }
  return headers
}

function createSpeedTracker() {
  let prevBytes = 0
  let prevAt = 0
  let ema = 0
  return (bytes: number) => {
    const now = performance.now()
    if (!prevAt) {
      prevBytes = bytes
      prevAt = now
      return 0
    }
    const dt = (now - prevAt) / 1000
    if (dt <= 0) return ema
    const inst = Math.max(0, (bytes - prevBytes) / dt)
    ema = ema === 0 ? inst : ema * 0.75 + inst * 0.25
    prevBytes = bytes
    prevAt = now
    return ema
  }
}

async function assertS3Ok(
  session: S3Session,
  action: string,
  url: string,
  res: Response,
): Promise<Response> {
  if (res.ok) {
    debugInfo(`S3 ${action} ✓`, { url, status: res.status })
    return res
  }
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

function wrapS3NetworkError(
  session: S3Session,
  action: string,
  url: string,
  e: unknown,
): never {
  if (e instanceof S3OpsError) throw e
  debugError(`S3 ${action} network/client error`, {
    url,
    endpoint: session.endpoint,
    error: errMessage(e),
    raw: e,
  })
  throw new S3OpsError(`${action} failed: ${errMessage(e)}`)
}

function xhrPut(
  signed: Request,
  body: XMLHttpRequestBodyInit,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(signed.method || 'PUT', signed.url)
    signed.headers.forEach((value, key) => {
      if (XHR_SKIP_HEADERS.has(key.toLowerCase())) return
      xhr.setRequestHeader(key, value)
    })
    let lastEmit = 0
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      const now = performance.now()
      if (e.loaded < e.total && now - lastEmit < 100) return
      lastEmit = now
      onProgress?.(e.loaded, e.total)
    }
    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
        }),
      )
    }
    xhr.onerror = () => reject(new TypeError('Network error'))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    xhr.send(body)
  })
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
    return await assertS3Ok(session, action, url, res)
  } catch (e) {
    wrapS3NetworkError(session, action, url, e)
  }
}

async function s3PutWithProgress(
  session: S3Session,
  action: string,
  url: string,
  body: Blob | string | Uint8Array,
  headers: Record<string, string>,
  meta: Record<string, unknown>,
  onByteProgress?: (loaded: number, total: number) => void,
): Promise<Response> {
  const payload = toRequestBody(body)
  debugInfo(`S3 ${action} →`, { url, method: 'PUT', ...meta })
  try {
    const signed = await session.client.sign(url, {
      method: 'PUT',
      body: payload,
      headers,
    })
    const res = await xhrPut(signed, payload as XMLHttpRequestBodyInit, onByteProgress)
    return await assertS3Ok(session, action, url, res)
  } catch (e) {
    wrapS3NetworkError(session, action, url, e)
  }
}

async function s3PutObject(
  session: S3Session,
  bucket: string,
  key: string,
  body: Blob | string | Uint8Array,
  contentType: string | undefined,
  bytes: number,
  onProgress?: (p: UploadProgress) => void,
) {
  const url = objectUrl(session.endpoint, bucket, key)
  const headers = {
    'Content-Type': contentType || 'application/octet-stream',
    'Content-Length': String(bytes),
  }
  const meta = { bucket, key, bytes, contentType }
  if (!onProgress) {
    await s3Fetch(
      session,
      'Upload',
      url,
      { method: 'PUT', body: toRequestBody(body), headers },
      meta,
    )
    return
  }
  const track = createSpeedTracker()
  await s3PutWithProgress(session, 'Upload', url, body, headers, meta, (loaded, total) => {
    onProgress({
      bytesSent: loaded,
      bytesTotal: total || bytes,
      bytesPerSecond: track(loaded),
    })
  })
  onProgress({
    bytesSent: bytes,
    bytesTotal: bytes,
    bytesPerSecond: track(bytes),
  })
}

async function s3AbortMultipart(
  session: S3Session,
  bucket: string,
  key: string,
  uploadId: string,
) {
  const url = `${objectUrl(session.endpoint, bucket, key)}?uploadId=${encodeURIComponent(uploadId)}`
  try {
    await s3Fetch(session, 'AbortMultipart', url, { method: 'DELETE' }, { bucket, key })
  } catch {
    /* best-effort */
  }
}

async function s3TryCreateMultipart(
  session: S3Session,
  bucket: string,
  key: string,
  contentType: string,
): Promise<string | null> {
  const initiateUrl = `${objectUrl(session.endpoint, bucket, key)}?uploads`
  try {
    const initRes = await s3Fetch(
      session,
      'CreateMultipart',
      initiateUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': contentType },
      },
      { bucket, key },
    )
    const uploadId = xmlTag(await initRes.text(), 'UploadId')
    return uploadId || null
  } catch (e) {
    debugError('Multipart not available, using single PUT', e)
    return null
  }
}

async function s3UploadMultipart(
  session: S3Session,
  bucket: string,
  key: string,
  blob: Blob,
  contentType: string,
  uploadId: string,
  onProgress?: (p: UploadProgress) => void,
) {
  const parts = Math.ceil(blob.size / MULTIPART_PART_SIZE)
  const etags: { partNumber: number; etag: string }[] = []
  const track = createSpeedTracker()

  try {
    for (let i = 0; i < parts; i++) {
      const start = i * MULTIPART_PART_SIZE
      const end = Math.min(start + MULTIPART_PART_SIZE, blob.size)
      const chunk = blob.slice(start, end)
      const partNumber = i + 1
      const partUrl = `${objectUrl(session.endpoint, bucket, key)}?partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`
      const emit = (loaded: number) => {
        onProgress?.({
          bytesSent: start + loaded,
          bytesTotal: blob.size,
          part: partNumber,
          parts,
          bytesPerSecond: track(start + loaded),
        })
      }
      const res = await s3PutWithProgress(
        session,
        'UploadPart',
        partUrl,
        chunk,
        {
          'Content-Type': contentType,
          'Content-Length': String(chunk.size),
        },
        { bucket, key, partNumber, parts, bytes: chunk.size },
        (loaded) => emit(loaded),
      )
      const etag = res.headers.get('etag') || res.headers.get('ETag')
      if (!etag) throw new S3OpsError(`Upload failed: missing ETag for part ${partNumber}`)
      etags.push({ partNumber, etag })
      emit(chunk.size)
    }

    const completeXml = `<CompleteMultipartUpload>${etags
      .map(
        (p) =>
          `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`,
      )
      .join('')}</CompleteMultipartUpload>`
    const completeUrl = `${objectUrl(session.endpoint, bucket, key)}?uploadId=${encodeURIComponent(uploadId)}`
    await s3Fetch(
      session,
      'CompleteMultipart',
      completeUrl,
      {
        method: 'POST',
        body: completeXml,
        headers: { 'Content-Type': 'application/xml' },
      },
      { bucket, key, parts },
    )
  } catch (e) {
    await s3AbortMultipart(session, bucket, key, uploadId)
    throw e
  }
}

export async function s3Upload(
  session: S3Session,
  bucket: string,
  key: string,
  body: Blob | string | Uint8Array,
  contentType?: string,
  onProgress?: (p: UploadProgress) => void,
) {
  const bytes = bodyByteLength(body)
  const type = contentType || 'application/octet-stream'
  onProgress?.({ bytesSent: 0, bytesTotal: bytes })

  if (body instanceof Blob && bytes >= MULTIPART_THRESHOLD) {
    const uploadId = await s3TryCreateMultipart(session, bucket, key, type)
    if (uploadId) {
      await s3UploadMultipart(session, bucket, key, body, type, uploadId, onProgress)
      return
    }
  }

  await s3PutObject(session, bucket, key, body, type, bytes, onProgress)
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

/** Anonymous GET of a public or presigned object URL (needs S3 CORS). */
export async function fetchObjectBlob(
  url: string,
): Promise<{ blob: Blob; contentType?: string }> {
  debugInfo('S3 FetchUrl →', { url })
  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'omit' })
  } catch (e) {
    debugError('S3 FetchUrl network/client error', { url, error: errMessage(e), raw: e })
    throw new S3OpsError(`Download failed: ${errMessage(e)}`)
  }
  if (!res.ok) {
    const { summary, body } = await readS3Error(res)
    debugError('S3 FetchUrl failed', { url, status: res.status, summary, body: body.slice(0, 1000) })
    throw new S3OpsError(`Download failed: ${summary}`)
  }
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
