import { useState, useEffect, useCallback, useRef } from 'react'
import { Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAddTask } from '@/hooks/useTasks'

interface ToastData {
  message: string
  action?: string
  taskId?: string
  taskTitle?: string
}

export function Toast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addTask = useAddTask()

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastData>).detail
      if (!detail) return

      clearTimer()
      setToast(detail)
      // Trigger animation by setting visible after a tick
      requestAnimationFrame(() => setVisible(true))

      if (detail.action === 'undo') {
        timerRef.current = setTimeout(() => {
          setVisible(false)
          setTimeout(() => setToast(null), 300)
        }, 3000)
      }
    }

    window.addEventListener('show-toast', handler)
    return () => {
      window.removeEventListener('show-toast', handler)
      clearTimer()
    }
  }, [clearTimer])

  const handleUndo = async () => {
    if (!toast?.taskTitle) return
    clearTimer()
    setVisible(false)
    setTimeout(() => setToast(null), 300)
    await addTask.mutateAsync({ title: toast.taskTitle })
  }

  const handleDismiss = () => {
    clearTimer()
    setVisible(false)
    setTimeout(() => setToast(null), 300)
  }

  if (!toast) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3',
          'bg-surface-1 border border-surface-3 rounded-lg px-4 py-2.5',
          'shadow-elevated',
          'transition-all duration-300 ease-out',
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0',
        )}
      >
        <span className="text-sm text-text-primary">{toast.message}</span>
        {toast.action === 'undo' && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={addTask.isPending}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5',
              'text-xs font-medium text-accent-400',
              'hover:bg-accent-400/10 active:scale-95',
              'transition-all duration-150',
              'disabled:opacity-40',
            )}
          >
            <Undo2 size={12} />
            撤销
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-text-disabled hover:text-text-secondary text-xs leading-none px-0.5"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
