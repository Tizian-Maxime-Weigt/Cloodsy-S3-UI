import { useMemo, useState } from 'react'
import type { ServerConnection } from '../../types'
import { deriveS3Endpoint } from '../../api/s3'
import { assertHttpEndpointUrl } from '../../lib/format'
import { useServers } from '../../store/ServerStore'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { Switch } from '../ui/Switch'

export function AddServerDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean
  onClose: () => void
  existing?: ServerConnection | null
}) {
  const { addServer, updateServer, hasPersistedPassword } = useServers()
  const { toast } = useToast()
  const [name, setName] = useState(existing?.name ?? '')
  const [url, setUrl] = useState(existing?.url ?? '')
  const [s3Url, setS3Url] = useState(existing?.s3Url ?? '')
  const [username, setUsername] = useState(existing?.username ?? '')
  const [password, setPassword] = useState('')
  const [rememberPassword, setRememberPassword] = useState(
    existing ? hasPersistedPassword(existing.id) : false,
  )

  // Reset when opening / switching edit target
  const key = `${existing?.id ?? 'new'}-${open}`
  const [prevKey, setPrevKey] = useState(key)
  if (key !== prevKey) {
    setPrevKey(key)
    setName(existing?.name ?? '')
    setUrl(existing?.url ?? '')
    setS3Url(existing?.s3Url ?? '')
    setUsername(existing?.username ?? '')
    setPassword('')
    setRememberPassword(existing ? hasPersistedPassword(existing.id) : false)
  }

  const canSave =
    name.trim() && url.trim() && username.trim() && (existing || password)

  const resolvedS3 = useMemo(() => {
    if (!url.trim() && !s3Url.trim()) return ''
    try {
      return deriveS3Endpoint(url.trim() || 'http://localhost:9001', s3Url.trim() || null)
    } catch {
      return ''
    }
  }, [url, s3Url])

  const save = () => {
    if (!canSave) return
    let normalizedUrl: string
    let normalizedS3: string | undefined
    try {
      normalizedUrl = assertHttpEndpointUrl(url, 'Admin URL')
      normalizedS3 = s3Url.trim()
        ? assertHttpEndpointUrl(s3Url, 'S3 URL')
        : undefined
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Invalid URL', 'error')
      return
    }
    if (existing) {
      updateServer(
        {
          ...existing,
          name: name.trim(),
          url: normalizedUrl,
          s3Url: normalizedS3,
          username: username.trim(),
        },
        {
          password: password || null,
          persistPassword: rememberPassword,
        },
      )
    } else {
      addServer(
        {
          name: name.trim(),
          url: normalizedUrl,
          s3Url: normalizedS3,
          username: username.trim(),
        },
        password,
        rememberPassword,
      )
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit Server' : 'Add Server'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {existing ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Production"
          autoFocus
        />
      </Field>
      <Field
        label="Admin URL"
        hint="Admin API for management (login, buckets, settings)."
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://admin.example.com:9001"
        />
      </Field>
      <Field
        label="S3 URL"
        hint="S3 API for upload / download / edit."
      >
        <Input
          value={s3Url}
          onChange={(e) => setS3Url(e.target.value)}
          placeholder="https://s3.example.com"
        />
      </Field>
      {resolvedS3 ? (
        <p className="server-endpoint-preview">
          Files endpoint: <code>{resolvedS3}</code>
          {!s3Url.trim() ? ' (auto from Admin URL)' : null}
        </p>
      ) : null}
      <Field label="Username">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          autoComplete="username"
        />
      </Field>
      <Field
        label="Password"
        hint={
          existing
            ? 'Leave blank to keep the current password (if remembered)'
            : 'Used to sign in. Not stored unless you turn on Remember password.'
        }
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Field>
      <div className="settings-row" style={{ padding: '8px 0 0' }}>
        <div className="settings-row__text">
          <div className="settings-row__title">Remember password</div>
          <div className="settings-row__desc">
            Saves the password in this browser. Off = session token only.
          </div>
        </div>
        <Switch checked={rememberPassword} onChange={setRememberPassword} />
      </div>
    </Modal>
  )
}
