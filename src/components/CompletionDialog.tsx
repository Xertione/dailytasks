import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompletionDialogProps {
  open: boolean
  taskTitle: string
  onComplete: (note: string) => void
  onClose: () => void
}

export function CompletionDialog({ open, taskTitle, onComplete, onClose }: CompletionDialogProps) {
  const [note, setNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setNote('')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-5 w-[340px] shadow-elevated animate-scale-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">完成得怎么样？</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-secondary mb-3 truncate" title={taskTitle}>
          {taskTitle}
        </p>

        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="简单描述一下做了什么..."
          rows={3}
          className={cn(
            'w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2',
            'text-sm text-text-primary placeholder:text-text-tertiary',
            'outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25',
            'resize-none transition-colors duration-150',
          )}
        />

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => onClose()}
            className="flex-1 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-2 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onComplete('')}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-surface-2 text-text-primary hover:bg-surface-3 transition-colors"
          >
            直接完成
          </button>
          <button
            type="button"
            onClick={() => onComplete(note.trim())}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-accent-500 text-surface-0 hover:bg-accent-400 active:scale-95 transition-all"
          >
            提交并完成
          </button>
        </div>
      </div>
    </div>
  )
}
