import { Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatPermission } from '../../lib/format'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { CreateCredentialDialog } from '../dialogs/CreateCredentialDialog'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal, SecretRevealModal } from '../ui/Modal'

export function CredentialsTab({ bucketName }: { bucketName: string }) {
  const { credentials, fetchCredentials, createCredential, deleteCredential } = useBuckets()
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

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast(`${label} copied`, 'success')
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

      {credentials.length === 0 ? (
        <EmptyState
          title="No credentials"
          description="Create an access key to upload, download, and edit files in this bucket."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Create credential
            </Button>
          }
        />
      ) : (
        credentials.map((c) => (
          <div key={c.accessKey} className="panel list-card">
            <div className="list-card__header">
              <strong>{c.name || c.accessKey}</strong>
              <span className="badge">{formatPermission(c.permission)}</span>
              <span className="spacer" />
              <button
                className="btn-icon is-danger"
                type="button"
                aria-label={`Delete credential ${c.name || c.accessKey}`}
                onClick={() => setDeleteKey(c.accessKey)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="secret-row">
              <span style={{ fontSize: 12, color: 'var(--muted)', width: 72 }}>Access</span>
              <code className="mono">{c.accessKey}</code>
              <button className="btn-icon" type="button" aria-label="Copy access key" onClick={() => void copy(c.accessKey, 'Access key')}>
                <Copy size={14} />
              </button>
            </div>
            {c.secretKey ? (
              <div className="secret-row">
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 72 }}>Secret</span>
                <code className="mono">
                  {visible[c.accessKey] ? c.secretKey : '••••••••••••••••'}
                </code>
                <button
                  className="btn-icon"
                  type="button"
                  aria-label={visible[c.accessKey] ? 'Hide secret key' : 'Show secret key'}
                  onClick={() =>
                    setVisible((v) => ({ ...v, [c.accessKey]: !v[c.accessKey] }))
                  }
                >
                  {visible[c.accessKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  className="btn-icon"
                  type="button"
                  aria-label="Copy secret key"
                  onClick={() => void copy(c.secretKey!, 'Secret key')}
                >
                  <Copy size={14} />
                </button>
              </div>
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
        message={`Delete access key '${deleteKey}'?`}
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

      <SecretRevealModal
        open={!!createdSecret}
        title="Secret key (shown once)"
        warning="Copy the secret now. It will not be shown again after you close this dialog."
        rows={
          createdSecret
            ? [
                { label: 'Access key', value: createdSecret.accessKey },
                { label: 'Secret key', value: createdSecret.secretKey },
              ]
            : []
        }
        onClose={() => setCreatedSecret(null)}
      />
    </div>
  )
}
