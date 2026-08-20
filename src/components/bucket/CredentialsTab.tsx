import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { deriveS3Endpoint } from '../../api/s3'
import { useAuth } from '../../store/auth'
import { useBuckets } from '../../store/buckets'
import { useServers } from '../../store/ServerStore'
import { useToast } from '../../store/toast'
import { CreateCredentialDialog } from '../dialogs/CreateCredentialDialog'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'

function CopyRow({
  label,
  value,
  display,
  title,
  onCopy,
  extraActions,
}: {
  label: string
  value: string
  display?: ReactNode
  title?: string
  onCopy: () => void
  extraActions?: ReactNode
}) {
  return (
    <div className="secret-row">
      <span className="secret-row__label">{label}</span>
      <code className="mono" title={title ?? value}>
        {display ?? value}
      </code>
      <div className="secret-row__actions">
        {extraActions}
        <Button variant="outline" size="sm" type="button" onClick={onCopy}>
          <Copy size={14} />
          Copy
        </Button>
      </div>
    </div>
  )
}

export function CredentialsTab({ bucketName }: { bucketName: string }) {
  const { credentials, fetchCredentials, createCredential, deleteCredential } = useBuckets()
  const { activeServer } = useServers()
  const { api } = useAuth()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [createdSecret, setCreatedSecret] = useState<{
    accessKey: string
    secretKey: string
  } | null>(null)

  useEffect(() => {
    void fetchCredentials(bucketName)
  }, [bucketName, fetchCredentials])

  const adminUrl = activeServer?.url || api.baseUrl
  const s3Endpoint = adminUrl ? deriveS3Endpoint(adminUrl, activeServer?.s3Url) : ''

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label} copied`, 'success')
    } catch {
      toast(text, 'info')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="page-header" style={{ padding: 0 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Credentials</h2>
        <div className="spacer" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          Create
        </Button>
      </div>

      <div className="panel list-card">
        <div className="list-card__header">
          <strong>Connection</strong>
        </div>
        <CopyRow
          label="URL"
          value={s3Endpoint || '—'}
          title={s3Endpoint || undefined}
          onCopy={() => {
            if (!s3Endpoint) {
              toast('Set an S3 URL on the server first', 'error')
              return
            }
            void copy(s3Endpoint, 'URL')
          }}
        />
        <CopyRow
          label="Bucket"
          value={bucketName}
          onCopy={() => void copy(bucketName, 'Bucket')}
        />
      </div>

      {credentials.length === 0 ? (
        <EmptyState
          title="No credentials"
          description="Create an access key for this bucket."
        />
      ) : (
        credentials.map((c) => (
          <div key={c.accessKey} className="panel list-card">
            <div className="list-card__header">
              <strong>{c.name || c.accessKey}</strong>
              <span className="badge">{c.permission}</span>
              <span className="spacer" />
              <button
                className="btn-icon is-danger"
                type="button"
                onClick={() => setDeleteKey(c.accessKey)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <CopyRow
              label="access-id"
              value={c.accessKey}
              onCopy={() => void copy(c.accessKey, 'access-id')}
            />
            {c.secretKey ? (
              <CopyRow
                label="Secret"
                value={c.secretKey}
                title={visible[c.accessKey] ? c.secretKey : undefined}
                display={visible[c.accessKey] ? c.secretKey : '••••••••••••••••'}
                onCopy={() => void copy(c.secretKey!, 'Secret key')}
                extraActions={
                  <button
                    className="btn-icon"
                    type="button"
                    title={visible[c.accessKey] ? 'Hide secret' : 'Show secret'}
                    onClick={() =>
                      setVisible((v) => ({ ...v, [c.accessKey]: !v[c.accessKey] }))
                    }
                  >
                    {visible[c.accessKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
            ) : null}
          </div>
        ))
      )}

      <CreateCredentialDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, permission) => {
          const cred = await createCredential(bucketName, name, permission)
          if (cred) {
            toast('Credential created', 'success')
            if (cred.secretKey) {
              setCreatedSecret({ accessKey: cred.accessKey, secretKey: cred.secretKey })
            }
            return true
          }
          return false
        }}
      />

      <ConfirmModal
        open={!!deleteKey}
        title="Delete credential"
        message={`Delete access-id '${deleteKey}'?`}
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteKey(null)}
        onConfirm={async () => {
          if (!deleteKey) return
          const ok = await deleteCredential(deleteKey, bucketName)
          if (ok) toast('Credential deleted', 'success')
          setDeleteKey(null)
        }}
      />

      <ConfirmModal
        open={!!createdSecret}
        title="Secret key (shown once)"
        message={
          createdSecret
            ? `access-id: ${createdSecret.accessKey}\nSecret: ${createdSecret.secretKey}`
            : ''
        }
        confirmLabel="Copy secret"
        onClose={() => setCreatedSecret(null)}
        onConfirm={() => {
          if (createdSecret) void copy(createdSecret.secretKey, 'Secret key')
          setCreatedSecret(null)
        }}
      />
    </div>
  )
}
