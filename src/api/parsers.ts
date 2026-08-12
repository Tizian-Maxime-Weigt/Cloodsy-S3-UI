import type {
  AdminUser,
  Bucket,
  Credential,
  LifecycleRule,
  ObjectListResult,
  S3Object,
  ServerStatus,
  Webhook,
} from '../types'

export function parseBucket(json: Record<string, unknown>): Bucket {
  return {
    id: Number(json.id ?? 0),
    name: String(json.name ?? ''),
    quotaBytes: Number(json.quota_bytes ?? 0),
    versioning: String(json.versioning ?? ''),
    storageDir: String(json.storage_dir ?? ''),
    storagePath: (json.storage_path as string | null | undefined) ?? null,
    publicRead: Boolean(json.public_read ?? false),
    webdavEnabled: Boolean(json.webdav_enabled ?? false),
    objects: Number(json.objects ?? 0),
    usageBytes: Number(json.usage_bytes ?? 0),
    credentials: Number(json.credentials ?? 0),
    createdAt: String(json.created_at ?? ''),
  }
}

export function parseCredential(json: Record<string, unknown>): Credential {
  return {
    id: Number(json.id ?? 0),
    name: String(json.name ?? ''),
    accessKey: String(json.access_key ?? ''),
    secretKey: (json.secret_key as string | null | undefined) ?? null,
    permission: String(json.permission ?? 'read-write'),
    createdAt: String(json.created_at ?? ''),
  }
}

export function parseLifecycleRule(json: Record<string, unknown>): LifecycleRule {
  return {
    id: Number(json.id ?? 0),
    name: String(json.name ?? ''),
    prefix: String(json.prefix ?? ''),
    expirationDays: Number(json.expiration_days ?? 0),
    createdAt: String(json.created_at ?? ''),
  }
}

export function parseWebhook(json: Record<string, unknown>): Webhook {
  return {
    id: Number(json.id ?? 0),
    name: String(json.name ?? ''),
    url: String(json.url ?? ''),
    eventTypes: String(json.event_types ?? '*'),
    active: Boolean(json.active ?? true),
    createdAt: String(json.created_at ?? ''),
  }
}

export function parseS3Object(json: Record<string, unknown>): S3Object {
  return {
    key: String(json.key ?? ''),
    size: Number(json.size ?? 0),
    etag: String(json.etag ?? ''),
    contentType: String(json.content_type ?? ''),
    lastModified: String(json.last_modified ?? ''),
  }
}

export function parseObjectList(json: Record<string, unknown>): ObjectListResult {
  return {
    objects: ((json.objects as Record<string, unknown>[]) ?? []).map(parseS3Object),
    prefixes: ((json.prefixes as unknown[]) ?? []).map(String),
    prefix: String(json.prefix ?? ''),
    truncated: Boolean(json.truncated ?? false),
    nextMarker: String(json.next_marker ?? ''),
  }
}

export function parseAdmin(json: Record<string, unknown>): AdminUser {
  return {
    id: Number(json.id ?? 0),
    username: String(json.username ?? ''),
    createdAt: String(json.created_at ?? ''),
  }
}

export function parseServerStatus(json: Record<string, unknown>): ServerStatus {
  const webdav = (json.webdav as Record<string, unknown> | undefined) ?? undefined
  return {
    status: String(json.status ?? 'unknown'),
    version: String(json.version ?? ''),
    buckets: Number(json.buckets ?? 0),
    adminExists: Boolean(json.admin_exists ?? false),
    webdavEnabled: Boolean(webdav?.enabled ?? false),
    webdavListen: String(webdav?.listen ?? ''),
  }
}
