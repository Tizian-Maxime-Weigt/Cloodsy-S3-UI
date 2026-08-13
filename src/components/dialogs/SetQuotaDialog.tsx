import { useState } from 'react'
import { formatBytes } from '../../lib/format'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'

const UNITS = [
  { label: 'KB', mul: 1024 },
  { label: 'MB', mul: 1024 ** 2 },
  { label: 'GB', mul: 1024 ** 3 },
  { label: 'TB', mul: 1024 ** 4 },
] as const

type Unit = (typeof UNITS)[number]['label']

const PRESETS: { label: string; bytes: number }[] = [
  { label: '1 GB', bytes: 1024 ** 3 },
  { label: '10 GB', bytes: 10 * 1024 ** 3 },
  { label: '100 GB', bytes: 100 * 1024 ** 3 },
  { label: '1 TB', bytes: 1024 ** 4 },
  { label: 'Unlimited', bytes: 0 },
]

function fromBytes(bytes: number): { amount: string; unit: Unit } {
  if (bytes <= 0) return { amount: '10', unit: 'GB' }
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const u = UNITS[i]!
    const n = bytes / u.mul
    if (n >= 1 || i === 0) {
      const nice = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
      return { amount: nice, unit: u.label }
    }
  }
  return { amount: '10', unit: 'GB' }
}

function toBytes(amount: string, unit: Unit): number | null {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  const mul = UNITS.find((u) => u.label === unit)?.mul ?? 1
  return Math.round(n * mul)
}

export function SetQuotaDialog({
  open,
  onClose,
  current = 0,
  used = 0,
  onSave,
  onRemove,
}: {
  open: boolean
  onClose: () => void
  current?: number
  used?: number
  onSave: (bytes: number) => Promise<boolean>
  onRemove: () => Promise<boolean>
}) {
  const initial = fromBytes(current)
  const [amount, setAmount] = useState(initial.amount)
  const [unit, setUnit] = useState<Unit>(initial.unit)
  const [unlimited, setUnlimited] = useState(current <= 0)
  const [busy, setBusy] = useState(false)

  const key = `${open}-${current}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    const next = fromBytes(current)
    setAmount(next.amount)
    setUnit(next.unit)
    setUnlimited(current <= 0)
    setBusy(false)
  }

  const bytes = unlimited ? 0 : toBytes(amount, unit)
  const belowUsage = Boolean(bytes && used > 0 && bytes < used)
  const presetBytes = unlimited ? 0 : bytes
  const canSave = unlimited || bytes !== null

  const applyPreset = (value: number) => {
    if (value <= 0) {
      setUnlimited(true)
      return
    }
    const next = fromBytes(value)
    setUnlimited(false)
    setAmount(next.amount)
    setUnit(next.unit)
  }

  const submit = async () => {
    if (!canSave) return
    setBusy(true)
    const ok = unlimited ? await onRemove() : await onSave(bytes!)
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !canSave}>
            Save
          </Button>
        </>
      }
    >
      <p className="quota-lead">Cap how much this bucket can store.</p>

      <dl className="quota-now">
        <div>
          <dt>Used</dt>
          <dd>{formatBytes(used)}</dd>
        </div>
        <div>
          <dt>Current quota</dt>
          <dd>{current > 0 ? formatBytes(current) : 'Unlimited'}</dd>
        </div>
      </dl>

      <div className="quota-presets" role="group" aria-label="Quota presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`quota-preset ${presetBytes === p.bytes ? 'is-on' : ''}`}
            onClick={() => applyPreset(p.bytes)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Field label="Custom limit">
        <div className={`quota-input ${unlimited ? 'is-off' : ''}`}>
          <input
            className="quota-input__amount"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={unlimited ? '' : amount}
            placeholder={unlimited ? 'No cap' : '10'}
            autoFocus
            onChange={(e) => {
              setUnlimited(false)
              setAmount(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
          />
          <div className="quota-input__units" role="group" aria-label="Unit">
            {UNITS.map((u) => (
              <button
                key={u.label}
                type="button"
                className={`quota-input__unit ${!unlimited && unit === u.label ? 'is-on' : ''}`}
                onClick={() => {
                  setUnlimited(false)
                  setUnit(u.label)
                }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <p className="quota-preview">
        {unlimited ? 'No storage cap' : bytes ? formatBytes(bytes) : 'Enter a limit to save'}
      </p>
      {belowUsage ? (
        <p className="quota-warn">This is below current usage ({formatBytes(used)}).</p>
      ) : null}
    </Modal>
  )
}
