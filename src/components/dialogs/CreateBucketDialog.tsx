import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function CreateBucketDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, storageDir: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [storageDir, setStorageDir] = useState('')
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setName('')
    setStorageDir('')
    setBusy(false)
  }

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    const ok = await onCreate(name.trim(), storageDir.trim())
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Bucket"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || busy}>
            Create
          </Button>
        </>
      }
    >
      <Field label="Bucket name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-bucket"
          autoFocus
        />
      </Field>
      <Field label="Storage directory (optional)" hint="Absolute path, or leave empty for default">
        <Input
          value={storageDir}
          onChange={(e) => setStorageDir(e.target.value)}
          placeholder="/var/data/buckets/my-bucket"
        />
      </Field>
    </Modal>
  )
}
