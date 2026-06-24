import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Plus, Calendar, Bell, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAddTask } from '@/hooks/useTasks'

export function TaskInput() {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [reminder, setReminder] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useAddTask()

  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('focus-task-input', handler)
    return () => window.removeEventListener('focus-task-input', handler)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || addTask.isPending) return

    const dueAt = deadline ? new Date(deadline).toISOString() : null
    const remindAt = reminder ? new Date(reminder).toISOString() : null

    await addTask.mutateAsync({ title: trimmed, due_at: dueAt, remind_at: remindAt })
    setTitle('')
    setDeadline('')
    setReminder('')
    setExpanded(false)
    inputRef.current?.focus()
  }

  return (
    <div className="px-3 py-2">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-center gap-2 bg-surface-1 border border-surface-3 rounded-md px-2 py-1.5',
            'transition-all duration-200',
          )}
        >
          {/* Prefix icon */}
          <Zap size={14} className="text-text-tertiary shrink-0 ml-1" />

          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="记录一个新任务..."
            className={cn(
              'flex-1 bg-transparent border-0',
              'text-sm text-text-primary placeholder:text-text-tertiary',
              'outline-none',
            )}
          />

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2',
              'transition-colors duration-150',
              expanded && 'text-accent-400',
            )}
          >
            <Calendar size={15} />
          </button>

          <button
            type="submit"
            disabled={!title.trim() || addTask.isPending}
            className={cn(
              'p-1.5 rounded-md bg-accent-500 text-surface-0',
              'hover:bg-accent-400 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-all duration-150',
            )}
          >
            <Plus size={15} />
          </button>
        </div>

        {expanded && (
          <div className="mt-2 flex gap-2 animate-slide-up">
            <div className="flex-1">
              <label className="text-[10px] text-text-tertiary flex items-center gap-1 mb-1">
                <Calendar size={10} /> 截止日期
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={cn(
                  'w-full bg-surface-2 border border-surface-3 rounded-md px-2 py-1.5',
                  'text-xs text-text-primary',
                  'outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25',
                  'transition-colors duration-150',
                )}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-tertiary flex items-center gap-1 mb-1">
                <Bell size={10} /> 提醒时间
              </label>
              <input
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className={cn(
                  'w-full bg-surface-2 border border-surface-3 rounded-md px-2 py-1.5',
                  'text-xs text-text-primary',
                  'outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25',
                  'transition-colors duration-150',
                )}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
