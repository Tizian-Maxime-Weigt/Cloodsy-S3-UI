import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function AddLifecycleDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, prefix: string, days: number) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setName('')
    setPrefix('')
    setDays('30')
    setBusy(false)
  }

  const submit = async () => {
    const d = Number(days)
    if (!Number.isFinite(d) || d <= 0) return
    setBusy(true)
    const ok = await onCreate(name.trim(), prefix.trim(), d)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Lifecycle Rule"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !days}>
            Add
          </Button>
        </>
      }
    >
      <Field label="Name (optional)">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Prefix filter" hint="Empty = all objects">
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="logs/"
        />
      </Field>
      <Field label="Expiration days">
        <Input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </Field>
    </Modal>
  )
}
