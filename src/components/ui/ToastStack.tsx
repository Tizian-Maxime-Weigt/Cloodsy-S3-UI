import { Check, CircleAlert, Info, X } from 'lucide-react'
import { useToast, type ToastKind } from '../../store/toast'

const ICONS: Record<ToastKind, typeof Check> = {
  success: Check,
  error: CircleAlert,
  info: Info,
}

export function ToastStack() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={`toast toast--${t.kind}`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <span className="toast__icon" aria-hidden>
              <Icon size={16} strokeWidth={2.25} />
            </span>
            <p className="toast__message">{t.message}</p>
            <button
              className="btn-icon toast__close"
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
