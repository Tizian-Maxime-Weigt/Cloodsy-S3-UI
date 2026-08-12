export interface ServerConnection {
  id: string
  name: string
  url: string
  /** Optional S3 API endpoint; defaults to admin host with port 9000 */
  s3Url?: string
  username: string
}

export interface ServerStatus {
  status: string
  version: string
  buckets: number
  adminExists: boolean
  webdavEnabled: boolean
  webdavListen: string
}

export interface Bucket {
  id: number
  name: string
  quotaBytes: number
  versioning: string
  storageDir: string
  storagePath?: string | null
  publicRead: boolean
  webdavEnabled: boolean
  objects: number
  usageBytes: number
  credentials: number
  createdAt: string
}

export interface Credential {
  id: number
  name: string
  accessKey: string
  secretKey?: string | null
  permission: string
  createdAt: string
}

export interface LifecycleRule {
  id: number
  name: string
  prefix: string
  expirationDays: number
  createdAt: string
}

export interface Webhook {
  id: number
  name: string
  url: string
  eventTypes: string
  active: boolean
  createdAt: string
}

export interface S3Object {
  key: string
  size: number
  etag: string
  contentType: string
  lastModified: string
}

export interface ObjectListResult {
  objects: S3Object[]
  prefixes: string[]
  prefix: string
  truncated: boolean
  nextMarker: string
}

export interface AdminUser {
  id: number
  username: string
  createdAt: string
}

export type ThemeMode = 'light' | 'dark' | 'system'

export type BucketTab =
  | 'overview'
  | 'files'
  | 'credentials'
  | 'settings'
  | 'lifecycle'
  | 'webhooks'

export type AppView = 'welcome' | 'dashboard' | 'bucket' | 'admins'
