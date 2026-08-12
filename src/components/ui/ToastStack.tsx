import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useToast, type ToastKind } from '../../store/toast'

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function ToastStack() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <button
            key={t.id}
            className={`toast toast--${t.kind}`}
            onClick={() => dismiss(t.id)}
            type="button"
          >
            <Icon size={16} className="toast__icon" aria-hidden />
            <span className="toast__msg">{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
