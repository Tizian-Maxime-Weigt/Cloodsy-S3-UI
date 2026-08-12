import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { AddLifecycleDialog } from '../dialogs/AddLifecycleDialog'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'

export function LifecycleTab({ bucketName }: { bucketName: string }) {
  const { lifecycleRules, fetchLifecycleRules, addLifecycleRule, deleteLifecycleRules } =
    useBuckets()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [deletePrefix, setDeletePrefix] = useState<string | null>(null)

  useEffect(() => {
    void fetchLifecycleRules(bucketName)
  }, [bucketName, fetchLifecycleRules])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="page-header" style={{ padding: 0 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Lifecycle rules</h2>
        <div className="spacer" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          Add rule
        </Button>
      </div>

      {lifecycleRules.length === 0 ? (
        <EmptyState
          title="No lifecycle rules"
          description="Add rules to auto-expire objects by age and prefix."
        />
      ) : (
        lifecycleRules.map((rule) => (
          <div key={rule.id} className="panel list-card">
            <div className="list-card__header">
              <strong>
                {rule.name || `Expire ${rule.expirationDays}d`}
              </strong>
              <span className="badge">{rule.expirationDays} days</span>
              <span className="spacer" />
              <button
                className="btn-icon is-danger"
                type="button"
                onClick={() => setDeletePrefix(rule.prefix)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Prefix: {rule.prefix || '(all)'}
            </div>
          </div>
        ))
      )}

      <AddLifecycleDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, prefix, days) => {
          const ok = await addLifecycleRule(bucketName, name, prefix, days)
          if (ok) toast('Rule added', 'success')
          return ok
        }}
      />
      <ConfirmModal
        open={deletePrefix !== null}
        title="Delete rule"
        message="Delete this lifecycle rule?"
        confirmLabel="Delete"
        danger
        onClose={() => setDeletePrefix(null)}
        onConfirm={async () => {
          if (deletePrefix === null) return
          const ok = await deleteLifecycleRules(bucketName, deletePrefix)
          if (ok) toast('Rule deleted', 'success')
          setDeletePrefix(null)
        }}
      />
    </div>
  )
}
