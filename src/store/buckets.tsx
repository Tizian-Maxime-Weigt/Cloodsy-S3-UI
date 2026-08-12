import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiException } from '../api/client'
import { LiveClient } from '../api/live'
import {
  bucketFingerprint,
  bucketsFingerprint,
  mergeBucket,
  parseAdmin,
  parseBucket,
  parseCredential,
  parseLifecycleRule,
  parseObjectList,
  parseServerStatus,
  parseWebhook,
  statusFingerprint,
} from '../api/parsers'
import { compareVersions } from '../lib/format'
import {
  liveBucketName,
  liveMessageType,
  livePayload,
  liveStringList,
  type LiveFocus,
  type LiveMode,
} from '../lib/live'
import type {
  AdminUser,
  Bucket,
  Credential,
  LifecycleRule,
  ObjectListResult,
  ServerStatus,
  Webhook,
} from '../types'
import { useAuth } from './auth'

export type SilentFetch = { silent?: boolean }

interface BucketStoreValue {
  buckets: Bucket[]
  isLoading: boolean
  error: string | null
  selectedBucket: Bucket | null
  credentials: Credential[]
  lifecycleRules: LifecycleRule[]
  webhooks: Webhook[]
  serverStatus: ServerStatus | null
  latestVersion: string | null
  updateAvailable: boolean
  webdavMountUrl: string | null
  objectList: ObjectListResult | null
  objectsLoading: boolean
  admins: AdminUser[]
  liveMode: LiveMode
  lastSyncedAt: number | null
  setLiveFocus: (focus: LiveFocus | null) => void
  setLivePrefix: (prefix: string) => void
  clearError: () => void
  fetchStatus: (opts?: SilentFetch) => Promise<void>
  fetchBuckets: (opts?: SilentFetch) => Promise<void>
  fetchBucketDetail: (name: string, opts?: SilentFetch) => Promise<void>
  createBucket: (name: string, storageDir?: string) => Promise<boolean>
  deleteBucket: (name: string) => Promise<boolean>
  setQuota: (name: string, quotaBytes: number) => Promise<boolean>
  setStorage: (name: string, storageDir: string) => Promise<boolean>
  setVersioning: (name: string, state: string) => Promise<boolean>
  setPublicRead: (name: string, enabled: boolean) => Promise<boolean>
  setWebdavEnabled: (name: string, enabled: boolean) => Promise<boolean>
  reprocessImages: (name: string) => Promise<boolean>
  fetchCredentials: (bucketName: string, opts?: SilentFetch) => Promise<void>
  createCredential: (
    bucketName: string,
    name: string,
    permission: string,
  ) => Promise<Credential | null>
  deleteCredential: (accessKey: string, bucketName: string) => Promise<boolean>
  fetchLifecycleRules: (bucketName: string, opts?: SilentFetch) => Promise<void>
  addLifecycleRule: (
    bucketName: string,
    name: string,
    prefix: string,
    days: number,
  ) => Promise<boolean>
  deleteLifecycleRules: (bucketName: string, prefix?: string) => Promise<boolean>
  fetchWebhooks: (bucketName: string, opts?: SilentFetch) => Promise<void>
  addWebhook: (
    bucketName: string,
    name: string,
    url: string,
    events?: string,
    secret?: string,
  ) => Promise<boolean>
  deleteWebhook: (id: number, bucketName: string) => Promise<boolean>
  fetchObjects: (
    bucketName: string,
    prefix?: string,
    marker?: string,
    opts?: SilentFetch,
  ) => Promise<void>
  deleteObject: (bucketName: string, key: string) => Promise<boolean>
  deletePrefix: (bucketName: string, prefix: string) => Promise<boolean>
  fetchAdmins: (opts?: SilentFetch) => Promise<void>
  createAdmin: (
    username: string,
    password: string,
  ) => Promise<Record<string, unknown> | null>
  deleteAdmin: (username: string) => Promise<boolean>
  resetAdminPassword: (
    username: string,
    password: string,
  ) => Promise<Record<string, unknown> | null>
}

const BucketStoreContext = createContext<BucketStoreValue | null>(null)

const GITHUB_REPO = 'onaonbir/Cloodsy-S3'

function replaceIfChanged(prev: Bucket[], next: Bucket[]): Bucket[] {
  return bucketsFingerprint(prev) === bucketsFingerprint(next) ? prev : next
}

export function BucketStoreProvider({ children }: { children: ReactNode }) {
  const { api, token, isLoggedIn } = useAuth()

  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [lifecycleRules, setLifecycleRules] = useState<LifecycleRule[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [objectList, setObjectList] = useState<ObjectListResult | null>(null)
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [liveMode, setLiveMode] = useState<LiveMode>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [liveFocus, setLiveFocusState] = useState<LiveFocus | null>(null)

  const liveFocusRef = useRef<LiveFocus | null>(null)
  const liveClientRef = useRef<LiveClient | null>(null)
  const objectsGen = useRef(0)
  const objectsPaged = useRef(false)
  const selectedNameRef = useRef<string | null>(null)

  liveFocusRef.current = liveFocus

  const clearError = useCallback(() => setError(null), [])
  const touchSync = useCallback(() => setLastSyncedAt(Date.now()), [])

  const setLiveFocus = useCallback((focus: LiveFocus | null) => {
    liveFocusRef.current = focus
    setLiveFocusState(focus)
    liveClientRef.current?.setFocus(focus)
  }, [])

  const setLivePrefix = useCallback((prefix: string) => {
    setLiveFocusState((prev) => {
      if (!prev) return prev
      if (prev.prefix === prefix) return prev
      const next = { ...prev, prefix }
      liveFocusRef.current = next
      liveClientRef.current?.setFocus(next)
      return next
    })
  }, [])

  const patchBucket = useCallback((name: string, patch: Partial<Bucket>) => {
    setSelectedBucket((prev) => {
      if (!prev || prev.name !== name) return prev
      const next = { ...prev, ...patch }
      return bucketFingerprint(prev) === bucketFingerprint(next) ? prev : next
    })
    setBuckets((prev) =>
      prev.map((b) => (b.name === name ? { ...b, ...patch } : b)),
    )
  }, [])

  const applyBucketList = useCallback((list: Bucket[]) => {
    setBuckets((prev) => replaceIfChanged(prev, list))
    setSelectedBucket((prev) => {
      if (!prev) return prev
      const found = list.find((b) => b.name === prev.name)
      if (!found) return prev
      const next = { ...prev, ...found }
      return bucketFingerprint(prev) === bucketFingerprint(next) ? prev : next
    })
  }, [])

  const applyBucket = useCallback((json: Record<string, unknown>, nameHint?: string) => {
    const name = String(json.name ?? nameHint ?? '').trim()
    if (!name) return
    setSelectedBucket((prev) => {
      if (prev && prev.name !== name) return prev
      const next = mergeBucket(prev ?? undefined, { ...json, name })
      if (prev && bucketFingerprint(prev) === bucketFingerprint(next)) return prev
      return next
    })
    setBuckets((prev) => {
      const current = prev.find((b) => b.name === name)
      const nextItem = mergeBucket(current, { ...json, name })
      if (current) {
        return prev.map((b) => (b.name === name ? nextItem : b))
      }
      return [...prev, nextItem]
    })
  }, [])

  const checkLatestVersion = useCallback(async () => {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (resp.ok) {
        const data = (await resp.json()) as { tag_name?: string }
        const tag = data.tag_name ?? ''
        setLatestVersion(tag.replace(/^v/, ''))
      }
    } catch {
      /* ignore */
    }
  }, [])

  const fetchStatus = useCallback(
    async (opts?: SilentFetch) => {
      try {
        const data = await api.get('/status')
        const parsed = parseServerStatus(data)
        setServerStatus((prev) =>
          statusFingerprint(prev) === statusFingerprint(parsed) ? prev : parsed,
        )
        touchSync()
        if (!opts?.silent) void checkLatestVersion()
      } catch {
        /* ignore */
      }
    },
    [api, checkLatestVersion, touchSync],
  )

  const fetchBuckets = useCallback(
    async (opts?: SilentFetch) => {
      if (!opts?.silent) {
        setIsLoading(true)
        setError(null)
      }
      try {
        const data = await api.get('/buckets')
        const list = ((data.buckets as Record<string, unknown>[]) ?? []).map(
          parseBucket,
        )
        applyBucketList(list)
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      } finally {
        if (!opts?.silent) setIsLoading(false)
      }
    },
    [api, applyBucketList, touchSync],
  )

  const fetchBucketDetail = useCallback(
    async (name: string, opts?: SilentFetch) => {
      selectedNameRef.current = name
      if (!opts?.silent) setIsLoading(true)
      try {
        const data = await api.get(`/buckets/${encodeURIComponent(name)}`)
        if (selectedNameRef.current !== name) return
        applyBucket(data, name)
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      } finally {
        if (!opts?.silent) setIsLoading(false)
      }
    },
    [api, applyBucket, touchSync],
  )

  const createBucket = useCallback(
    async (name: string, storageDir = '') => {
      try {
        const body: Record<string, unknown> = { name }
        if (storageDir) body.storage_dir = storageDir
        await api.post('/buckets', body)
        await fetchBuckets({ silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBuckets],
  )

  const deleteBucket = useCallback(
    async (name: string) => {
      try {
        await api.delete(`/buckets/${encodeURIComponent(name)}`)
        setBuckets((prev) => prev.filter((b) => b.name !== name))
        setSelectedBucket((prev) => (prev?.name === name ? null : prev))
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api],
  )

  const setQuota = useCallback(
    async (name: string, quotaBytes: number) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/quota`, {
          quota_bytes: quotaBytes,
        })
        patchBucket(name, { quotaBytes })
        void fetchBucketDetail(name, { silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail, patchBucket],
  )

  const setStorage = useCallback(
    async (name: string, storageDir: string) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/storage`, {
          storage_dir: storageDir,
        })
        patchBucket(name, { storageDir, storagePath: storageDir || null })
        void fetchBucketDetail(name, { silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail, patchBucket],
  )

  const setVersioning = useCallback(
    async (name: string, state: string) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/versioning`, {
          versioning: state,
        })
        patchBucket(name, { versioning: state })
        void fetchBucketDetail(name, { silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail, patchBucket],
  )

  const setPublicRead = useCallback(
    async (name: string, enabled: boolean) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/public-read`, {
          public_read: enabled,
        })
        patchBucket(name, { publicRead: enabled })
        void fetchBucketDetail(name, { silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail, patchBucket],
  )

  const setWebdavEnabled = useCallback(
    async (name: string, enabled: boolean) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/webdav`, {
          webdav_enabled: enabled,
        })
        patchBucket(name, { webdavEnabled: enabled })
        void fetchBucketDetail(name, { silent: true })
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail, patchBucket],
  )

  const reprocessImages = useCallback(
    async (name: string) => {
      try {
        await api.post(`/buckets/${encodeURIComponent(name)}/reprocess`, {})
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api],
  )

  const fetchCredentials = useCallback(
    async (bucketName: string, opts?: SilentFetch) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/credentials`,
        )
        const list = (data.credentials as Record<string, unknown>[]) ?? []
        setCredentials(list.map(parseCredential))
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      }
    },
    [api, touchSync],
  )

  const createCredential = useCallback(
    async (bucketName: string, name: string, permission: string) => {
      try {
        const data = await api.post(
          `/buckets/${encodeURIComponent(bucketName)}/credentials`,
          { name, permission },
        )
        const cred = parseCredential(data)
        await fetchCredentials(bucketName)
        setBuckets((prev) =>
          prev.map((b) =>
            b.name === bucketName ? { ...b, credentials: b.credentials + 1 } : b,
          ),
        )
        setSelectedBucket((prev) =>
          prev?.name === bucketName
            ? { ...prev, credentials: prev.credentials + 1 }
            : prev,
        )
        return cred
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return null
      }
    },
    [api, fetchCredentials],
  )

  const deleteCredential = useCallback(
    async (accessKey: string, bucketName: string) => {
      try {
        await api.delete(`/credentials/${encodeURIComponent(accessKey)}`)
        await fetchCredentials(bucketName)
        setBuckets((prev) =>
          prev.map((b) =>
            b.name === bucketName
              ? { ...b, credentials: Math.max(0, b.credentials - 1) }
              : b,
          ),
        )
        setSelectedBucket((prev) =>
          prev?.name === bucketName
            ? { ...prev, credentials: Math.max(0, prev.credentials - 1) }
            : prev,
        )
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchCredentials],
  )

  const fetchLifecycleRules = useCallback(
    async (bucketName: string, opts?: SilentFetch) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/lifecycle`,
        )
        const list = (data.rules as Record<string, unknown>[]) ?? []
        setLifecycleRules(list.map(parseLifecycleRule))
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      }
    },
    [api, touchSync],
  )

  const addLifecycleRule = useCallback(
    async (bucketName: string, name: string, prefix: string, days: number) => {
      try {
        await api.post(`/buckets/${encodeURIComponent(bucketName)}/lifecycle`, {
          name,
          prefix,
          expiration_days: days,
        })
        await fetchLifecycleRules(bucketName)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchLifecycleRules],
  )

  const deleteLifecycleRules = useCallback(
    async (bucketName: string, prefix?: string) => {
      try {
        const path =
          prefix != null
            ? `/buckets/${encodeURIComponent(bucketName)}/lifecycle?prefix=${encodeURIComponent(prefix)}`
            : `/buckets/${encodeURIComponent(bucketName)}/lifecycle`
        await api.delete(path)
        await fetchLifecycleRules(bucketName)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchLifecycleRules],
  )

  const fetchWebhooks = useCallback(
    async (bucketName: string, opts?: SilentFetch) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/webhooks`,
        )
        const list = (data.webhooks as Record<string, unknown>[]) ?? []
        setWebhooks(list.map(parseWebhook))
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      }
    },
    [api, touchSync],
  )

  const addWebhook = useCallback(
    async (
      bucketName: string,
      name: string,
      url: string,
      events = '*',
      secret = '',
    ) => {
      try {
        await api.post(`/buckets/${encodeURIComponent(bucketName)}/webhooks`, {
          name,
          url,
          event_types: events,
          secret,
        })
        await fetchWebhooks(bucketName)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchWebhooks],
  )

  const deleteWebhook = useCallback(
    async (id: number, bucketName: string) => {
      try {
        await api.delete(`/webhooks/${id}`)
        await fetchWebhooks(bucketName)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchWebhooks],
  )

  const fetchObjects = useCallback(
    async (
      bucketName: string,
      prefix = '',
      marker = '',
      opts?: SilentFetch,
    ) => {
      if (opts?.silent && objectsPaged.current && marker === '') return
      const gen = opts?.silent ? objectsGen.current : ++objectsGen.current
      if (!opts?.silent) setObjectsLoading(true)
      try {
        const params = new URLSearchParams({
          prefix,
          delimiter: '/',
          'max-keys': '200',
        })
        if (marker) params.set('marker', marker)
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/objects?${params}`,
        )
        if (gen !== objectsGen.current) return
        const parsed = parseObjectList(data)
        setObjectList((prev) => {
          if (!marker || !prev || prev.prefix !== prefix) {
            objectsPaged.current = Boolean(parsed.truncated)
            return parsed
          }
          objectsPaged.current = true
          const seenObj = new Set(prev.objects.map((o) => o.key))
          const seenPref = new Set(prev.prefixes)
          return {
            ...parsed,
            objects: [
              ...prev.objects,
              ...parsed.objects.filter((o) => !seenObj.has(o.key)),
            ],
            prefixes: [
              ...prev.prefixes,
              ...parsed.prefixes.filter((p) => !seenPref.has(p)),
            ],
          }
        })
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      } finally {
        if (!opts?.silent && gen === objectsGen.current) setObjectsLoading(false)
      }
    },
    [api, touchSync],
  )

  const deleteObject = useCallback(
    async (bucketName: string, key: string) => {
      try {
        const encodedKey = key
          .split('/')
          .map((part) => encodeURIComponent(part))
          .join('/')
        await api.delete(
          `/buckets/${encodeURIComponent(bucketName)}/objects/${encodedKey}`,
        )
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api],
  )

  const deletePrefix = useCallback(
    async (bucketName: string, prefix: string) => {
      try {
        await api.post(
          `/buckets/${encodeURIComponent(bucketName)}/objects/delete-prefix`,
          { prefix },
        )
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api],
  )

  const fetchAdmins = useCallback(
    async (opts?: SilentFetch) => {
      try {
        const data = await api.get('/admins')
        const list = (data.admins as Record<string, unknown>[]) ?? []
        setAdmins(list.map(parseAdmin))
        touchSync()
      } catch (e) {
        if (!opts?.silent && e instanceof ApiException) setError(e.message)
      }
    },
    [api, touchSync],
  )

  const createAdmin = useCallback(
    async (uname: string, password: string) => {
      try {
        const body: Record<string, unknown> = { username: uname }
        if (password) body.password = password
        const data = await api.post('/admins', body)
        await fetchAdmins()
        return data
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return null
      }
    },
    [api, fetchAdmins],
  )

  const deleteAdmin = useCallback(
    async (uname: string) => {
      try {
        await api.delete(`/admins/${encodeURIComponent(uname)}`)
        await fetchAdmins()
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchAdmins],
  )

  const resetAdminPassword = useCallback(
    async (uname: string, password: string) => {
      try {
        const body: Record<string, unknown> = {}
        if (password) body.password = password
        return await api.put(
          `/admins/${encodeURIComponent(uname)}/password`,
          body,
        )
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return null
      }
    },
    [api],
  )

  const applyLiveMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const type = liveMessageType(msg)
      const payload = livePayload(msg)
      const bucketName = liveBucketName(msg)
      const focus = liveFocusRef.current

      if (
        type === 'status' ||
        type === 'server.status' ||
        type === 'server_status'
      ) {
        const parsed = parseServerStatus(payload)
        setServerStatus((prev) =>
          statusFingerprint(prev) === statusFingerprint(parsed) ? prev : parsed,
        )
        touchSync()
        return
      }

      if (
        type === 'buckets' ||
        type === 'buckets.updated' ||
        type === 'buckets.list'
      ) {
        const list = liveStringList(payload.buckets ?? msg.buckets).map(parseBucket)
        applyBucketList(list)
        touchSync()
        return
      }

      if (
        type === 'bucket' ||
        type === 'bucket.updated' ||
        type === 'bucket.changed' ||
        type === 'bucket.created'
      ) {
        applyBucket(payload, bucketName)
        touchSync()
        return
      }

      if (type === 'bucket.deleted' && bucketName) {
        setBuckets((prev) => prev.filter((b) => b.name !== bucketName))
        setSelectedBucket((prev) => (prev?.name === bucketName ? null : prev))
        touchSync()
        return
      }

      if (
        (type === 'objects.changed' ||
          type === 'object.created' ||
          type === 'object.deleted' ||
          type === 's3:objectcreated:put' ||
          type === 's3:objectremoved:delete') &&
        bucketName
      ) {
        void fetchBucketDetail(bucketName, { silent: true })
        if (focus?.bucket === bucketName && focus.tab === 'files') {
          void fetchObjects(bucketName, focus.prefix ?? '', '', { silent: true })
        }
        return
      }

      if (type.includes('credential') && bucketName) {
        if (focus?.bucket === bucketName && focus.tab === 'credentials') {
          void fetchCredentials(bucketName, { silent: true })
        }
        void fetchBucketDetail(bucketName, { silent: true })
        return
      }

      if (type.includes('lifecycle') && bucketName) {
        if (focus?.bucket === bucketName && focus.tab === 'lifecycle') {
          void fetchLifecycleRules(bucketName, { silent: true })
        }
        return
      }

      if (type.includes('webhook') && bucketName) {
        if (focus?.bucket === bucketName && focus.tab === 'webhooks') {
          void fetchWebhooks(bucketName, { silent: true })
        }
        return
      }

      if (type.includes('admin')) {
        if (focus?.screen === 'admins') void fetchAdmins({ silent: true })
      }
    },
    [
      applyBucket,
      applyBucketList,
      fetchAdmins,
      fetchBucketDetail,
      fetchCredentials,
      fetchLifecycleRules,
      fetchObjects,
      fetchWebhooks,
      touchSync,
    ],
  )

  const applyLiveMessageRef = useRef(applyLiveMessage)
  applyLiveMessageRef.current = applyLiveMessage

  useEffect(() => {
    if (!isLoggedIn || !token || !api.baseUrl) {
      liveClientRef.current?.stop()
      liveClientRef.current = null
      setLiveMode('idle')
      setLastSyncedAt(null)
      return
    }

    const client = new LiveClient({
      getBaseUrl: () => api.baseUrl,
      getToken: () => token,
      getFocus: () => liveFocusRef.current,
      fetchStatus: () => fetchStatus({ silent: true }),
      fetchBuckets: () => fetchBuckets({ silent: true }),
      fetchBucketDetail: (name) => fetchBucketDetail(name, { silent: true }),
      fetchObjects: (name, prefix) =>
        fetchObjects(name, prefix, '', { silent: true }),
      fetchCredentials: (name) => fetchCredentials(name, { silent: true }),
      fetchLifecycleRules: (name) =>
        fetchLifecycleRules(name, { silent: true }),
      fetchWebhooks: (name) => fetchWebhooks(name, { silent: true }),
      fetchAdmins: () => fetchAdmins({ silent: true }),
      onMessage: (msg) => applyLiveMessageRef.current(msg),
      onMode: setLiveMode,
    })
    liveClientRef.current = client
    client.start()
    return () => {
      client.stop()
      if (liveClientRef.current === client) liveClientRef.current = null
    }
  }, [
    api,
    fetchAdmins,
    fetchBucketDetail,
    fetchBuckets,
    fetchCredentials,
    fetchLifecycleRules,
    fetchObjects,
    fetchStatus,
    fetchWebhooks,
    isLoggedIn,
    token,
  ])

  const updateAvailable = useMemo(() => {
    if (!serverStatus || !latestVersion) return false
    if (!serverStatus.version) return false
    return compareVersions(serverStatus.version, latestVersion) < 0
  }, [latestVersion, serverStatus])

  const webdavMountUrl = useMemo(() => {
    if (!serverStatus?.webdavEnabled || !api.baseUrl) return null
    try {
      const host = new URL(api.baseUrl).hostname
      const listen = serverStatus.webdavListen
      const port = listen.includes(':') ? listen.split(':').pop() : listen
      if (!host || !port) return null
      return `http://${host}:${port}/`
    } catch {
      return null
    }
  }, [api.baseUrl, serverStatus])

  const value = useMemo<BucketStoreValue>(
    () => ({
      buckets,
      isLoading,
      error,
      selectedBucket,
      credentials,
      lifecycleRules,
      webhooks,
      serverStatus,
      latestVersion,
      updateAvailable,
      webdavMountUrl,
      objectList,
      objectsLoading,
      admins,
      liveMode,
      lastSyncedAt,
      setLiveFocus,
      setLivePrefix,
      clearError,
      fetchStatus,
      fetchBuckets,
      fetchBucketDetail,
      createBucket,
      deleteBucket,
      setQuota,
      setStorage,
      setVersioning,
      setPublicRead,
      setWebdavEnabled,
      reprocessImages,
      fetchCredentials,
      createCredential,
      deleteCredential,
      fetchLifecycleRules,
      addLifecycleRule,
      deleteLifecycleRules,
      fetchWebhooks,
      addWebhook,
      deleteWebhook,
      fetchObjects,
      deleteObject,
      deletePrefix,
      fetchAdmins,
      createAdmin,
      deleteAdmin,
      resetAdminPassword,
    }),
    [
      addLifecycleRule,
      addWebhook,
      admins,
      buckets,
      clearError,
      createAdmin,
      createBucket,
      createCredential,
      credentials,
      deleteAdmin,
      deleteBucket,
      deleteCredential,
      deleteLifecycleRules,
      deleteObject,
      deletePrefix,
      deleteWebhook,
      error,
      fetchAdmins,
      fetchBucketDetail,
      fetchBuckets,
      fetchCredentials,
      fetchLifecycleRules,
      fetchObjects,
      fetchStatus,
      fetchWebhooks,
      isLoading,
      lastSyncedAt,
      latestVersion,
      lifecycleRules,
      liveMode,
      objectList,
      objectsLoading,
      reprocessImages,
      resetAdminPassword,
      selectedBucket,
      serverStatus,
      setLiveFocus,
      setLivePrefix,
      setPublicRead,
      setQuota,
      setStorage,
      setVersioning,
      setWebdavEnabled,
      updateAvailable,
      webdavMountUrl,
      webhooks,
    ],
  )

  return (
    <BucketStoreContext.Provider value={value}>{children}</BucketStoreContext.Provider>
  )
}

export function useBuckets() {
  const ctx = useContext(BucketStoreContext)
  if (!ctx) throw new Error('useBuckets must be used within BucketStoreProvider')
  return ctx
}
