import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function CreateCredentialDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, permission: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [permission, setPermission] = useState('read-write')
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setName('')
    setPermission('read-write')
    setBusy(false)
  }

  const submit = async () => {
    setBusy(true)
    const ok = await onCreate(name.trim(), permission)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Credential"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            Create
          </Button>
        </>
      }
    >
      <Field label="Name (optional)">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="app-backend"
          autoFocus
        />
      </Field>
      <Field label="Permission">
        <Select value={permission} onChange={(e) => setPermission(e.target.value)}>
          <option value="read-write">Read & write — upload, download, and delete</option>
          <option value="read-only">Read only — download and list</option>
        </Select>
      </Field>
    </Modal>
  )
}
