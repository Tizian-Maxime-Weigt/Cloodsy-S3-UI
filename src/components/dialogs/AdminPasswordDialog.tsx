import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../../store/toast'

export function AdminPasswordDialog({
  open,
  onClose,
  mode,
  username: fixedUsername,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'reset'
  username?: string
  onSubmit: (
    username: string,
    password: string,
  ) => Promise<Record<string, unknown> | null>
}) {
  const { toast } = useToast()
  const [username, setUsername] = useState(fixedUsername ?? '')
  const [custom, setCustom] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [resultPassword, setResultPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const key = `${open}-${mode}-${fixedUsername ?? ''}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setUsername(fixedUsername ?? '')
    setCustom(false)
    setPassword('')
    setBusy(false)
    setResultPassword(null)
    setCopied(false)
  }

  const submit = async () => {
    if (mode === 'create' && !username.trim()) return
    setBusy(true)
    const data = await onSubmit(username.trim(), custom ? password : '')
    setBusy(false)
    if (!data) return
    const pw = String(data.password ?? password)
    setResultPassword(pw)
    toast(
      mode === 'create' ? 'Admin created' : 'Password reset',
      'success',
    )
  }

  const copy = async () => {
    if (!resultPassword) return
    await navigator.clipboard.writeText(resultPassword)
    setCopied(true)
    toast('Password copied', 'success')
  }

  if (resultPassword) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Password (shown once)"
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="warning-box">
          Copy this password now. It will not be shown again.
        </div>
        <div className="secret-row">
          <code className="mono">{resultPassword}</code>
          <button className="btn-icon" onClick={copy} type="button">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Admin' : 'Reset Password'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy || (mode === 'create' && !username.trim()) || (custom && !password)}
          >
            {mode === 'create' ? 'Create' : 'Reset'}
          </Button>
        </>
      }
    >
      {mode === 'create' ? (
        <Field label="Username">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </Field>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>
          Reset password for <strong>{fixedUsername}</strong>
        </p>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={custom}
          onChange={(e) => setCustom(e.target.checked)}
        />
        Use custom password
      </label>
      {custom ? (
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      ) : (
        <p className="field-hint">A secure password will be generated automatically.</p>
      )}
    </Modal>
  )
}
