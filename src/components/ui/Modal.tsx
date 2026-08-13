import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { Field, Input } from './Field'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  preview?: boolean
}

export function Modal({ title, open, onClose, children, footer, wide, preview }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${preview ? 'modal--preview' : wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2>{title}</h2>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={`modal__body ${preview ? 'modal__body--preview' : ''}`}>{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  requireTypedValue,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  requireTypedValue?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const resetKey = open ? (requireTypedValue ?? '') : ''
  const [prevKey, setPrevKey] = useState(resetKey)
  if (resetKey !== prevKey) {
    setPrevKey(resetKey)
    setTyped('')
  }

  const matches = !requireTypedValue || typed.trim() === requireTypedValue
  const confirm = () => {
    if (!matches) return
    onConfirm()
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={confirm} disabled={!matches}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {requireTypedValue ? (
        <Field label={`Type ${requireTypedValue} to confirm`}>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireTypedValue}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm()
            }}
          />
        </Field>
      ) : null}
    </Modal>
  )
}
