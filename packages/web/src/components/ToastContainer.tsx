import { useEffect } from 'react'
import { useUIStore } from '../stores/ui-store'

export function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  onRemove: (id: string) => void
}

function Toast({ id, message, type, onRemove }: ToastProps): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 3000)
    return () => clearTimeout(timer)
  }, [id, onRemove])

  const bgColor =
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-blue-600'

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-xs pointer-events-auto`}
    >
      {message}
    </div>
  )
}
