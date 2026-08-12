import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function SetStorageDialog({
  open,
  onClose,
  current,
  onSave,
  onReset,
}: {
  open: boolean
  onClose: () => void
  current?: string
  onSave: (dir: string) => Promise<boolean>
  onReset: () => Promise<boolean>
}) {
  const [dir, setDir] = useState(current ?? '')
  const [busy, setBusy] = useState(false)

  const key = `${open}-${current ?? ''}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setDir(current ?? '')
    setBusy(false)
  }

  const submit = async () => {
    setBusy(true)
    const ok = await onSave(dir.trim())
    setBusy(false)
    if (ok) onClose()
  }

  const reset = async () => {
    setBusy(true)
    const ok = await onReset()
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Storage Directory"
      footer={
        <>
          <Button variant="outline" onClick={reset} disabled={busy}>
            Reset default
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !dir.trim()}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Absolute path">
        <Input
          value={dir}
          onChange={(e) => setDir(e.target.value)}
          placeholder="/var/data/buckets/my-bucket"
          autoFocus
        />
      </Field>
    </Modal>
  )
}
