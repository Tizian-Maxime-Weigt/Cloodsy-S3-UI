import { Copy, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Bucket } from '../../types'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { SetQuotaDialog } from '../dialogs/SetQuotaDialog'
import { SetStorageDialog } from '../dialogs/SetStorageDialog'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/Modal'
import { StorageMeter } from '../ui/StorageMeter'
import { Switch } from '../ui/Switch'

export function SettingsTab({
  bucket,
  onDeleted,
}: {
  bucket: Bucket
  onDeleted?: () => void
}) {
  const {
    setQuota,
    setStorage,
    setVersioning,
    setPublicRead,
    setWebdavEnabled,
    reprocessImages,
    webdavMountUrl,
    deleteBucket,
  } = useBuckets()
  const { toast } = useToast()
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isVersioningEnabled = /enabled/i.test(bucket.versioning)

  const copyMount = async () => {
    if (!webdavMountUrl) return
    const url = `${webdavMountUrl}${bucket.name}`
    await navigator.clipboard.writeText(url)
    toast('Mount URL copied', 'success')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="panel" style={{ padding: '4px 16px' }}>
        <div className="settings-row">
          <div className="settings-row__title">Quota</div>
          <div className="settings-row__quota">
            <StorageMeter
              used={bucket.usageBytes}
              quota={bucket.quotaBytes}
              size="sm"
              layout="inline"
              label={false}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setQuotaOpen(true)}>
            Configure
          </Button>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">Storage directory</div>
            <div className="settings-row__desc">
              {bucket.storagePath || bucket.storageDir || 'Default'}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStorageOpen(true)}>
            Configure
          </Button>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">Versioning</div>
            <div className="settings-row__desc">
              {isVersioningEnabled ? 'Enabled' : 'Suspended'}
            </div>
          </div>
          <Switch
            checked={isVersioningEnabled}
            onChange={(next) => {
              void setVersioning(bucket.name, next ? 'Enabled' : 'Suspended').then((ok) => {
                if (ok) toast(next ? 'Versioning enabled' : 'Versioning suspended', 'success')
              })
            }}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">Public read</div>
            <div className="settings-row__desc">
              Allow anonymous GET/HEAD of objects
            </div>
          </div>
          <Switch
            checked={bucket.publicRead}
            onChange={(next) => {
              void setPublicRead(bucket.name, next).then((ok) => {
                if (ok) toast(next ? 'Public read enabled' : 'Public read disabled', 'success')
              })
            }}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">WebDAV access</div>
            <div className="settings-row__desc">
              Mount this bucket as a network drive
            </div>
          </div>
          <Switch
            checked={bucket.webdavEnabled}
            onChange={(next) => {
              void setWebdavEnabled(bucket.name, next).then((ok) => {
                if (ok) toast(next ? 'WebDAV enabled' : 'WebDAV disabled', 'success')
              })
            }}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">Image optimization</div>
            <div className="settings-row__desc">
              Regenerate optimized image variants in the background
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={reprocessing}
            onClick={async () => {
              setReprocessing(true)
              const ok = await reprocessImages(bucket.name)
              setReprocessing(false)
              if (ok) toast('Reprocess started', 'success')
            }}
          >
            <RefreshCw size={14} />
            Reprocess
          </Button>
        </div>
      </div>

      <div className="panel" style={{ padding: '4px 16px' }}>
        <div className="settings-row">
          <div className="settings-row__text">
            <div className="settings-row__title">Delete bucket</div>
            <div className="settings-row__desc">
              Permanently remove this bucket and all of its objects. This cannot be undone.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {bucket.webdavEnabled && webdavMountUrl ? (
        <div className="panel list-card">
          <div className="list-card__header">
            <strong>WebDAV mount URL</strong>
          </div>
          <div className="secret-row">
            <code className="mono">{`${webdavMountUrl}${bucket.name}`}</code>
            <div className="secret-row__actions">
              <button
                className="btn-icon"
                type="button"
                title="Copy mount URL"
                onClick={() => void copyMount()}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <p className="field-hint">
            Username is an access key; password is its secret key.
          </p>
        </div>
      ) : null}

      <SetQuotaDialog
        open={quotaOpen}
        onClose={() => setQuotaOpen(false)}
        onSave={async (bytes) => {
          const ok = await setQuota(bucket.name, bytes)
          if (ok) toast('Quota updated', 'success')
          return ok
        }}
        onRemove={async () => {
          const ok = await setQuota(bucket.name, 0)
          if (ok) toast('Quota removed', 'success')
          return ok
        }}
      />
      <SetStorageDialog
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        current={bucket.storageDir || bucket.storagePath || ''}
        onSave={async (dir) => {
          const ok = await setStorage(bucket.name, dir)
          if (ok) toast('Storage updated', 'success')
          return ok
        }}
        onReset={async () => {
          const ok = await setStorage(bucket.name, '')
          if (ok) toast('Storage reset', 'success')
          return ok
        }}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete Bucket"
        message={`Permanently delete '${bucket.name}'? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        requireTypedValue={bucket.name}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const ok = await deleteBucket(bucket.name)
          setDeleteOpen(false)
          if (ok) {
            toast('Bucket deleted', 'success')
            onDeleted?.()
          }
        }}
      />
    </div>
  )
}
