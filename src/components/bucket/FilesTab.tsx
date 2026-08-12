import {
  Archive,
  Code2,
  Copy,
  Download,
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  TextCursorInput,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createS3Session,
  deriveS3Endpoint,
  isImageKey,
  isTextEditable,
  pickBucketCredential,
  publicObjectUrl,
  publicViewUrl,
  s3DownloadBlob,
  s3DownloadText,
  s3Rename,
  s3Upload,
  S3OpsError,
  triggerBrowserDownload,
  type S3Session,
  type UploadProgress,
} from '../../api/s3'
import {
  fileExtension,
  fileNameFromKey,
  formatBytes,
  formatDate,
} from '../../lib/format'
import { useAuth } from '../../store/auth'
import { useBuckets } from '../../store/buckets'
import { useServers } from '../../store/ServerStore'
import { useToast } from '../../store/toast'
import { debugError } from '../../lib/debug'
import type { S3Object } from '../../types'
import { PromptModal, TextEditModal, ImagePreviewModal } from '../dialogs/FileDialogs'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'

function iconFor(key: string) {
  const ext = fileExtension(key)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return FileImage
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return FileVideo
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return FileAudio
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return Archive
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'json', 'yml', 'yaml'].includes(ext))
    return Code2
  if (['txt', 'md', 'csv', 'log', 'pdf'].includes(ext)) return FileText
  return File
}

function guessContentType(name: string): string | undefined {
  const ext = fileExtension(name)
  const map: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    xml: 'application/xml',
    zip: 'application/zip',
  }
  return map[ext]
}

export function FilesTab({ bucketName }: { bucketName: string }) {
  const {
    objectList,
    objectsLoading,
    credentials,
    selectedBucket,
    fetchObjects,
    fetchCredentials,
    fetchBucketDetail,
    deleteObject,
    deletePrefix,
  } = useBuckets()
  const { api } = useAuth()
  const { activeServer } = useServers()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [prefix, setPrefix] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<{
    type: 'object' | 'prefix' | 'bulk'
    keys: string[]
  } | null>(null)
  const [s3Client, setS3Client] = useState<S3Session | null>(null)
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [canWrite, setCanWrite] = useState(false)
  const [s3Ready, setS3Ready] = useState(false)
  const [s3Error, setS3Error] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [upload, setUpload] = useState<{
    name: string
    index: number
    total: number
    progress: UploadProgress
  } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ key: string; text: string } | null>(
    null,
  )
  const [preview, setPreview] = useState<{
    key: string
    src: string | null
    loading: boolean
    error: string | null
    revoke?: string
  } | null>(null)

  const publicRead =
    selectedBucket?.name === bucketName ? selectedBucket.publicRead : false

  const refresh = useCallback(async () => {
    await fetchObjects(bucketName, prefix)
    setSelected(new Set())
  }, [bucketName, fetchObjects, prefix])

  useEffect(() => {
    void fetchObjects(bucketName, prefix)
    setSelected(new Set())
    setMenuKey(null)
  }, [bucketName, prefix, fetchObjects])

  useEffect(() => {
    void fetchCredentials(bucketName)
    void fetchBucketDetail(bucketName)
  }, [bucketName, fetchCredentials, fetchBucketDetail])

  useEffect(() => {
    const adminUrl = activeServer?.url || api.baseUrl
    if (!adminUrl) {
      setS3Client(null)
      setS3Endpoint('')
      setS3Ready(false)
      setS3Error('Not connected')
      return
    }
    const endpoint = deriveS3Endpoint(adminUrl, activeServer?.s3Url)
    setS3Endpoint(endpoint)
    const cred = pickBucketCredential(credentials)
    if (!cred?.secretKey) {
      setS3Client(null)
      setS3Ready(false)
      setCanWrite(false)
      setS3Error(
        credentials.length === 0
          ? 'Create a bucket credential to upload, download, and edit files.'
          : 'No credential with a secret key available.',
      )
      return
    }
    setS3Client(createS3Session(endpoint, cred.accessKey, cred.secretKey))
    setCanWrite(cred.permission !== 'read-only')
    setS3Ready(true)
    setS3Error(null)
  }, [activeServer, api.baseUrl, credentials])

  const objectPublicUrl = useCallback(
    (key: string) =>
      s3Endpoint ? publicObjectUrl(s3Endpoint, bucketName, key) : '',
    [bucketName, s3Endpoint],
  )

  const objectViewUrl = useCallback(
    (key: string) =>
      s3Endpoint ? publicViewUrl(s3Endpoint, bucketName, key) : '',
    [bucketName, s3Endpoint],
  )

  const closePreview = () => {
    setPreview((prev) => {
      if (prev?.revoke) URL.revokeObjectURL(prev.revoke)
      return null
    })
  }

  const openImagePreview = async (obj: S3Object) => {
    if (!s3Endpoint) {
      toast('Set an S3 URL on the server first', 'error')
      return
    }
    setMenuKey(null)
    // Prefer public view URL (inline via image transform). Fallback: signed fetch blob.
    const viewUrl = objectViewUrl(obj.key)
    if (publicRead && viewUrl) {
      setPreview({ key: obj.key, src: viewUrl, loading: false, error: null })
      return
    }
    setPreview({ key: obj.key, src: null, loading: true, error: null })
    const client = requireS3()
    if (!client) {
      // Still try public view URL even if credentials missing
      if (viewUrl) {
        setPreview({ key: obj.key, src: viewUrl, loading: false, error: null })
        return
      }
      setPreview({
        key: obj.key,
        src: null,
        loading: false,
        error: 'Cannot load image',
      })
      return
    }
    try {
      const { blob } = await s3DownloadBlob(client, bucketName, obj.key)
      const url = URL.createObjectURL(blob)
      setPreview({
        key: obj.key,
        src: url,
        loading: false,
        error: null,
        revoke: url,
      })
    } catch (e) {
      // Last resort: public transform URL (works if public-read)
      if (viewUrl) {
        setPreview({ key: obj.key, src: viewUrl, loading: false, error: null })
        return
      }
      setPreview({
        key: obj.key,
        src: null,
        loading: false,
        error: e instanceof S3OpsError ? e.message : 'Failed to load image',
      })
    }
  }

  const copyPublicUrl = async (key: string) => {
    // For images copy the view URL so pasted links display instead of downloading
    const url = isImageKey(key) ? objectViewUrl(key) : objectPublicUrl(key)
    if (!url) {
      toast('Set an S3 URL on the server first', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast(
        publicRead
          ? 'Public URL copied'
          : 'URL copied (enable Public read for anonymous access)',
        'success',
      )
    } catch {
      toast(url, 'info')
    }
    setMenuKey(null)
  }

  const openPublicUrl = (key: string, contentType?: string) => {
    if (isImageKey(key, contentType)) {
      const obj = objectList?.objects.find((o) => o.key === key)
      if (obj) {
        void openImagePreview(obj)
        return
      }
    }
    const url = isImageKey(key, contentType)
      ? objectViewUrl(key)
      : objectPublicUrl(key)
    if (!url) {
      toast('Set an S3 URL on the server first', 'error')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    setMenuKey(null)
  }

  const openInTab = (key: string) => {
    const url = isImageKey(key) ? objectViewUrl(key) : objectPublicUrl(key)
    if (!url) {
      toast('Set an S3 URL on the server first', 'error')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!menuKey) return
    const close = () => setMenuKey(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuKey])

  const crumbs = useMemo(() => {
    if (!prefix) return [] as string[]
    return prefix.replace(/\/$/, '').split('/')
  }, [prefix])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allKeys = useMemo(() => {
    const prefixes = objectList?.prefixes ?? []
    const objects = (objectList?.objects ?? []).map((o) => o.key)
    return [...prefixes, ...objects]
  }, [objectList])

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k))

  const goPrefix = (parts: string[]) => {
    setPrefix(parts.length ? `${parts.join('/')}/` : '')
  }

  const requireS3 = () => {
    if (!s3Client || !s3Ready) {
      toast(s3Error || 'S3 access unavailable', 'error')
      return null
    }
    return s3Client
  }

  const requireWrite = () => {
    const client = requireS3()
    if (!client) return null
    if (!canWrite) {
      toast('Read-only credential — create a read-write key in Credentials', 'error')
      return null
    }
    return client
  }

  const runDelete = async () => {
    if (!confirm) return
    setBusy(true)
    let ok = true
    if (confirm.type === 'prefix') {
      ok = await deletePrefix(bucketName, confirm.keys[0]!)
    } else {
      for (const key of confirm.keys) {
        const success = key.endsWith('/')
          ? await deletePrefix(bucketName, key)
          : await deleteObject(bucketName, key)
        if (!success) ok = false
      }
    }
    setConfirm(null)
    setBusy(false)
    if (ok) toast('Deleted', 'success')
    else toast('Some deletes failed', 'error')
    await refresh()
  }

  const uploadFiles = async (files: FileList | File[]) => {
    const client = requireWrite()
    if (!client) return
    const list = Array.from(files)
    if (!list.length) return
    setBusy(true)
    let ok = 0
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i]!
        const key = `${prefix}${file.name}`
        setUpload({
          name: file.name,
          index: i + 1,
          total: list.length,
          progress: { bytesSent: 0, bytesTotal: file.size },
        })
        await s3Upload(
          client,
          bucketName,
          key,
          file,
          file.type || guessContentType(file.name),
          (progress) => {
            setUpload({
              name: file.name,
              index: i + 1,
              total: list.length,
              progress,
            })
          },
        )
        ok++
      }
      toast(
        ok === 1 ? `Uploaded ${list[0]!.name}` : `Uploaded ${ok} files`,
        'success',
      )
      await refresh()
    } catch (e) {
      debugError('FilesTab upload error', e)
      toast(e instanceof S3OpsError ? e.message : 'Upload failed', 'error')
    } finally {
      setBusy(false)
      setUpload(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const downloadObject = async (obj: S3Object) => {
    const client = requireS3()
    if (!client) return
    setBusy(true)
    try {
      const { blob } = await s3DownloadBlob(client, bucketName, obj.key)
      triggerBrowserDownload(blob, fileNameFromKey(obj.key))
      toast('Download started', 'success')
    } catch (e) {
      debugError('FilesTab download error', e)
      toast(e instanceof S3OpsError ? e.message : 'Download failed', 'error')
    } finally {
      setBusy(false)
      setMenuKey(null)
    }
  }

  const openEditor = async (obj: S3Object) => {
    const client = requireWrite()
    if (!client) return
    if (!isTextEditable(obj.key, obj.contentType, obj.size)) {
      toast('This file is too large or not a text type', 'error')
      return
    }
    setBusy(true)
    try {
      const text = await s3DownloadText(client, bucketName, obj.key)
      setEditTarget({ key: obj.key, text })
    } catch (e) {
      debugError('FilesTab edit load error', e)
      toast(e instanceof S3OpsError ? e.message : 'Failed to load file', 'error')
    } finally {
      setBusy(false)
      setMenuKey(null)
    }
  }

  const saveEditor = async (text: string) => {
    if (!editTarget) return
    const client = requireWrite()
    if (!client) return
    setBusy(true)
    try {
      await s3Upload(
        client,
        bucketName,
        editTarget.key,
        text,
        guessContentType(editTarget.key) || 'text/plain',
      )
      toast('Saved', 'success')
      setEditTarget(null)
      await refresh()
    } catch (e) {
      debugError('FilesTab save error', e)
      toast(e instanceof S3OpsError ? e.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doRename = async (newName: string) => {
    if (!renameTarget) return
    const client = requireWrite()
    if (!client) return
    const clean = newName.replace(/^\/+/, '').replace(/\/+$/, '')
    if (!clean) return
    const toKey = renameTarget.endsWith('/')
      ? `${prefix}${clean}/`
      : `${prefix}${clean}`
    if (toKey === renameTarget) {
      setRenameTarget(null)
      return
    }
    setBusy(true)
    try {
      if (renameTarget.endsWith('/')) {
        toast('Rename folder is not supported yet — move files individually', 'error')
      } else {
        await s3Rename(client, bucketName, renameTarget, toKey)
        toast('Renamed', 'success')
        setRenameTarget(null)
        await refresh()
      }
    } catch (e) {
      debugError('FilesTab rename error', e)
      toast(e instanceof S3OpsError ? e.message : 'Rename failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const doCreateFolder = async (name: string) => {
    const client = requireWrite()
    if (!client) return
    const clean = name.replace(/^\/+|\/+$/g, '')
    if (!clean) return
    // Cloodsy path.Clean strips trailing slashes, so create a marker file
    // under the folder prefix instead of an empty "dir/" object.
    const folderPrefix = `${prefix}${clean}/`
    const markerKey = `${folderPrefix}.keep`
    setBusy(true)
    try {
      await s3Upload(client, bucketName, markerKey, new Uint8Array(0), 'application/octet-stream')
      toast('Folder created', 'success')
      setCreateFolderOpen(false)
      setPrefix(folderPrefix)
    } catch (e) {
      debugError('FilesTab create folder error', e)
      toast(e instanceof S3OpsError ? e.message : 'Could not create folder', 'error')
    } finally {
      setBusy(false)
    }
  }

  const empty = !objectList || (objectList.objects.length === 0 && objectList.prefixes.length === 0)

  return (
    <div
      className={`files-tab ${dragOver ? 'files-tab--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (canWrite) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files)
        }}
      />

      <div className="page-header" style={{ padding: 0 }}>
        <div className="breadcrumbs">
          <button type="button" onClick={() => goPrefix([])}>
            Root
          </button>
          {crumbs.map((c, i) => (
            <span
              key={`${c}-${i}`}
              style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
            >
              <span>/</span>
              <button
                type="button"
                className={i === crumbs.length - 1 ? 'current' : undefined}
                onClick={() => goPrefix(crumbs.slice(0, i + 1))}
              >
                {c}
              </button>
            </span>
          ))}
        </div>
        <div className="spacer" />
        <div className="files-actions">
          {selected.size > 0 ? (
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => {
                const keys = Array.from(selected)
                const folders = keys.filter((k) => k.endsWith('/'))
                const objects = keys.filter((k) => !k.endsWith('/'))
                if (folders.length === 1 && objects.length === 0) {
                  setConfirm({ type: 'prefix', keys: folders })
                } else {
                  setConfirm({ type: 'bulk', keys })
                }
              }}
            >
              <Trash2 size={14} />
              Delete ({selected.size})
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !canWrite || !s3Ready}
            onClick={() => setCreateFolderOpen(true)}
            title={!s3Ready ? s3Error ?? undefined : undefined}
          >
            <FolderPlus size={14} />
            New folder
          </Button>
          <Button
            size="sm"
            disabled={busy || !canWrite || !s3Ready}
            onClick={() => fileInputRef.current?.click()}
            title={!s3Ready ? s3Error ?? undefined : undefined}
          >
            <Upload size={14} />
            Upload
          </Button>
        </div>
      </div>

      {s3Error && !s3Ready ? (
        <div className="banner banner--warn">{s3Error}</div>
      ) : null}

      {upload ? (
        <div className="banner upload-progress">
          <div className="upload-progress__label">
            Uploading {upload.name}
            {upload.total > 1 ? ` (${upload.index}/${upload.total})` : ''}
            {' · '}
            {formatBytes(upload.progress.bytesSent)} / {formatBytes(upload.progress.bytesTotal)}
            {upload.progress.parts
              ? ` · part ${upload.progress.part ?? 0}/${upload.progress.parts}`
              : ''}
          </div>
          <div className="upload-progress__bar">
            <div
              className="upload-progress__fill"
              style={{
                width: `${
                  upload.progress.bytesTotal
                    ? Math.min(
                        100,
                        (upload.progress.bytesSent / upload.progress.bytesTotal) * 100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {s3Endpoint ? (
        <div className={`banner ${publicRead ? 'banner--ok' : 'banner--warn'}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>
              {publicRead ? 'Public object URLs' : 'Object URLs (Public read is off)'}
            </div>
            <code className="public-url-sample">
              {publicObjectUrl(s3Endpoint, bucketName, prefix ? `${prefix}…` : '…')}
            </code>
          </div>
        </div>
      ) : null}

      {objectsLoading && !objectList ? (
        <div className="empty-state">
          <div className="spinner" />
        </div>
      ) : empty ? (
        <EmptyState
          title="Empty folder"
          description={
            canWrite && s3Ready
              ? 'Upload files or create a folder to get started.'
              : 'No objects in this prefix.'
          }
          action={
            canWrite && s3Ready ? (
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Upload files
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) setSelected(new Set())
                      else setSelected(new Set(allKeys))
                    }}
                  />
                </th>
                <th>Name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Modified</th>
                <th style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {objectList!.prefixes.map((p) => {
                const name = p.slice(prefix.length).replace(/\/$/, '')
                return (
                  <tr key={p} className="is-clickable">
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(p)}
                        onChange={() => toggle(p)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td onClick={() => setPrefix(p)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Folder size={16} />
                        {name}/
                      </span>
                    </td>
                    <td>—</td>
                    <td>Dir</td>
                    <td>—</td>
                    <td>
                      <button
                        className="btn-icon is-danger"
                        type="button"
                        title="Delete folder"
                        disabled={busy}
                        onClick={() => setConfirm({ type: 'prefix', keys: [p] })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {objectList!.objects.map((obj) => {
                const Icon = iconFor(obj.key)
                const editable = isTextEditable(obj.key, obj.contentType, obj.size)
                const image = isImageKey(obj.key, obj.contentType)
                const href = image ? objectViewUrl(obj.key) : objectPublicUrl(obj.key)
                return (
                  <tr key={obj.key}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(obj.key)}
                        onChange={() => toggle(obj.key)}
                      />
                    </td>
                    <td>
                      <a
                        className="file-link"
                        href={href || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={href || undefined}
                        onClick={(e) => {
                          e.preventDefault()
                          if (image) {
                            void openImagePreview(obj)
                            return
                          }
                          openPublicUrl(obj.key, obj.contentType)
                        }}
                      >
                        <Icon size={16} />
                        <span>{fileNameFromKey(obj.key)}</span>
                        <ExternalLink size={12} className="file-link__ext" />
                      </a>
                    </td>
                    <td>{formatBytes(obj.size)}</td>
                    <td>{obj.contentType || fileExtension(obj.key) || '—'}</td>
                    <td>{formatDate(obj.lastModified)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-icon"
                          type="button"
                          title="Copy public URL"
                          disabled={!href}
                          onClick={() => void copyPublicUrl(obj.key)}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          type="button"
                          title="Download"
                          disabled={busy || !s3Ready}
                          onClick={() => void downloadObject(obj)}
                        >
                          <Download size={14} />
                        </button>
                        <div className="menu-wrap">
                          <button
                            className="btn-icon"
                            type="button"
                            title="More"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuKey((k) => (k === obj.key ? null : obj.key))
                            }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuKey === obj.key ? (
                            <div className="menu" onClick={(e) => e.stopPropagation()}>
                              {image ? (
                                <button
                                  type="button"
                                  onClick={() => void openImagePreview(obj)}
                                >
                                  <ExternalLink size={14} />
                                  Preview
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openInTab(obj.key)}
                              >
                                <ExternalLink size={14} />
                                Open in tab
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyPublicUrl(obj.key)}
                              >
                                <Copy size={14} />
                                Copy public URL
                              </button>
                              {editable && canWrite ? (
                                <button
                                  type="button"
                                  onClick={() => void openEditor(obj)}
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                              ) : null}
                              {canWrite ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenameTarget(obj.key)
                                    setMenuKey(null)
                                  }}
                                >
                                  <TextCursorInput size={14} />
                                  Rename
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void downloadObject(obj)}
                              >
                                <Download size={14} />
                                Download
                              </button>
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => {
                                  setConfirm({ type: 'object', keys: [obj.key] })
                                  setMenuKey(null)
                                }}
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {objectList?.truncated ? (
        <div className="files-more">
          <Button
            variant="outline"
            size="sm"
            disabled={objectsLoading}
            onClick={() =>
              void fetchObjects(bucketName, prefix, objectList.nextMarker)
            }
          >
            Load more
          </Button>
        </div>
      ) : null}

      <ConfirmModal
        open={!!confirm}
        title="Confirm delete"
        message={
          confirm?.type === 'prefix'
            ? `Delete folder '${confirm.keys[0]}' and all contents?`
            : `Delete ${confirm?.keys.length ?? 0} object(s)?`
        }
        confirmLabel="Delete"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => void runDelete()}
      />

      <PromptModal
        open={createFolderOpen}
        title="New folder"
        label="Folder name"
        placeholder="photos"
        confirmLabel="Create"
        onClose={() => setCreateFolderOpen(false)}
        onConfirm={doCreateFolder}
      />

      <PromptModal
        open={!!renameTarget}
        title="Rename"
        label="New name"
        initial={renameTarget ? fileNameFromKey(renameTarget) : ''}
        confirmLabel="Rename"
        onClose={() => setRenameTarget(null)}
        onConfirm={doRename}
      />

      <TextEditModal
        open={!!editTarget}
        title={editTarget ? `Edit ${fileNameFromKey(editTarget.key)}` : 'Edit'}
        initial={editTarget?.text ?? ''}
        onClose={() => setEditTarget(null)}
        onSave={saveEditor}
      />

      <ImagePreviewModal
        open={!!preview}
        title={preview ? fileNameFromKey(preview.key) : 'Preview'}
        src={preview?.src ?? null}
        loading={preview?.loading}
        error={preview?.error}
        publicUrl={
          preview ? objectViewUrl(preview.key) || objectPublicUrl(preview.key) : undefined
        }
        onClose={closePreview}
        onCopy={
          preview ? () => void copyPublicUrl(preview.key) : undefined
        }
        onOpenTab={preview ? () => openInTab(preview.key) : undefined}
      />
    </div>
  )
}
