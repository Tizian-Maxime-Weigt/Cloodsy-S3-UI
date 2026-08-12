import { useToast } from '../../store/toast'

export function ToastStack() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={`toast toast--${t.kind}`}
          onClick={() => dismiss(t.id)}
          type="button"
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
