import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'

export function PromptModal({
  open,
  title,
  label,
  hint,
  initial = '',
  placeholder,
  confirmLabel = 'Save',
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  label: string
  hint?: string
  initial?: string
  placeholder?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: (value: string) => void | Promise<void>
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const key = `${title}-${open}-${initial}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setValue(initial)
    setBusy(false)
  }

  const submit = async () => {
    const v = value.trim()
    if (!v || busy) return
    setBusy(true)
    try {
      await onConfirm(v)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!value.trim() || busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} hint={hint}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
      </Field>
    </Modal>
  )
}

export function TextEditModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  initial: string
  onClose: () => void
  onSave: (text: string) => void | Promise<void>
}) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const key = `${title}-${open}`
  const [prev, setPrev] = useState(key)
  if (key !== prev) {
    setPrev(key)
    setText(initial)
    setBusy(false)
  }

  useEffect(() => {
    if (open) setText(initial)
  }, [open, initial])

  const save = async () => {
    setBusy(true)
    try {
      await onSave(text)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            Save
          </Button>
        </>
      }
    >
      <textarea
        className="input textarea-editor"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
    </Modal>
  )
}

export function ImagePreviewModal({
  open,
  title,
  src,
  loading,
  error,
  publicUrl,
  onClose,
  onCopy,
  onOpenTab,
}: {
  open: boolean
  title: string
  src: string | null
  loading?: boolean
  error?: string | null
  publicUrl?: string
  onClose: () => void
  onCopy?: () => void
  onOpenTab?: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          {onCopy ? (
            <Button variant="outline" onClick={onCopy}>
              Copy URL
            </Button>
          ) : null}
          {onOpenTab ? (
            <Button variant="outline" onClick={onOpenTab}>
              Open in tab
            </Button>
          ) : null}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="image-preview">
        {loading ? <div className="spinner" /> : null}
        {error ? <p className="image-preview__error">{error}</p> : null}
        {!loading && !error && src ? (
          <img src={src} alt={title} className="image-preview__img" />
        ) : null}
        {publicUrl ? (
          <code className="image-preview__url">{publicUrl}</code>
        ) : null}
      </div>
    </Modal>
  )
}
