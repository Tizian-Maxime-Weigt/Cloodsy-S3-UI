import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Copy, X } from 'lucide-react'
import { useToast } from '../../store/toast'
import { Button } from './Button'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Modal({ title, open, onClose, children, footer, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = panelRef.current
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
    const initial =
      focusables.find((el) => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ?? focusables[0]
    initial?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && panel) {
        const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
        )
        if (nodes.length === 0) return
        const first = nodes[0]!
        const last = nodes[nodes.length - 1]!
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
      if (e.key === 'Enter') {
        const target = e.target
        if (target instanceof HTMLTextAreaElement) return
        if (target instanceof HTMLButtonElement) return
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return
        if (target.type === 'checkbox' || target.type === 'radio') return
        e.preventDefault()
        footerRef.current
          ?.querySelector<HTMLButtonElement>('.btn-primary:not(:disabled), .btn-danger:not(:disabled)')
          ?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn-icon" onClick={onClose} aria-label="Close" type="button">
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? (
          <div className="modal__footer" ref={footerRef}>
            {footer}
          </div>
        ) : null}
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
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
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
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{message}</p>
    </Modal>
  )
}

export function SecretRevealModal({
  open,
  title,
  warning = 'Copy this now. It will not be shown again.',
  rows,
  onClose,
}: {
  open: boolean
  title: string
  warning?: string
  rows: { label: string; value: string }[]
  onClose: () => void
}) {
  const { toast } = useToast()
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value)
    toast(`${label} copied`, 'success')
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="warning-box">{warning}</div>
      {rows.map((row) => (
        <div key={row.label} className="secret-reveal">
          <div className="field-hint" style={{ marginBottom: 4 }}>
            {row.label}
          </div>
          <div className="secret-row">
            <code className="mono">{row.value}</code>
            <button
              className="btn-icon"
              type="button"
              aria-label={`Copy ${row.label}`}
              onClick={() => void copy(row.value, row.label)}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      ))}
    </Modal>
  )
}
