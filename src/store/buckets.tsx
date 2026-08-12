import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiException } from '../api/client'
import {
  parseAdmin,
  parseBucket,
  parseCredential,
  parseLifecycleRule,
  parseObjectList,
  parseServerStatus,
  parseWebhook,
} from '../api/parsers'
import { compareVersions } from '../lib/format'
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
  clearError: () => void
  fetchStatus: () => Promise<void>
  fetchBuckets: () => Promise<void>
  fetchBucketDetail: (name: string) => Promise<void>
  createBucket: (name: string, storageDir?: string) => Promise<boolean>
  deleteBucket: (name: string) => Promise<boolean>
  setQuota: (name: string, quotaBytes: number) => Promise<boolean>
  setStorage: (name: string, storageDir: string) => Promise<boolean>
  setVersioning: (name: string, state: string) => Promise<boolean>
  setPublicRead: (name: string, enabled: boolean) => Promise<boolean>
  setWebdavEnabled: (name: string, enabled: boolean) => Promise<boolean>
  reprocessImages: (name: string) => Promise<boolean>
  fetchCredentials: (bucketName: string) => Promise<void>
  createCredential: (
    bucketName: string,
    name: string,
    permission: string,
  ) => Promise<Credential | null>
  deleteCredential: (accessKey: string, bucketName: string) => Promise<boolean>
  fetchLifecycleRules: (bucketName: string) => Promise<void>
  addLifecycleRule: (
    bucketName: string,
    name: string,
    prefix: string,
    days: number,
  ) => Promise<boolean>
  deleteLifecycleRules: (bucketName: string, prefix?: string) => Promise<boolean>
  fetchWebhooks: (bucketName: string) => Promise<void>
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
  ) => Promise<void>
  deleteObject: (bucketName: string, key: string) => Promise<boolean>
  deletePrefix: (bucketName: string, prefix: string) => Promise<boolean>
  fetchAdmins: () => Promise<void>
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

export function BucketStoreProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth()

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

  const clearError = useCallback(() => setError(null), [])

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

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get('/status')
      setServerStatus(parseServerStatus(data))
      void checkLatestVersion()
    } catch {
      /* ignore */
    }
  }, [api, checkLatestVersion])

  const fetchBuckets = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get('/buckets')
      const list = (data.buckets as Record<string, unknown>[]) ?? []
      setBuckets(list.map(parseBucket))
    } catch (e) {
      if (e instanceof ApiException) setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [api])

  const fetchBucketDetail = useCallback(
    async (name: string) => {
      setIsLoading(true)
      try {
        const data = await api.get(`/buckets/${encodeURIComponent(name)}`)
        setSelectedBucket(parseBucket(data))
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
      } finally {
        setIsLoading(false)
      }
    },
    [api],
  )

  const createBucket = useCallback(
    async (name: string, storageDir = '') => {
      try {
        const body: Record<string, unknown> = { name }
        if (storageDir) body.storage_dir = storageDir
        await api.post('/buckets', body)
        await fetchBuckets()
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
        await fetchBucketDetail(name)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail],
  )

  const setStorage = useCallback(
    async (name: string, storageDir: string) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/storage`, {
          storage_dir: storageDir,
        })
        await fetchBucketDetail(name)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail],
  )

  const setVersioning = useCallback(
    async (name: string, state: string) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/versioning`, {
          versioning: state,
        })
        await fetchBucketDetail(name)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail],
  )

  const setPublicRead = useCallback(
    async (name: string, enabled: boolean) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/public-read`, {
          public_read: enabled,
        })
        await fetchBucketDetail(name)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail],
  )

  const setWebdavEnabled = useCallback(
    async (name: string, enabled: boolean) => {
      try {
        await api.put(`/buckets/${encodeURIComponent(name)}/webdav`, {
          webdav_enabled: enabled,
        })
        await fetchBucketDetail(name)
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchBucketDetail],
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
    async (bucketName: string) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/credentials`,
        )
        const list = (data.credentials as Record<string, unknown>[]) ?? []
        setCredentials(list.map(parseCredential))
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
      }
    },
    [api],
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
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        return false
      }
    },
    [api, fetchCredentials],
  )

  const fetchLifecycleRules = useCallback(
    async (bucketName: string) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/lifecycle`,
        )
        const list = (data.rules as Record<string, unknown>[]) ?? []
        setLifecycleRules(list.map(parseLifecycleRule))
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
      }
    },
    [api],
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
    async (bucketName: string) => {
      try {
        const data = await api.get(
          `/buckets/${encodeURIComponent(bucketName)}/webhooks`,
        )
        const list = (data.webhooks as Record<string, unknown>[]) ?? []
        setWebhooks(list.map(parseWebhook))
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
      }
    },
    [api],
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
    async (bucketName: string, prefix = '', marker = '') => {
      setObjectsLoading(true)
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
        const parsed = parseObjectList(data)
        setObjectList((prev) => {
          if (!marker || !prev || prev.prefix !== prefix) return parsed
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
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
      } finally {
        setObjectsLoading(false)
      }
    },
    [api],
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

  const fetchAdmins = useCallback(async () => {
    try {
      const data = await api.get('/admins')
      const list = (data.admins as Record<string, unknown>[]) ?? []
      setAdmins(list.map(parseAdmin))
    } catch (e) {
      if (e instanceof ApiException) setError(e.message)
    }
  }, [api])

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
      latestVersion,
      lifecycleRules,
      objectList,
      objectsLoading,
      reprocessImages,
      resetAdminPassword,
      selectedBucket,
      serverStatus,
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
