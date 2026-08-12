import { useState } from 'react'
import { assertHttpEndpointUrl } from '../../lib/format'
import { useToast } from '../../store/toast'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function AddWebhookDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (
    name: string,
    url: string,
    events: string,
    secret: string,
  ) => Promise<boolean>
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('*')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setName('')
    setUrl('')
    setEvents('*')
    setSecret('')
    setBusy(false)
  }

  const submit = async () => {
    if (!url.trim()) return
    let normalizedUrl: string
    try {
      normalizedUrl = assertHttpEndpointUrl(url, 'Webhook URL')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Invalid webhook URL', 'error')
      return
    }
    setBusy(true)
    const ok = await onCreate(
      name.trim(),
      normalizedUrl,
      events.trim() || '*',
      secret,
    )
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Webhook"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !url.trim()}>
            Add
          </Button>
        </>
      }
    >
      <Field label="Name (optional)">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="URL">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/hooks/s3"
        />
      </Field>
      <Field label="Event types" hint="Comma-separated or * for all">
        <Input value={events} onChange={(e) => setEvents(e.target.value)} />
      </Field>
      <Field label="Secret (optional)">
        <Input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </Field>
    </Modal>
  )
}
