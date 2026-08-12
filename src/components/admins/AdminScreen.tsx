import { KeyRound, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDate } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { AdminPasswordDialog } from '../dialogs/AdminPasswordDialog'
import { TopBar } from '../layout/TopBar'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'

export function AdminScreen({
  onBack,
  showTopBar,
}: {
  onBack?: () => void
  showTopBar?: boolean
}) {
  const { admins, fetchAdmins, createAdmin, deleteAdmin, resetAdminPassword, error, clearError } =
    useBuckets()
  const { username } = useAuth()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [resetUser, setResetUser] = useState<string | null>(null)
  const [deleteUser, setDeleteUser] = useState<string | null>(null)

  useEffect(() => {
    void fetchAdmins()
  }, [fetchAdmins])

  useEffect(() => {
    if (error) {
      toast(error, 'error')
      clearError()
    }
  }, [error, toast, clearError])

  return (
    <div className="app-content">
      {showTopBar ? (
        <TopBar
          title="Admin Users"
          left={
            onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Back
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="page">
        <div className="page-header">
          <h1>Admin Users</h1>
          <div className="spacer" />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Create admin
          </Button>
        </div>

        {admins.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No admins"
            description="Create an admin user to manage this server."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                Create admin
              </Button>
            }
          />
        ) : (
          admins.map((admin) => {
            const isYou = admin.username === username
            const canDelete = !isYou && admins.length > 1
            return (
              <div key={admin.id} className="panel list-card">
                <div className="list-card__header">
                  <strong>{admin.username}</strong>
                  {isYou ? <span className="badge">you</span> : null}
                  <span className="spacer" />
                  <button
                    className="btn-icon"
                    type="button"
                    title="Reset password"
                    aria-label={`Reset password for ${admin.username}`}
                    onClick={() => setResetUser(admin.username)}
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    className="btn-icon is-danger"
                    type="button"
                    title="Delete"
                    aria-label={`Delete admin ${admin.username}`}
                    disabled={!canDelete}
                    onClick={() => setDeleteUser(admin.username)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Created {formatDate(admin.createdAt)}
                </div>
              </div>
            )
          })
        )}
      </div>

      <AdminPasswordDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={(uname, password) => createAdmin(uname, password)}
      />
      <AdminPasswordDialog
        open={!!resetUser}
        mode="reset"
        username={resetUser ?? undefined}
        onClose={() => setResetUser(null)}
        onSubmit={(_u, password) =>
          resetAdminPassword(resetUser!, password)
        }
      />
      <ConfirmModal
        open={!!deleteUser}
        title="Delete admin"
        message={`Delete admin '${deleteUser}'?`}
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteUser(null)}
        onConfirm={async () => {
          if (!deleteUser) return
          const ok = await deleteAdmin(deleteUser)
          if (ok) toast('Admin deleted', 'success')
          setDeleteUser(null)
        }}
      />
    </div>
  )
}
