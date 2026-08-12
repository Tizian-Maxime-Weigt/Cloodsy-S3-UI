import { useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

const UNITS = [
  { label: 'KB', mul: 1024 },
  { label: 'MB', mul: 1024 ** 2 },
  { label: 'GB', mul: 1024 ** 3 },
  { label: 'TB', mul: 1024 ** 4 },
]

export function SetQuotaDialog({
  open,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean
  onClose: () => void
  onSave: (bytes: number) => Promise<boolean>
  onRemove: () => Promise<boolean>
}) {
  const [amount, setAmount] = useState('10')
  const [unit, setUnit] = useState('GB')
  const [busy, setBusy] = useState(false)

  const key = String(open)
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setAmount('10')
    setUnit('GB')
    setBusy(false)
  }

  const submit = async () => {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    const mul = UNITS.find((u) => u.label === unit)?.mul ?? 1
    setBusy(true)
    const ok = await onSave(Math.round(n * mul))
    setBusy(false)
    if (ok) onClose()
  }

  const remove = async () => {
    setBusy(true)
    const ok = await onRemove()
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set Quota"
      footer={
        <>
          <Button variant="outline" onClick={remove} disabled={busy}>
            Remove quota
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !amount}>
            Save
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Amount">
          <Input
            type="number"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Unit">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u.label} value={u.label}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
