import { useState } from 'react'
import type { ServerConnection } from '../../types'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { Switch } from '../ui/Switch'

export function ConnectPasswordDialog({
  open,
  server,
  error,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean
  server: ServerConnection | null
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSubmit: (password: string, remember: boolean) => void
}) {
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const key = `${open}-${server?.id ?? ''}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setPassword('')
    setRemember(false)
  }

  const submit = () => {
    if (!password || busy) return
    onSubmit(password, remember)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={server ? `Connect to ${server.name}` : 'Connect'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!password || busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
        Session expired or no saved password. Sign in as{' '}
        <strong>{server?.username}</strong>.
      </p>
      {error ? (
        <p style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p>
      ) : null}
      <Field label="Password">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
      </Field>
      <div className="settings-row" style={{ padding: '8px 0 0' }}>
        <div className="settings-row__text">
          <div className="settings-row__title">Remember password</div>
          <div className="settings-row__desc">
            Stores the password in this browser. Leave off to keep only the
            session token.
          </div>
        </div>
        <Switch checked={remember} onChange={setRemember} />
      </div>
    </Modal>
  )
}
