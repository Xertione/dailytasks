import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Plus, Calendar, Bell, Zap, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAddTask, useSetCountdown } from '@/hooks/useTasks'

const COUNTDOWN_PRESETS = [
  { label: '1min', secs: 60 },
  { label: '5min', secs: 300 },
  { label: '15min', secs: 900 },
  { label: '25min', secs: 1500 },
]

export function TaskInput() {
  const [title, setTitle] = useState(() => {
    try { return localStorage.getItem('task-draft') || '' }
    catch { return '' }
  })
  const [expanded, setExpanded] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [reminder, setReminder] = useState('')
  const [countdownSecs, setCountdownSecs] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useAddTask()
  const setCountdown = useSetCountdown()

  const DATETIME_MIN = '2000-01-01T00:00'
  const DATETIME_MAX = '2099-12-31T23:59'

  const validateDatetime = (value: string): string => {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    if (year < 2000 || year > 2099) return ''
    return value
  }

  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('focus-task-input', handler)
    return () => window.removeEventListener('focus-task-input', handler)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('task-draft', title) }
    catch { /* localStorage unavailable */ }
  }, [title])

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      if (typeof text === 'string') {
        setTitle(text)
        setExpanded(true)
        inputRef.current?.focus()
      }
    }
    window.addEventListener('set-draft-text', handler)
    return () => window.removeEventListener('set-draft-text', handler)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || addTask.isPending) return

    const validDeadline = validateDatetime(deadline)
    const validReminder = validateDatetime(reminder)
    if ((deadline && !validDeadline) || (reminder && !validReminder)) return
    const dueAt = validDeadline ? new Date(validDeadline).toISOString() : null
    const remindAt = validReminder ? new Date(validReminder).toISOString() : null

    const newTask = await addTask.mutateAsync({ title: trimmed, due_at: dueAt, remind_at: remindAt })
    if (countdownSecs > 0 && newTask) {
      await setCountdown.mutateAsync({ id: newTask.id, countdownSecs })
    }
    setTitle('')
    setDeadline('')
    setReminder('')
    setCountdownSecs(0)
    setExpanded(false)
    try { localStorage.removeItem('task-draft') } catch { /* ok */ }
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
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (expanded) {
                  setExpanded(false)
                } else {
                  setTitle('')
                }
              }
            }}
            placeholder="记录一个新任务..."
            tabIndex={0}
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
          <div className="mt-2 animate-slide-up">
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="text-[10px] text-text-tertiary flex items-center gap-1 mb-1">
                  <Calendar size={10} /> 截止日期
                </label>
                <input
                  type="datetime-local"
                  min={DATETIME_MIN}
                  max={DATETIME_MAX}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  onBlur={(e) => setDeadline(validateDatetime(e.target.value))}
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
                  min={DATETIME_MIN}
                  max={DATETIME_MAX}
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  onBlur={(e) => setReminder(validateDatetime(e.target.value))}
                  className={cn(
                    'w-full bg-surface-2 border border-surface-3 rounded-md px-2 py-1.5',
                    'text-xs text-text-primary',
                    'outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25',
                    'transition-colors duration-150',
                  )}
                />
              </div>
            </div>

            {/* Countdown presets */}
            <div>
              <label className="text-[10px] text-text-tertiary flex items-center gap-1 mb-1">
                <Timer size={10} /> 倒计时
              </label>
              <div className="flex gap-1">
                {COUNTDOWN_PRESETS.map((preset) => (
                  <button
                    key={preset.secs}
                    type="button"
                    onClick={() => setCountdownSecs(countdownSecs === preset.secs ? 0 : preset.secs)}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                      countdownSecs === preset.secs
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-surface-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
