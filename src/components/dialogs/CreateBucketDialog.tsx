import { ChevronDown, ChevronRight } from 'lucide-react'
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
  const [advanced, setAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setName('')
    setStorageDir('')
    setAdvanced(false)
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
      <button
        type="button"
        className="advanced-toggle"
        aria-expanded={advanced}
        onClick={() => setAdvanced((v) => !v)}
      >
        {advanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Advanced
      </button>
      {advanced ? (
        <Field label="Storage directory" hint="Optional absolute path. Leave empty for the default.">
          <Input
            value={storageDir}
            onChange={(e) => setStorageDir(e.target.value)}
            placeholder="/var/data/buckets/my-bucket"
          />
        </Field>
      ) : null}
    </Modal>
  )
}
