import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { AddWebhookDialog } from '../dialogs/AddWebhookDialog'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'

export function WebhooksTab({ bucketName }: { bucketName: string }) {
  const { webhooks, fetchWebhooks, addWebhook, deleteWebhook } = useBuckets()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    void fetchWebhooks(bucketName)
  }, [bucketName, fetchWebhooks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="page-header" style={{ padding: 0 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Webhooks</h2>
        <div className="spacer" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          Add webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks"
          description="Configure event notification endpoints for this bucket."
        />
      ) : (
        webhooks.map((wh) => (
          <div key={wh.id} className="panel list-card">
            <div className="list-card__header">
              <strong>{wh.name || wh.url}</strong>
              <span className={`badge ${wh.active ? '' : ''}`}>
                <span
                  className={`nav-item__dot ${wh.active ? 'is-online' : ''}`}
                  style={{ display: 'inline-block' }}
                />
                {wh.active ? 'Active' : 'Inactive'}
              </span>
              <span className="spacer" />
              <button
                className="btn-icon is-danger"
                type="button"
                onClick={() => setDeleteId(wh.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mono" style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>
              {wh.url}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Events: {wh.eventTypes || '*'}
            </div>
          </div>
        ))
      )}

      <AddWebhookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, url, events, secret) => {
          const ok = await addWebhook(bucketName, name, url, events, secret)
          if (ok) toast('Webhook added', 'success')
          return ok
        }}
      />
      <ConfirmModal
        open={deleteId !== null}
        title="Delete webhook"
        message="Remove this webhook?"
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId === null) return
          const ok = await deleteWebhook(deleteId, bucketName)
          if (ok) toast('Webhook deleted', 'success')
          setDeleteId(null)
        }}
      />
    </div>
  )
}
