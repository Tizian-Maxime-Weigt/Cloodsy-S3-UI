import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface ToastStoreValue {
  toasts: Toast[]
  toast: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

const ToastStoreContext = createContext<ToastStoreValue | null>(null)

let nextId = 1

export function ToastStoreProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, message, kind }])
      window.setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, toast, dismiss }), [dismiss, toast, toasts])

  return (
    <ToastStoreContext.Provider value={value}>{children}</ToastStoreContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastStoreContext)
  if (!ctx) throw new Error('useToast must be used within ToastStoreProvider')
  return ctx
}
